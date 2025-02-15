#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { Command } from '@cliffy/command';
import { searchCommand } from './commands/search.ts';
import { configureCommand } from './commands/configure.ts';
import { pageCommand } from './commands/page.ts';
import { aliasCommand } from './commands/alias.ts';
import { userCommand } from './commands/user.ts';
import { databaseCommand } from './commands/database.ts';
import { openCommand } from './commands/open.ts';

await new Command()
  .name('noti')
  .description('Notion CLI')
  .version('0.1.0')
  .command('search', searchCommand)
  .command('configure', configureCommand)
  .command('page', pageCommand)
  .command('alias', aliasCommand)
  .command('user', userCommand)
  .command('database', databaseCommand)
  .command('open', openCommand)
  .parse(Deno.args);
