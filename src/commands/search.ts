import { Command } from 'commander';
import { NotionClient } from '../lib/notion/client.js';
import { Config } from '../lib/config/config.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';

// Notionのプロパティの型定義
interface NotionProperty {
  type: string;
  title?: {
    plain_text: string;
  }[];
}

interface NotionItem {
  id: string;
  object: string;
  parent: {
    type: string;
  };
  properties: Record<string, NotionProperty>;
  title?: { plain_text: string }[];
  url?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  url?: string;
}

interface SearchParams {
  query: string;
  page_size: number;
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: NotionItem[]): SearchResult[] {
  return results.map((item: NotionItem) => {
    let title = 'Untitled';

    if (item.object === 'page') {
      // 新API: data_source_id, 旧API: database_id の両方に対応
      if (
        item.parent.type === 'database_id' ||
        item.parent.type === 'data_source_id'
      ) {
        for (const value of Object.values(item.properties)) {
          if (value.type === 'title') {
            title = value.title?.[0]?.plain_text || 'Untitled';
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      }
    } else if (item.object === 'database' || item.object === 'data_source') {
      title = item.title?.[0]?.plain_text || 'Untitled Database';
    }

    // 改行をエスケープ
    title = title.replace(/\r?\n/g, '\\n');

    // タイトルを50文字で切り詰める
    if (title.length > 50) {
      title = title.slice(0, 50) + '...';
    }

    return {
      id: item.id,
      title,
      type: item.object,
      url: item.url,
    };
  });
}

export const searchCommand = new Command('search')
  .description('Search pages and databases in Notion')
  .argument('[query]', 'Search query')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .option('--limit <number>', '検索結果の最大数', '20')
  .action(
    async (
      query: string | undefined,
      options: {
        debug?: boolean;
        json?: boolean;
        limit: string;
      }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        const searchParams: SearchParams = {
          query: query || '',
          page_size: parseInt(options.limit, 10),
        };

        outputHandler.debug('Search Parameters:', searchParams);

        const results = await client.search(searchParams);
        outputHandler.debug('Raw Search Results:', results);

        if (results.results.length === 0) {
          outputHandler.info('検索結果が見つかりませんでした。');
          return;
        }

        const items = formatNotionResults(results.results as NotionItem[]);

        if (options.json) {
          // JSON形式で出力
          await outputHandler.handleOutput(JSON.stringify(items, null, 2), {
            json: true,
          });
          return;
        }

        // リスト形式で出力
        for (const item of items) {
          const typeIcon = item.type === 'page' ? 'page' : 'database';
          console.log(`${item.id}\t${typeIcon}\t${item.title}`);
        }
      }, '検索中にエラーが発生しました');
    }
  );
