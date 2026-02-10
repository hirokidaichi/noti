import { Command } from 'commander';
import { pageCommand } from './database/page.js';
import { exportCommand } from './database/export.js';
import { listCommand } from './database/list.js';
import { importCommand } from './database/import.js';
import { createCommand } from './database/create.js';
import { queryCommand } from './database/query.js';
import { schemaCommand } from './database/schema.js';

export const databaseCommand = new Command('database')
  .description('Notionデータベースを操作するコマンド')
  .addCommand(pageCommand)
  .addCommand(exportCommand)
  .addCommand(listCommand)
  .addCommand(importCommand)
  .addCommand(createCommand)
  .addCommand(queryCommand)
  .addCommand(schemaCommand);
