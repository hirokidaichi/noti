import { Command } from '@cliffy/command';
import { Input } from '@cliffy/prompt';
import { Config } from '../lib/config/config.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';

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

      const token = await Input.prompt({
        message: 'Notion Integration Token を入力してください:',
        default: config.token || '',
      });

      if (token) {
        await Config.update({ apiToken: token });
        outputHandler.success('設定を保存しました');
      } else {
        outputHandler.info('設定をキャンセルしました');
      }
    }, '設定の保存に失敗しました');
  });
