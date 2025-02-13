import { Command } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import { BlockToMarkdown } from "../lib/converter/block-to-markdown.ts";
import type { NotionBlocks } from "../lib/converter/types.ts";

// NotionのURLまたはIDからページIDを抽出する関数
function extractPageId(input: string): string {
  // URLの場合
  if (input.includes("notion.so")) {
    // URLからページIDを抽出するための正規表現
    // 以下のようなパターンに対応:
    // - https://www.notion.so/ページタイトル-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // - https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // - @https://www.notion.so/ページタイトル-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const match = input.match(/[a-f0-9]{32}$/i);
    if (!match) {
      throw new Error("無効なNotion URLです。ページIDが見つかりません。");
    }
    return match[0];
  }

  // 既にIDの形式の場合
  if (/^[a-f0-9]{32}$/i.test(input)) {
    return input;
  }

  throw new Error("無効なページIDまたはURLです。");
}

export const pageCommand = new Command()
  .name("page")
  .description("ページ操作コマンド")
  .command("get", new Command()
    .description("ページの情報を取得")
    .arguments("<page_id_or_url:string>")
    .option("-d, --debug", "デバッグモード")
    .option("-f, --format <format:string>", "出力フォーマット (json/markdown)", {
      default: "json",
    })
    .option("-o, --output <file:string>", "出力ファイルパス")
    .action(async (options, pageIdOrUrl) => {
      const config = await Config.load();
      const client = new NotionClient(config);
      
      try {
        // URLまたはIDからページIDを抽出
        const pageId = extractPageId(pageIdOrUrl);
        
        if (options.debug) {
          console.error("=== Debug: Extracted Page ID ===");
          console.error(pageId);
          console.error("========================");
        }

        // ページ情報の取得
        const page = await client.getPage(pageId);
        
        // ブロックの取得
        const blocks = await client.getBlocks(pageId);
        
        if (options.debug) {
          console.error("=== Debug: Raw Response ===");
          console.error(JSON.stringify(page, null, 2));
          console.error("=== Debug: Blocks ===");
          console.error(JSON.stringify(blocks, null, 2));
          console.error("========================");
        }

        // 出力フォーマットに応じて処理
        let output = "";
        if (options.format === "markdown") {
          const converter = new BlockToMarkdown();
          // まずプロパティを変換
          const propertiesMarkdown = converter.convertProperties(page.properties);
          // 次にブロックを変換
          const blocksMarkdown = converter.convert(blocks.results as NotionBlocks[]);
          // 両方を結合
          output = propertiesMarkdown + blocksMarkdown;
        } else {
          // JSON形式で出力（ページ情報とブロック情報を含む）
          output = JSON.stringify({
            page,
            blocks: blocks.results,
          }, null, 2);
        }

        // 出力先の処理
        if (options.output) {
          await Deno.writeTextFile(options.output, output);
          console.error(`出力を ${options.output} に保存しました。`);
          await say(`出力を ${options.output} に保存しました。`);
        } else {
          console.log(output);
        }

      } catch (error) {
        console.error("ページの取得に失敗しました:", error.message);
        Deno.exit(1);
      }
    })
  ); 