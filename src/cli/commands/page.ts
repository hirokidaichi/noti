import { Command, Client } from "../../deps.ts";
import { ConfigManager } from "../../lib/config/config_manager.ts";

const getCommand = new Command()
  .description("ページの内容を取得")
  .arguments("<page_id:string>")
  .action(async (options, pageId) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // ページのプロパティを取得
      const page = await notion.pages.retrieve({ page_id: pageId });
      
      // ページの内容（ブロック）を取得
      const blocks = await notion.blocks.children.list({ block_id: pageId });
      
      // TODO: Markdownへの変換処理
      console.log("ページ情報:", page);
      console.log("ブロック:", blocks);
      
    } catch (error) {
      console.error("ページの取得に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

const appendCommand = new Command()
  .description("ページに内容を追加")
  .arguments("<page_id:string>")
  .option("-f, --file <file:string>", "追加するMarkdownファイル")
  .action(async (options, pageId) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // TODO: Markdownの読み込みと変換
      // TODO: ブロックの追加処理
      console.log("この機能は未実装です");
      
    } catch (error) {
      console.error("コンテンツの追加に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

export const pageCommand = new Command()
  .description("ページの操作")
  .command("get", getCommand)
  .command("append", appendCommand); 