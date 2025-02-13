import { Command, Input } from "../deps.ts";
import { Config } from "../lib/config/config.ts";
import { NotionClient } from "../lib/notion/client.ts";

export const configureCommand = new Command()
  .name("configure")
  .description("Configure Notion API token")
  .action(async () => {
    try {
      const token = await Input.prompt({
        message: "Notion APIトークンを入力してください",
        hint: "https://www.notion.so/my-integrations から取得できます",
      });

      if (!token) {
        console.error("トークンが入力されていません。");
        Deno.exit(1);
      }

      // 設定を保存
      const config = await Config.update({ apiToken: token });

      // トークンの検証
      const client = new NotionClient(config);
      await client.validateToken();

      console.log("設定を保存しました。");
      await say("設定を保存しました。");
    } catch (error) {
      console.error("設定の保存に失敗しました:", error.message);
      Deno.exit(1);
    }
  });

async function say(message: string) {
  const process = new Deno.Command("say", {
    args: [message],
  });
  await process.output();
} 