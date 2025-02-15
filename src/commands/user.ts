import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { Logger } from '../lib/logger.ts';

const logger = Logger.getInstance();

interface NotionUser {
  id: string;
  name: string;
  type: 'person' | 'bot';
  person?: {
    email: string;
  };
  avatar_url?: string;
}

export const userCommand = new Command()
  .name('user')
  .description('Notionユーザー関連のコマンド')
  .command(
    'list',
    new Command()
      .description('Notionのユーザー一覧を表示')
      .action(async () => {
        try {
          const config = await Config.load();
          const client = new NotionClient(config);
          const response = await client.listUsers();

          logger.info('ユーザー一覧:');
          (response.results as NotionUser[]).forEach((user) => {
            logger.info(`- ${user.name} (${user.type})`);
            logger.info(`  ID: ${user.id}`);
            if (user.type === 'person') {
              logger.info(`  Email: ${user.person?.email ?? 'N/A'}`);
            }
          });
        } catch (error) {
          logger.error('ユーザー一覧の取得に失敗しました', error);
        }
      }),
  )
  .command(
    'get',
    new Command()
      .description('指定したユーザーの詳細情報を表示')
      .arguments('<user-id:string>')
      .action(async (_options: unknown, userId: string) => {
        try {
          const config = await Config.load();
          const client = new NotionClient(config);
          const user = await client.getUser(userId) as NotionUser;

          logger.info('ユーザー詳細:');
          logger.info(`名前: ${user.name}`);
          logger.info(`タイプ: ${user.type}`);
          logger.info(`ID: ${user.id}`);
          if (user.type === 'person') {
            logger.info(`メール: ${user.person?.email ?? 'N/A'}`);
          }
          logger.info(`アバターURL: ${user.avatar_url ?? 'N/A'}`);
        } catch (error) {
          logger.error('ユーザー情報の取得に失敗しました', error);
        }
      }),
  );
