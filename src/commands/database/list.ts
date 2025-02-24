import { Command } from '@cliffy/command';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { OutputHandler } from '../../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { TTYController } from '../../lib/tty-controller.ts';
import { FuzzyFinder } from '../../lib/fuzzy-finder.ts';

export const listCommand = new Command()
  .description('データベース一覧を表示')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .option('--limit <number:number>', '取得件数制限', { default: 100 })
  .action(async ({ debug, json, limit }: {
    debug?: boolean;
    json?: boolean;
    limit: number;
  }) => {
    const outputHandler = new OutputHandler({ debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const results = await client.listDatabases({ page_size: limit });
      outputHandler.debug('Raw Database Results:', results);

      if (results.results.length === 0) {
        outputHandler.info('データベースが見つかりませんでした。');
        return;
      }

      if (json) {
        await outputHandler.handleOutput(
          JSON.stringify(results.results, null, 2),
          { json: true },
        );
        return;
      }

      // インタラクティブ表示用のアイテムを整形
      const items = results.results.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        type: 'database',
      }));

      // fuzzy-finderを使用して選択
      const tty = new TTYController();
      const finder = new FuzzyFinder(items, tty);

      try {
        const selectedItem = await finder.find();
        if (selectedItem) {
          console.log(selectedItem.id);
        }
      } finally {
        //tty.cleanupSync();
      }
    }, 'データベース一覧の取得中にエラーが発生しました');
  });
