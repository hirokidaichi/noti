import { Command } from '@cliffy/command';
import { addCommand } from './page-add.ts';
import { getCommand } from './page-get.ts';
import { removeCommand } from './page-remove.ts';

export const databasePageCommand = new Command()
  .description('データベースページ操作')
  .command('add', addCommand)
  .command('get', getCommand)
  .command('remove', removeCommand);
