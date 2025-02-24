import { Command } from '@cliffy/command';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { OutputHandler } from '../../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { PageResolver } from '../../lib/command-utils/page-resolver.ts';
import { stringify } from '@std/csv';
import { PageObjectResponse } from '@notionhq/client/types.ts';

export const exportCommand = new Command()
  .description('データベースをエクスポート')
  .arguments('<database_id_or_url:string>')
  .option('-d, --debug', 'デバッグモード')
  .option(
    '-f, --format <format:string>',
    '出力フォーマット (json/csv/markdown)',
    {
      default: 'json',
    },
  )
  .option('-o, --output <path:string>', '出力ファイルパス')
  .action(async (options, databaseIdOrUrl) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();
    const pageResolver = await PageResolver.create();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      // データベースIDの解決
      const databaseId = await pageResolver.resolvePageId(databaseIdOrUrl);
      outputHandler.debug('Database ID:', databaseId);

      // データベースの取得
      const database = await client.getDatabase(databaseId);
      outputHandler.debug('Database:', database);

      // データベースのページを取得
      const pages = await client.queryDatabase({
        database_id: databaseId,
        page_size: 100, // 一度に取得するページ数
      });
      outputHandler.debug('Pages:', pages);

      let output: string | object = '';
      switch (options.format) {
        case 'json': {
          output = {
            database,
            pages: pages.results,
          };
          break;
        }

        case 'csv': {
          // CSVデータの準備
          const rows = [];
          // ヘッダー行の追加
          const properties = Object.keys(database.properties);
          rows.push(properties);

          // データ行の追加
          for (const page of pages.results) {
            const values = properties.map((prop) => {
              const value = (page as PageObjectResponse).properties[prop];
              return formatPropertyValue(value);
            });
            rows.push(values);
          }

          // CSVへの変換
          output = await stringify(rows);
          break;
        }

        case 'markdown': {
          // Markdownテーブルのヘッダー
          const headers = Object.keys(database.properties);
          output = '| ' + headers.join(' | ') + ' |\n';
          output += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

          // 各ページのデータをMarkdownテーブル形式に変換
          for (const page of pages.results) {
            const values = headers.map((prop) => {
              const value = (page as PageObjectResponse).properties[prop];
              return formatPropertyValue(value);
            });
            output += '| ' + values.join(' | ') + ' |\n';
          }
          break;
        }
      }

      // 出力の処理
      await outputHandler.handleOutput(output, {
        output: options.output,
        json: options.format === 'json',
      });
      outputHandler.success('データベースのエクスポートが完了しました');
    }, 'データベースのエクスポートに失敗しました');
  });

// プロパティの値をフォーマットする補助関数
function formatPropertyValue(property: any): string {
  if (!property) return '';

  switch (property.type) {
    case 'title':
    case 'rich_text':
      return property[property.type]?.[0]?.plain_text || '';
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name).join(';') ||
        '';
    case 'date':
      return property.date?.start || '';
    case 'number':
      return property.number?.toString() || '';
    case 'checkbox':
      return property.checkbox ? 'true' : 'false';
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    default:
      return '';
  }
}
