/// <reference lib="deno.ns" />
import { Command } from "@cliffy/command";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import { Logger } from "../lib/logger.ts";

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
}

interface SearchResult {
  id: string;
  title: string;
}

interface SearchParams {
  query: string;
  page_size: number;
  filter?: {
    property: "object";
    value: "page" | "database";
  };
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: NotionItem[]): SearchResult[] {
  return results.map((item: NotionItem) => {
    let title = "Untitled";
    
    if (item.object === "page") {
      if (item.parent.type === "database_id") {
        for (const [_key, value] of Object.entries(item.properties)) {
          if (value.type === "title") {
            title = value.title?.[0]?.plain_text || "Untitled";
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || "Untitled";
      }
    } else if (item.object === "database") {
      title = item.title?.[0]?.plain_text || "Untitled Database";
    }

    // 改行をエスケープ
    title = title.replace(/\r?\n/g, "\\n");

    // タイトルを50文字で切り詰める
    if (title.length > 50) {
      title = title.slice(0, 50) + "...";
    }
    
    return {
      id: item.id,
      title,
    };
  });
}

export const searchCommand = new Command()
  .name("search")
  .description("Search pages and databases in Notion")
  .arguments("[query:string]")
  .option("-d, --debug", "デバッグモード")
  .option("-p, --parent <id:string>", "親ページまたはデータベースのID")
  .action(async ({ debug, parent }: { debug?: boolean; parent?: string }, query?: string) => {
    const config = await Config.load();
    const client = new NotionClient(config);
    const logger = Logger.getInstance();
    logger.setDebugMode(!!debug);
    
    try {
      const searchParams: SearchParams = {
        query: query || "",
        page_size: 100,
        ...(parent ? {
          filter: {
            property: "object" as const,
            value: "page" as const,
          },
        } : {}),
      };

      const results = await client.search(searchParams);

      if (results.results.length === 0) {
        logger.info("検索結果が見つかりませんでした。");
        return;
      }

      if (debug) {
        logger.debug("First Result", results.results[0]);
      }

      // 検索結果をフォーマットしてタブ区切りで表示
      const items = formatNotionResults(results.results as NotionItem[]);
      items.forEach(item => {
        console.log(`${item.id}\t${item.title}`);
      });
    } catch (error) {
      logger.error("検索中にエラーが発生しました", error);
      Deno.exit(1);
    }
  }); 