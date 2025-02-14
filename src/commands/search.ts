/// <reference lib="deno.ns" />
import { Command } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: any[]) {
  return results.map((item: any) => {
    let title = "Untitled";
    
    if (item.object === "page") {
      if (item.parent.type === "database_id") {
        for (const [key, value] of Object.entries(item.properties)) {
          if (value.type === "title") {
            title = value.title[0]?.plain_text || "Untitled";
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || "Untitled";
      }
    } else if (item.object === "database") {
      title = item.title[0]?.plain_text || "Untitled Database";
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
  .action(async ({ debug, parent }, query) => {
    const config = await Config.load();
    const client = new NotionClient(config);
    
    try {
      const searchParams: any = {
        query: query || "",
        page_size: 100,
      };

      if (parent) {
        searchParams.filter = {
          property: "parent",
          value: parent,
        };
      }

      const results = await client.search(searchParams);

      if (results.results.length === 0) {
        console.error("検索結果が見つかりませんでした。");
        return;
      }

      if (debug) {
        console.error("=== Debug: First Result ===");
        console.error(JSON.stringify(results.results[0], null, 2));
        console.error("========================");
      }

      // 検索結果をフォーマットしてタブ区切りで表示
      const items = formatNotionResults(results.results);
      items.forEach(item => {
        console.log(`${item.id}\t${item.title}`);
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("検索中にエラーが発生しました:", error.message);
      } else {
        console.error("検索中にエラーが発生しました:", error);
      }
      Deno.exit(1);
    }
  }); 