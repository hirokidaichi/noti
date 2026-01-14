import { Command } from 'commander';
import { addCommand } from './page-add.js';
import { getCommand } from './page-get.js';
import { removeCommand } from './page-remove.js';

export const pageCommand = new Command('page')
  .description('データベースページ操作')
  .addCommand(addCommand)
  .addCommand(getCommand)
  .addCommand(removeCommand);
