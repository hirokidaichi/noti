import { Command } from 'commander';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';

interface DatabaseItem {
  id: string;
  title: string;
  type: string;
  url: string;
}

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

        // 一覧表示用のアイテムを整形
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: DatabaseItem[] = results.results.map((db: any) => ({
          id: db.id,
          title: db.title?.[0]?.plain_text || 'Untitled',
          type: 'database',
          url: db.url,
        }));

        if (options.json) {
          await outputHandler.handleOutput(JSON.stringify(items, null, 2), {
            json: true,
          });
          return;
        }

        // リスト形式で出力（searchコマンドと同様）
        for (const item of items) {
          console.log(`${item.id}\tdatabase\t${item.title}`);
        }
      }, 'データベース一覧の取得中にエラーが発生しました');
    }
  );
