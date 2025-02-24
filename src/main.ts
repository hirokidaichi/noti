#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { Command } from '@cliffy/command';
import { searchCommand } from './commands/search.ts';
import { configureCommand } from './commands/configure.ts';
import { pageCommand } from './commands/page.ts';
import { aliasCommand } from './commands/alias.ts';
import { userCommand } from './commands/user.ts';
import { databaseCommand } from './commands/database.ts';
import { openCommand } from './commands/open.ts';

const command = new Command()
  .name('noti')
  .description('Notion CLI Client')
  .version('0.1.0')
  .command('configure', configureCommand)
  .command('alias', aliasCommand)
  .command('page', pageCommand)
  .command('search', searchCommand)
  .command('user', userCommand)
  .command('database', databaseCommand)
  .command('open', openCommand);

if (Deno.args.length === 0) {
  command.showHelp();
  Deno.exit(0);
}

await command.parse(Deno.args);
