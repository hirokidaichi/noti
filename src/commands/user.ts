import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';

type NotionUser = {
  id: string;
  name: string;
  type: string;
  email?: string;
  avatar_url?: string | null;
};

interface CommandOptions {
  debug?: boolean;
  format: string;
}

export const userCommand = new Command()
  .name('user')
  .description('ユーザー情報を取得')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --format <format:string>', '出力フォーマット (json|markdown)', {
    default: 'markdown',
  })
  .action(async (options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const user = await client.getMe() as NotionUser;
      outputHandler.debug('User Info:', user);

      if (options.format === 'json') {
        await outputHandler.handleOutput(user, { json: true });
        return;
      }

      // Markdown形式の出力を生成
      const output = [
        '# ユーザー情報',
        '',
        `- **ID**: \`${user.id}\``,
        `- **名前**: ${user.name}`,
        `- **タイプ**: ${user.type}`,
        'email' in user ? `- **メール**: ${user.email}` : null,
        user.avatar_url ? `- **アバター**: ${user.avatar_url}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await outputHandler.handleOutput(output);
    }, 'ユーザー情報の取得に失敗しました');
  });
