#!/usr/bin/env node

import { Command } from 'commander';
import { searchCommand } from './commands/search.js';
import { configureCommand } from './commands/configure.js';
import { pageCommand } from './commands/page.js';
import { aliasCommand } from './commands/alias.js';
import { userCommand } from './commands/user.js';
import { databaseCommand } from './commands/database.js';
import { openCommand } from './commands/open.js';
import { blockCommand } from './commands/block.js';
import { setupSkillsCommand } from './commands/setup-skills.js';
import { Config } from './lib/config/config.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

program
  .name('noti')
  .description('Notion CLI Client — ページ・データベース・ブロックを操作')
  .version(version)
  .addHelpText(
    'after',
    `
コマンド選択ガイド:
  ページのコンテンツ（本文）を操作したい → page (get/create/update/append/remove)
  データベースの一覧・検索・エクスポート  → database (list/query/export/schema)
  データベース行（プロパティ）を操作したい → database page (add/get/update/remove)
  ワークスペース全体を横断検索したい     → search
  ブロック単位で操作したい              → block (get/list/delete)

注意:
  "page update" はページの本文（Markdownコンテンツ）を置換します
  "database page update" はデータベース行のプロパティ値を更新します
  IDの代わりにNotionのURLやエイリアスも使用できます`
  )
  .addCommand(configureCommand)
  .addCommand(aliasCommand)
  .addCommand(pageCommand)
  .addCommand(blockCommand)
  .addCommand(searchCommand)
  .addCommand(userCommand)
  .addCommand(databaseCommand)
  .addCommand(openCommand)
  .addCommand(setupSkillsCommand);

/**
 * 設定状態を確認し、適切な処理を行う
 */
async function handleNoArguments(): Promise<void> {
  try {
    const config = await Config.load();

    if (config.token) {
      // 設定済みの場合はヘルプを表示
      program.help();
    } else {
      // 未設定の場合はconfigureコマンドを実行
      console.log(
        'Notion APIトークンが設定されていません。設定を開始します...'
      );
      await program.parseAsync(['node', 'noti', 'configure']);
    }
  } catch (error) {
    console.error('設定の読み込み中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  if (process.argv.length <= 2) {
    await handleNoArguments();
  } else {
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
