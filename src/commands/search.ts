/// <reference lib="deno.ns" />
import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { Logger } from '../lib/logger.ts';
import { TTYController } from '../lib/tty-controller.ts';
import { FuzzyFinder } from '../lib/fuzzy-finder.ts';

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
  filter?: {
    property: 'object';
    value: 'page' | 'database';
  };
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: NotionItem[]): SearchResult[] {
  return results.map((item: NotionItem) => {
    let title = 'Untitled';

    if (item.object === 'page') {
      if (item.parent.type === 'database_id') {
        for (const [_key, value] of Object.entries(item.properties)) {
          if (value.type === 'title') {
            title = value.title?.[0]?.plain_text || 'Untitled';
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      }
    } else if (item.object === 'database') {
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

export const searchCommand = new Command()
  .name('search')
  .description('Search pages and databases in Notion')
  .arguments('[query:string]')
  .option('-d, --debug', 'デバッグモード')
  .option('-p, --parent <id:string>', '親ページまたはデータベースのID')
  .option('--json', 'JSON形式で出力')
  .option('--limit <number:number>', '検索結果の最大数', { default: 100 })
  .action(async ({ debug, parent, json, limit }: {
    debug?: boolean;
    parent?: string;
    json?: boolean;
    limit: number;
  }, query?: string) => {
    const config = await Config.load();
    const client = new NotionClient(config);
    const logger = Logger.getInstance();
    logger.setDebugMode(!!debug);

    try {
      const searchParams: SearchParams = {
        query: query || '',
        page_size: limit,
        ...(parent
          ? {
            filter: {
              property: 'object' as const,
              value: 'page' as const,
            },
          }
          : {}),
      };

      const results = await client.search(searchParams);

      if (results.results.length === 0) {
        logger.info('検索結果が見つかりませんでした。');
        return;
      }

      if (json) {
        // JSON形式で出力
        console.log(JSON.stringify(results.results, null, 2));
        return;
      }

      // fuzzy-finderを使用して選択
      const items = formatNotionResults(results.results as NotionItem[]);
      const tty = new TTYController();
      const finder = new FuzzyFinder(items, tty);

      try {
        const selectedItem = await finder.find();
        if (selectedItem) {
          //onsole.clear();
          console.log(selectedItem.id);
        }
      } finally {
        //tty.cleanupSync();
      }
    } catch (error) {
      logger.error('検索中にエラーが発生しました', error);
      Deno.exit(1);
    }
  });
