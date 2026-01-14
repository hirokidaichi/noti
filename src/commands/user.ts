import { Command } from 'commander';
import { NotionClient } from '../lib/notion/client.js';
import { Config } from '../lib/config/config.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';

type NotionUser = {
  id: string;
  name: string;
  type: string;
  email?: string;
  avatar_url?: string | null;
};

interface CommandOptions {
  debug?: boolean;
  json?: boolean;
}

// ユーザー情報をフォーマットする共通関数
function formatUser(user: NotionUser): string {
  return [
    `- **ID**: \`${user.id}\``,
    `- **名前**: ${user.name}`,
    `- **タイプ**: ${user.type}`,
    'email' in user && user.email ? `- **メール**: ${user.email}` : null,
    user.avatar_url ? `- **アバター**: ${user.avatar_url}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

// me サブコマンド（自分の情報）
const meCommand = new Command('me')
  .description('自分のユーザー情報を取得')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .action(async (options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const user = (await client.getMe()) as NotionUser;
      outputHandler.debug('User Info:', user);

      if (options.json) {
        await outputHandler.handleOutput(user, { json: true });
        return;
      }

      const output = ['# ユーザー情報', '', formatUser(user)].join('\n');
      await outputHandler.handleOutput(output);
    }, 'ユーザー情報の取得に失敗しました');
  });

// list サブコマンド（全ユーザー一覧）
const listCommand = new Command('list')
  .description('ワークスペースのユーザー一覧を取得')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .action(async (options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const response = await client.listUsers();
      const users = response.results as NotionUser[];
      outputHandler.debug('Users:', users);

      if (options.json) {
        await outputHandler.handleOutput(users, { json: true });
        return;
      }

      // テーブル形式で出力
      console.log('ID\tType\tName\tEmail');
      for (const user of users) {
        const email = user.email || '-';
        console.log(`${user.id}\t${user.type}\t${user.name}\t${email}`);
      }
    }, 'ユーザー一覧の取得に失敗しました');
  });

// get サブコマンド（特定ユーザー情報）
const getCommand = new Command('get')
  .description('指定したユーザーの情報を取得')
  .argument('<user_id>', 'ユーザーID')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .action(async (userId: string, options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const user = (await client.getUser(userId)) as NotionUser;
      outputHandler.debug('User Info:', user);

      if (options.json) {
        await outputHandler.handleOutput(user, { json: true });
        return;
      }

      const output = ['# ユーザー情報', '', formatUser(user)].join('\n');
      await outputHandler.handleOutput(output);
    }, 'ユーザー情報の取得に失敗しました');
  });

export const userCommand = new Command('user')
  .description('ユーザー情報を取得')
  .addCommand(meCommand)
  .addCommand(listCommand)
  .addCommand(getCommand)
  .action(async (_options, command) => {
    // 引数なしで実行された場合は me コマンドを実行
    await command.commands
      .find((c: Command) => c.name() === 'me')
      ?.parseAsync([], { from: 'user' });
  });
