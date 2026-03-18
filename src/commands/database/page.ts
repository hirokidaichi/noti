import { Command } from 'commander';
import { addCommand } from './page-add.js';
import { getCommand } from './page-get.js';
import { removeCommand } from './page-remove.js';
import { updateCommand } from './page-update.js';

export const pageCommand = new Command('page')
  .description('データベースの行（ページ）のプロパティを操作')
  .addHelpText(
    'after',
    `
Notes:
  - "database page" はデータベース行のプロパティ値（Status, Priority等）を操作します
  - ページの本文コンテンツを操作する場合は "page" コマンドを使用してください
  - add/update ではJSONファイルでプロパティ値を指定します`
  )
  .addCommand(addCommand)
  .addCommand(getCommand)
  .addCommand(removeCommand)
  .addCommand(updateCommand);
