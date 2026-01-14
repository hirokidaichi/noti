import { Command } from '@cliffy/command';
import { pageCommand } from './database/page.ts';
import { exportCommand } from './database/export.ts';
import { listCommand } from './database/list.ts';
import { importCommand } from './database/import.ts';
import { createCommand } from './database/create.ts';

export const databaseCommand = new Command()
  .name('database')
  .description('Notionデータベースを操作するコマンド')
  .command('page', pageCommand)
  .command('export', exportCommand)
  .command('list', listCommand)
  .command('import', importCommand)
  .command('create', createCommand);
