import { Command } from "../deps.ts";
import { configureCommand } from "./commands/configure.ts";
import { searchCommand } from "./commands/search.ts";
import { pageCommand } from "./commands/page.ts";
import { databaseCommand } from "./commands/database.ts";

export const cli = new Command()
  .name("noti")
  .version("0.1.0")
  .description("Notion CLI client built with Deno")
  // グローバルオプション
  .globalOption("-o, --output <file:string>", "出力ファイル")
  .globalOption("-v, --verbose", "詳細なログを出力")
  // サブコマンド
  .command("configure", configureCommand)
  .command("search", searchCommand)
  .command("page", pageCommand)
  .command("database", databaseCommand); 