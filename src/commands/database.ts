// deno-lint-ignore-file no-explicit-any
import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { Logger } from '../lib/logger.ts';
import { FuzzyFinder, SearchItem } from '../lib/fuzzy-finder.ts';
import { TTYController } from '../lib/tty-controller.ts';

interface ListOptions {
  limit: number;
  output?: string;
  json?: boolean;
  debug?: boolean;
}

export const databaseCommand = new Command()
  .name('database')
  .description('データベース関連のコマンド')
  .command(
    'list',
    new Command()
      .description('データベースの一覧を表示')
      .option('-n, --limit <number:number>', '取得する件数', { default: 50 })
      .option('-o, --output <path:string>', '出力ファイルパス')
      .option('-j, --json', 'JSON形式で出力')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options: ListOptions) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          logger.debug('Fetching databases with options:', options);

          const response = await client.listDatabases({
            page_size: options.limit,
          });

          logger.debug('Raw Response:', response);

          const databases = response.results.map((db: any) => {
            const title = db.title?.[0]?.plain_text ||
              db.properties?.title?.title?.[0]?.plain_text ||
              'Untitled';
            return {
              id: db.id,
              title,
              created_time: db.created_time,
              last_edited_time: db.last_edited_time,
              url: db.url,
            };
          });

          if (options.json) {
            // JSON形式での出力
            const output = JSON.stringify(databases, null, 2);
            if (options.output) {
              await Deno.writeTextFile(options.output, output);
              logger.success(
                `データベース一覧を${options.output}に保存しました`,
              );
            } else {
              console.log(output);
            }
            return;
          }

          // デフォルトでファジー検索モード
          const searchItems: SearchItem[] = databases.map((db) => ({
            id: db.id,
            title: db.title,
            type: 'database',
            url: db.url,
          }));

          const tty = new TTYController();
          const finder = new FuzzyFinder(searchItems, tty);
          const selected = await finder.find();

          if (selected) {
            const selectedDb = databases.find((db) => db.id === selected.id);
            if (selectedDb) {
              console.log(`\n選択されたデータベース:`);
              console.log(`- ${selectedDb.title}`);
              console.log(`  ID: ${selectedDb.id}`);
              console.log(`  URL: ${selectedDb.url}`);
              console.log(
                `  最終更新: ${
                  new Date(selectedDb.last_edited_time).toLocaleString()
                }\n`,
              );

              if (options.output) {
                const output = [
                  `# ${selectedDb.title}`,
                  `- ID: ${selectedDb.id}`,
                  `- URL: ${selectedDb.url}`,
                  `- 最終更新: ${
                    new Date(selectedDb.last_edited_time).toLocaleString()
                  }`,
                  '',
                ].join('\n');
                await Deno.writeTextFile(options.output, output);
                logger.success(
                  `選択されたデータベースを${options.output}に保存しました`,
                );
              }
            }
          }
        } catch (error) {
          logger.error('データベース一覧の取得に失敗しました:', error);
          Deno.exit(1);
        }
      }),
  );
