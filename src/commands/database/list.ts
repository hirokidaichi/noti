import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';

export const listCommand = new Command('list')
  .description('データベース一覧を表示')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .option('--limit <number>', '取得件数制限', '100')
  .action(
    async (options: { debug?: boolean; json?: boolean; limit: string }) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        const results = await client.listDatabases({
          page_size: parseInt(options.limit, 10),
        });
        outputHandler.debug('Raw Database Results:', results);

        if (results.results.length === 0) {
          outputHandler.info('データベースが見つかりませんでした。');
          return;
        }

        if (options.json) {
          await outputHandler.handleOutput(
            JSON.stringify(results.results, null, 2),
            { json: true }
          );
          return;
        }

        // インタラクティブ表示用のアイテムを整形
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = results.results.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || 'Untitled',
          url: db.url,
          created_time: db.created_time,
          last_edited_time: db.last_edited_time,
          type: 'database',
        }));

        // インタラクティブ選択
        const choices = items.map((item) => ({
          name: `🗃️ ${item.title}`,
          value: item.id,
        }));

        const selectedId = await select({
          message: 'データベースを選択してください:',
          choices,
        });

        console.log(selectedId);
      }, 'データベース一覧の取得中にエラーが発生しました');
    }
  );
