import { Command } from '@cliffy/command';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { Logger } from '../../lib/logger.ts';
import { PageResolver } from '../../lib/command-utils/page-resolver.ts';

// NotionのURLまたはIDからページIDを抽出する関数
async function extractPageId(input: string): Promise<string> {
  const resolver = await PageResolver.create();
  return await resolver.resolvePageId(input);
}

export const commentCommand = new Command()
  .description('コメント操作')
  .command(
    'get',
    new Command()
      .description('ページのコメントを取得')
      .arguments('<page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .option(
        '-f, --format <format:string>',
        '出力フォーマット (json/markdown)',
        {
          default: 'markdown',
        },
      )
      .action(async (options, pageIdOrUrl) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Page ID', pageId);

          // コメントの取得
          const response = await client.getComments(pageId);
          logger.debug('API Response', response);

          // 出力フォーマットに応じて処理
          if (options.format === 'markdown') {
            const comments = await Promise.all(
              response.results.map(async (comment) => {
                const content = comment.rich_text.map((rt) =>
                  'plain_text' in rt ? rt.plain_text : ''
                ).join('');
                const date = new Date(comment.created_time).toLocaleString(
                  'ja-JP',
                );
                const user = await client.getUser(comment.created_by.id);
                const userName = user.name || user.id;
                return `- **${userName}**: ${content}\n  _${date}_`;
              }),
            );
            console.log(comments.join('\n') || 'コメントはありません。');
          } else {
            console.log(JSON.stringify(response, null, 2));
          }
        } catch (error) {
          logger.error('コメントの取得に失敗しました', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'add',
    new Command()
      .description('ページにコメントを追加')
      .arguments('<page_id_or_url:string> <comment:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, pageIdOrUrl, comment) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Page ID', pageId);

          // コメントの追加
          const response = await client.createComment(pageId, comment);
          logger.debug('API Response', response);

          logger.success('コメントを追加しました。');
        } catch (error) {
          logger.error('コメントの追加に失敗しました', error);
          Deno.exit(1);
        }
      }),
  );
