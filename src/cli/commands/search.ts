import { Command, Client } from "../../deps.ts";
import { ConfigManager } from "../../lib/config/config_manager.ts";

export const searchCommand = new Command()
  .description("Notionのコンテンツを検索")
  .arguments("[query:string]")
  .action(async (options, query) => {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    
    if (!config?.apiToken) {
      console.error("APIトークンが設定されていません。`noti configure` を実行してください。");
      Deno.exit(1);
    }

    try {
      const notion = new Client({ auth: config.apiToken });
      
      // TODO: 検索の実装
      console.log("この機能は未実装です");
      
    } catch (error) {
      console.error("検索に失敗しました:", error.message);
      Deno.exit(1);
    }
  }); 