import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';

export const userCommand = new Command()
  .name('user')
  .description('ユーザー情報を取得')
  .option('-d, --debug', 'デバッグモード')
  .option('-j, --json', 'JSON形式で出力')
  .action(async (options) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const user = await client.getMe();
      outputHandler.debug('User Info:', user);

      if (options.json) {
        await outputHandler.handleOutput(JSON.stringify(user, null, 2), {
          json: true,
        });
        return;
      }

      const output = [
        `ID: ${user.id}`,
        `名前: ${user.name}`,
        `タイプ: ${user.type}`,
        'email' in user ? `メール: ${user.email}` : null,
        user.avatar_url ? `アバター: ${user.avatar_url}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await outputHandler.handleOutput(output);
    }, 'ユーザー情報の取得に失敗しました');
  });
