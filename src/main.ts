#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { Command } from "@cliffy/command";
import { searchCommand } from "./commands/search.ts";
import { searchFuzzyCommand } from "./commands/search-fuzzy.ts";
import { configureCommand } from "./commands/configure.ts";
import { pageCommand } from "./commands/page.ts";
import { termboxTestCommand } from "./commands/termbox-test.ts";
import { aliasCommand } from "./commands/alias.ts";

await new Command()
  .name("noti")
  .description("Notion CLI")
  .version("0.1.0")
  .command("search", searchCommand)
  .command("search-fuzzy", searchFuzzyCommand)
  .command("configure", configureCommand)
  .command("page", pageCommand)
  .command("termbox-test", termboxTestCommand)
  .command("alias", aliasCommand)
  .parse(Deno.args); 