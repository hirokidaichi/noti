import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { TTYController } from '../lib/tty-controller.ts';
import { FuzzyFinder } from '../lib/fuzzy-finder.ts';
import { Logger } from '../lib/logger.ts';

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
  url?: string;
  parent?: {
    type: string;
  };
  properties?: Record<string, NotionProperty>;
  title?: { plain_text: string }[];
}

interface SearchParams {
  query: string;
  page_size: number;
  filter?: {
    property: 'object';
    value: 'page' | 'database';
  };
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  url?: string;
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: NotionItem[]): SearchResult[] {
  return results.map((item) => {
    let title = 'Untitled';

    if (item.object === 'page') {
      if (item.parent?.type === 'database_id') {
        for (const [_key, value] of Object.entries(item.properties ?? {})) {
          const typedValue = value as NotionProperty;
          if (typedValue.type === 'title') {
            title = typedValue.title?.[0]?.plain_text || 'Untitled';
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      }
    } else if (item.object === 'database') {
      title = item.title?.[0]?.plain_text || 'Untitled Database';
    }

    title = title.replace(/\r?\n/g, '\\n');

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

// 標準入力から行を読み込む関数
async function _readStdinLines(): Promise<string[]> {
  const lines: string[] = [];
  const buffer = new Uint8Array(1024);

  // 標準入力がパイプされているかチェック
  if (!Deno.stdin.isTerminal) {
    while (true) {
      const n = await Deno.stdin.read(buffer);
      if (n === null) break;

      const chunk = new TextDecoder().decode(buffer.subarray(0, n));
      const chunkLines = chunk.split('\n');

      // 最後の行が不完全な場合に備えて処理
      if (lines.length > 0 && !chunk.includes('\n')) {
        lines[lines.length - 1] += chunkLines[0];
      } else {
        lines.push(...chunkLines);
      }
    }
  }

  // 空行を除去して返す
  return lines.filter((line) => line.trim().length > 0);
}

// 簡易的なファジー検索の実装
function _fuzzySearch(items: SearchResult[], query: string): SearchResult[] {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(lowerQuery));
}

export const searchFuzzyCommand = new Command()
  .name('search-fuzzy')
  .description('Search pages and databases in Notion with fuzzy finder')
  .arguments('[query:string]')
  .option('-d, --debug', 'デバッグモード')
  .option('-p, --parent <id:string>', '親ページまたはデータベースのID')
  .action(
    async (
      options: { debug?: boolean; parent?: string },
      query: string = '',
    ) => {
      const config = await Config.load();
      const client = new NotionClient(config);
      const tty = new TTYController();
      const logger = Logger.getInstance();
      logger.setDebugMode(!!options.debug);

      try {
        const searchParams: SearchParams = {
          query: query || '',
          page_size: 100,
          ...(options.parent
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

        if (options.debug) {
          logger.debug('First Result', results.results[0]);
        }

        const items = formatNotionResults(results.results as NotionItem[]);
        const finder = new FuzzyFinder(items, tty);
        const selectedItem = await finder.find(query || '');

        if (selectedItem) {
          console.clear();
          console.log(selectedItem);
        }
      } catch (error) {
        logger.error('エラーが発生しました', error);
        Deno.exit(1);
      } finally {
        tty.cleanupSync();
      }
    },
  );
