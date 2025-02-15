import { Command } from "jsr:@cliffy/command@^1.0.0-rc.7";
import { Input } from "jsr:@cliffy/prompt@^1.0.0-rc.7";
import { Config } from "../lib/config/config.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Logger } from "../lib/logger.ts";

export const configureCommand = new Command()
  .name("configure")
  .description("Configure Notion API token")
  .action(async () => {
    const logger = Logger.getInstance();
    try {
      const token = await Input.prompt({
        message: "Notion APIトークンを入力してください",
        hint: "https://www.notion.so/my-integrations から取得できます",
      });

      if (!token) {
        logger.error("トークンが入力されていません。");
        Deno.exit(1);
      }

      // 設定を保存
      const config = await Config.update({ apiToken: token });

      // トークンの検証
      const client = new NotionClient(config);
      await client.validateToken();

      logger.success("設定を保存しました。");
    } catch (error) {
      logger.error("設定の保存に失敗しました", error);
      Deno.exit(1);
    }
  }); 