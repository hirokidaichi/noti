import { Command } from '@cliffy/command';
import { Secret } from '@cliffy/prompt/secret';
import { Config } from '../lib/config/config.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';

function maskToken(token: string | undefined): string {
  if (!token) return '';
  return `${token.slice(0, 5)}${'*'.repeat(Math.max(0, token.length - 10))}${
    token.slice(-5)
  }`;
}

export const configureCommand = new Command()
  .name('configure')
  .description('Notionの設定を行います')
  .option('-d, --debug', 'デバッグモード')
  .action(async (options) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      outputHandler.debug('Current Config:', config);

      if (config.token) {
        outputHandler.info(`現在のトークン: ${maskToken(config.token)}`);
      }

      const token = await Secret.prompt({
        message: 'Notion Integration Token を入力してください:',
        hidden: true,
      });

      if (token) {
        await Config.update({ apiToken: token });
        outputHandler.success('設定を保存しました');
      } else {
        outputHandler.info('設定をキャンセルしました');
      }
    }, '設定の保存に失敗しました');
  });
