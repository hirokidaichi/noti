#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net --allow-run

import { Command } from '@cliffy/command';
import { searchCommand } from './commands/search.ts';
import { configureCommand } from './commands/configure.ts';
import { pageCommand } from './commands/page.ts';
import { aliasCommand } from './commands/alias.ts';
import { userCommand } from './commands/user.ts';
import { databaseCommand } from './commands/database.ts';
import { openCommand } from './commands/open.ts';
import { Config } from './lib/config/config.ts';

/**
 * 設定状態を確認し、適切な処理を行う
 * @returns {Promise<void>}
 */
async function handleNoArguments(): Promise<void> {
  try {
    const config = await Config.load();

    if (config.token) {
      // 設定済みの場合はヘルプを表示
      showHelp();
    } else {
      // 未設定の場合はconfigureコマンドを実行
      console.log(
        'Notion APIトークンが設定されていません。設定を開始します...',
      );
      await runConfigureCommand();
    }
  } catch (error) {
    console.error('設定の読み込み中にエラーが発生しました:', error);
    Deno.exit(1);
  }
}

/**
 * ヘルプを表示する
 */
function showHelp(): void {
  command.showHelp();
}

/**
 * configureコマンドを実行する
 */
async function runConfigureCommand(): Promise<void> {
  // configureコマンドを直接実行
  await command.parse(['configure']);
}

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

// メイン処理
if (Deno.args.length === 0) {
  await handleNoArguments();
} else {
  await command.parse(Deno.args);
}
