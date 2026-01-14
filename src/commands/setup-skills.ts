import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { mkdir, cp, access, constants } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// パッケージのルートディレクトリを取得
function getPackageRoot(): string {
  // dist/commands/setup-skills.js から見て ../../ がパッケージルート
  return join(__dirname, '..', '..');
}

// スキルディレクトリのソースパスを取得
function getSkillsSourcePath(): string {
  return join(getPackageRoot(), 'skills', 'noti');
}

// ターゲットディレクトリを取得
function getTargetPath(location: 'user' | 'project'): string {
  if (location === 'user') {
    return join(homedir(), '.claude', 'skills', 'noti');
  }
  return join(process.cwd(), '.claude', 'skills', 'noti');
}

// ディレクトリが存在するかチェック
async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export const setupSkillsCommand = new Command('setup-skills')
  .description('notiのAgent Skillをインストールします')
  .option('-d, --debug', 'デバッグモード')
  .option('--user', 'ユーザーディレクトリ (~/.claude/skills/) にインストール')
  .option(
    '--project',
    'プロジェクトディレクトリ (./.claude/skills/) にインストール'
  )
  .action(
    async (options: { debug?: boolean; user?: boolean; project?: boolean }) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();

      await errorHandler.withErrorHandling(async () => {
        // インストール先を決定
        let location: 'user' | 'project';

        if (options.user && options.project) {
          outputHandler.error('--user と --project は同時に指定できません');
          return;
        }

        if (options.user) {
          location = 'user';
        } else if (options.project) {
          location = 'project';
        } else {
          // プロンプトで選択
          location = await select({
            message: 'インストール先を選択してください:',
            choices: [
              {
                name: 'ユーザーディレクトリ (~/.claude/skills/)',
                value: 'user' as const,
              },
              {
                name: 'プロジェクトディレクトリ (./.claude/skills/)',
                value: 'project' as const,
              },
            ],
          });
        }

        const sourcePath = getSkillsSourcePath();
        const targetPath = getTargetPath(location);

        outputHandler.debug('Source path:', sourcePath);
        outputHandler.debug('Target path:', targetPath);

        // ソースディレクトリの存在確認
        if (!(await exists(sourcePath))) {
          outputHandler.error(`スキルファイルが見つかりません: ${sourcePath}`);
          return;
        }

        // ターゲットの親ディレクトリを作成
        const targetParent = dirname(targetPath);
        await mkdir(targetParent, { recursive: true });

        // 既存のディレクトリがある場合は上書き確認
        if (await exists(targetPath)) {
          outputHandler.info(`既存のスキルを上書きします: ${targetPath}`);
        }

        // スキルファイルをコピー
        await cp(sourcePath, targetPath, { recursive: true });

        outputHandler.success(`スキルをインストールしました: ${targetPath}`);
        outputHandler.info('');
        outputHandler.info('インストールされたファイル:');
        outputHandler.info('  - SKILL.md (メインドキュメント)');
        outputHandler.info('  - QUICKREF.md (クイックリファレンス)');
        outputHandler.info('  - examples/ (ワークフロー例)');
      }, 'スキルのインストールに失敗しました');
    }
  );
