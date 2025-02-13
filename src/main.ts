#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { Command } from "./deps.ts";
import { searchCommand } from "./commands/search.ts";
import { configureCommand } from "./commands/configure.ts";
import { pageCommand } from "./commands/page.ts";

await new Command()
  .name("noti")
  .version("0.1.0")
  .description("Notion CLI client")
  .command("search", searchCommand)
  .command("configure", configureCommand)
  .command("page", pageCommand)
  .parse(Deno.args); 