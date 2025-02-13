import { Command, Client } from "../../deps.ts";
import { ConfigManager } from "../../lib/config/config_manager.ts";

export const configureCommand = new Command()
  .description("Notionの設定を管理")
  .action(async (options) => {
    const configManager = new ConfigManager();
    console.log("Notion APIトークンの設定が必要です");
    console.log("トークンは https://www.notion.so/my-integrations から取得できます");
    
    const apiToken = prompt("Notion API Token:") || "";
    if (!apiToken) {
      console.error("APIトークンが入力されていません");
      Deno.exit(1);
    }

    try {
      // 設定を保存
      await configManager.save({ apiToken });
      console.log("設定を保存しました");

      // 接続テスト
      const notion = new Client({ auth: apiToken });
      const user = await notion.users.me();
      console.log("Notionへの接続が確認できました");
      console.log("ユーザー情報:", user);
    } catch (error) {
      console.error("設定に失敗しました:", error.message);
      // エラーの場合は設定を削除
      await configManager.save({} as any);
      console.log("設定をリセットしました。再度実行して設定してください。");
      Deno.exit(1);
    }
  }); 