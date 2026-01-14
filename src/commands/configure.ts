import { Command } from 'commander';
import { Config } from '../lib/config/config.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';

function maskToken(token: string | undefined): string {
  if (!token) return '';
  return `${token.slice(0, 5)}${'*'.repeat(Math.max(0, token.length - 10))}${token.slice(-5)}`;
}

export const configureCommand = new Command('configure')
  .description('Notionの設定を行います')
  .option('-d, --debug', 'デバッグモード')
  .option('-t, --token <token>', 'Notion Integration Token')
  .option('--show', '現在の設定を表示')
  .action(
    async (options: { debug?: boolean; token?: string; show?: boolean }) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        outputHandler.debug('Current Config:', config);

        // 現在の設定を表示
        if (options.show) {
          if (config.token) {
            outputHandler.info(`現在のトークン: ${maskToken(config.token)}`);
          } else {
            outputHandler.info('トークンは設定されていません');
          }
          return;
        }

        // トークンの設定
        if (options.token) {
          await Config.update({ apiToken: options.token });
          outputHandler.success('設定を保存しました');
        } else {
          outputHandler.error(
            'トークンを指定してください: noti configure --token <token>'
          );
          outputHandler.info(
            'トークンは https://www.notion.so/my-integrations から取得できます'
          );
        }
      }, '設定の保存に失敗しました');
    }
  );
