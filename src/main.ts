#!/usr/bin/env node

import { Command } from 'commander';
import { searchCommand } from './commands/search.js';
import { configureCommand } from './commands/configure.js';
import { pageCommand } from './commands/page.js';
import { aliasCommand } from './commands/alias.js';
import { userCommand } from './commands/user.js';
import { databaseCommand } from './commands/database.js';
import { openCommand } from './commands/open.js';
import { blockCommand } from './commands/block.js';
import { Config } from './lib/config/config.js';

const program = new Command();

program
  .name('noti')
  .description('Notion CLI Client')
  .version('0.1.0')
  .addCommand(configureCommand)
  .addCommand(aliasCommand)
  .addCommand(pageCommand)
  .addCommand(blockCommand)
  .addCommand(searchCommand)
  .addCommand(userCommand)
  .addCommand(databaseCommand)
  .addCommand(openCommand);

/**
 * 設定状態を確認し、適切な処理を行う
 */
async function handleNoArguments(): Promise<void> {
  try {
    const config = await Config.load();

    if (config.token) {
      // 設定済みの場合はヘルプを表示
      program.help();
    } else {
      // 未設定の場合はconfigureコマンドを実行
      console.log(
        'Notion APIトークンが設定されていません。設定を開始します...'
      );
      await program.parseAsync(['node', 'noti', 'configure']);
    }
  } catch (error) {
    console.error('設定の読み込み中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  if (process.argv.length <= 2) {
    await handleNoArguments();
  } else {
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
