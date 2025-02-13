import { Command, Client } from "../../deps.ts";
import { ConfigManager } from "../../lib/config/config_manager.ts";

const createCommand = new Command()
  .description("新しいデータベースを作成")
  .arguments("<parent_page_id:string>")
  .option("--title <title:string>", "データベースのタイトル")
  .option("--schema <schema:string>", "スキーマ定義ファイル")
  .action(async (options, parentPageId) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // TODO: スキーマの読み込みと検証
      // TODO: データベースの作成処理
      console.log("この機能は未実装です");
      
    } catch (error) {
      console.error("データベースの作成に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

const addCommand = new Command()
  .description("データベースにエントリーを追加")
  .arguments("<database_id:string>")
  .option("--prop <prop:string[]>", "プロパティ値（Name: value形式）")
  .action(async (options, databaseId) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // TODO: プロパティの解析と検証
      // TODO: エントリーの追加処理
      console.log("この機能は未実装です");
      
    } catch (error) {
      console.error("エントリーの追加に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

const removeCommand = new Command()
  .description("データベースからエントリーを削除")
  .arguments("<page_id:string>")
  .option("-y, --yes", "確認をスキップ")
  .action(async (options, pageId) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    if (!options.yes) {
      const confirm = prompt("このエントリーを削除しますか？(y/N):");
      if (confirm?.toLowerCase() !== "y") {
        console.log("キャンセルしました");
        Deno.exit(0);
      }
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // エントリーをアーカイブ
      await notion.pages.update({
        page_id: pageId,
        archived: true,
      });
      
      console.log("エントリーを削除しました");
      
    } catch (error) {
      console.error("エントリーの削除に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

const searchCommand = new Command()
  .description("データベース内を検索")
  .arguments("<database_id:string> [query:string]")
  .action(async (options, databaseId, query) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      const searchParams: any = {};
      if (query) {
        // タイトルでフィルタリング
        searchParams.filter = {
          property: "title",
          text: {
            contains: query,
          },
        };
      }
      
      const response = await notion.databases.query({
        database_id: databaseId,
        ...searchParams,
      });
      
      // TODO: fzfライクなインターフェースの実装
      console.log("検索結果:", response.results);
      
    } catch (error) {
      console.error("検索に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

export const databaseCommand = new Command()
  .description("データベースの操作")
  .command("create", createCommand)
  .command("add", addCommand)
  .command("remove", removeCommand)
  .command("search", searchCommand); 