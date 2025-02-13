import { Command } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import { BlockToMarkdown } from "../lib/converter/block-to-markdown.ts";
import { MarkdownToBlocks } from "../lib/converter/markdown-to-blocks.ts";
import type { NotionBlocks } from "../lib/converter/types.ts";
import { basename } from "../deps.ts";
import { Input } from "../deps.ts";

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
        } else {
          console.log(output);
        }

      } catch (error) {
        console.error("ページの取得に失敗しました:", error.message);
        Deno.exit(1);
      }
    })
  )
  .command("append", new Command()
    .description("ページにコンテンツを追加")
    .arguments("<page_id_or_url:string> <input_file:string>")
    .option("-d, --debug", "デバッグモード")
    .action(async (options, pageIdOrUrl, inputFile) => {
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

        // 入力ファイルの読み込み
        const markdown = await Deno.readTextFile(inputFile);
        
        // MarkdownをNotionブロックに変換
        const converter = new MarkdownToBlocks();
        const { blocks } = converter.convert(markdown);
        
        if (options.debug) {
          console.error("=== Debug: Converted Blocks ===");
          console.error(JSON.stringify(blocks, null, 2));
          console.error("========================");
        }

        // ブロックの追加
        const result = await client.appendBlocks(pageId, blocks);
        
        if (options.debug) {
          console.error("=== Debug: API Response ===");
          console.error(JSON.stringify(result, null, 2));
          console.error("========================");
        }

        console.error("コンテンツを追加しました。");

      } catch (error) {
        console.error("コンテンツの追加に失敗しました:", error.message);
        Deno.exit(1);
      }
    })
  )
  .command("create", new Command()
    .description("新規ページを作成")
    .arguments("<parent_id_or_url:string> <input_file:string>")
    .option("-t, --title <title:string>", "ページのタイトル")
    .option("-d, --debug", "デバッグモード")
    .action(async (options, parentIdOrUrl, inputFile) => {
      const config = await Config.load();
      const client = new NotionClient(config);
      
      try {
        // 親ページIDの抽出
        const parentId = extractPageId(parentIdOrUrl);
        
        if (options.debug) {
          console.error("=== Debug: Parent Page ID ===");
          console.error(parentId);
          console.error("========================");
        }

        // 入力ファイルの読み込み
        const markdown = await Deno.readTextFile(inputFile);
        
        // MarkdownをNotionブロックに変換
        const converter = new MarkdownToBlocks();
        const { blocks } = converter.convert(markdown);

        // タイトルの決定
        let title = options.title;
        if (!title) {
          // 最初のheading_1ブロックからタイトルを抽出
          const firstHeading = blocks.find(block => 
            block.type === "heading_1" && 
            block.heading_1?.rich_text?.[0]?.text?.content
          );
          if (firstHeading) {
            title = firstHeading.heading_1.rich_text[0].text.content;
            // タイトルとして使用したheading_1は削除
            blocks.splice(blocks.indexOf(firstHeading), 1);
          } else {
            // heading_1がない場合は、ファイル名から拡張子を除いたものをタイトルとして使用
            const fileName = basename(inputFile);
            title = fileName.replace(/\.[^/.]+$/, ""); // 拡張子を削除
          }
        }
        
        if (options.debug) {
          console.error("=== Debug: Title ===");
          console.error(title);
          console.error("=== Debug: Blocks ===");
          console.error(JSON.stringify(blocks, null, 2));
          console.error("========================");
        }

        // ページの作成
        const result = await client.createPage({
          parentId,
          title,
          blocks,
        });
        
        if (options.debug) {
          console.error("=== Debug: API Response ===");
          console.error(JSON.stringify(result, null, 2));
          console.error("========================");
        }

        console.error("ページを作成しました:", result.url);

      } catch (error) {
        console.error("ページの作成に失敗しました:", error.message);
        Deno.exit(1);
      }
    })
  )
  .command("remove", new Command()
    .description("ページを削除（アーカイブ）")
    .arguments("<page_id_or_url:string>")
    .option("-d, --debug", "デバッグモード")
    .option("-f, --force", "確認なしで削除")
    .action(async (options, pageIdOrUrl) => {
      const config = await Config.load();
      const client = new NotionClient(config);
      
      try {
        // ページIDの抽出
        const pageId = extractPageId(pageIdOrUrl);
        
        if (options.debug) {
          console.error("=== Debug: Page ID ===");
          console.error(pageId);
          console.error("========================");
        }

        // ページ情報の取得（タイトルを表示するため）
        const page = await client.getPage(pageId);
        const title = page.properties?.title?.title?.[0]?.plain_text || "Untitled";

        // 確認プロンプト（--forceオプションがない場合）
        if (!options.force) {
          const answer = await Input.prompt({
            message: `ページ「${title}」を削除しますか？`,
            type: "confirm",
            default: false,
          });
          if (!answer) {
            console.error("削除をキャンセルしました。");
            Deno.exit(0);
          }
        }

        // ページの削除
        const result = await client.removePage(pageId);
        
        if (options.debug) {
          console.error("=== Debug: API Response ===");
          console.error(JSON.stringify(result, null, 2));
          console.error("========================");
        }

        console.error(`ページ「${title}」を削除しました。`);

      } catch (error) {
        console.error("ページの削除に失敗しました:", error.message);
        Deno.exit(1);
      }
    })
  ); 