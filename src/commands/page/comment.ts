import { Command } from '@cliffy/command';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { PageResolver } from '../../lib/command-utils/page-resolver.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { OutputHandler } from '../../lib/command-utils/output-handler.ts';
import * as colors from '@std/fmt/colors';

// NotionのURLまたはIDからページIDを抽出する関数
async function extractPageId(input: string): Promise<string> {
  const resolver = await PageResolver.create();
  return await resolver.resolvePageId(input);
}

// コメントをコンソールに表示するための関数
async function formatComment(
  client: NotionClient,
  comment: any,
  options: { indentLevel?: number; showDiscussionId?: boolean } = {},
) {
  const { indentLevel = 0, showDiscussionId = false } = options;
  const indent = '  '.repeat(indentLevel);

  const content = comment.rich_text.map((rt: any) =>
    'plain_text' in rt ? rt.plain_text : rt.text?.content || ''
  ).join('');

  const date = new Date(comment.created_time).toLocaleString('ja-JP');
  const user = await client.getUser(comment.created_by.id);
  const userName = user.name || user.id;

  let result = `${indent}- ${colors.bold(userName)}: ${content}`;

  if (showDiscussionId) {
    result += `\n${indent}  ${colors.gray(`ID: ${comment.id}`)}`;
    result += `\n${indent}  ${
      colors.gray(`スレッドID: ${comment.discussion_id}`)
    }`;
  }

  result += `\n${indent}  ${colors.italic(colors.gray(date))}`;

  return result;
}

// コメントを階層構造に整理する関数
function organizeCommentThreads(comments: any[]) {
  const threads: Record<string, any[]> = {};

  // コメントをスレッドごとに分類
  comments.forEach((comment) => {
    const discussionId = comment.discussion_id;
    if (!threads[discussionId]) {
      threads[discussionId] = [];
    }
    threads[discussionId].push(comment);
  });

  // 各スレッド内でコメントを時系列順にソート
  Object.values(threads).forEach((thread) => {
    thread.sort((a, b) =>
      new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
    );
  });

  return threads;
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
        '出力フォーマット (json/markdown/thread)',
        {
          default: 'thread',
        },
      )
      .option('--detail', 'コメントの詳細情報を表示する', { default: false })
      .action(async (options, pageIdOrUrl) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          outputHandler.debug('Page ID', pageId);

          // コメントの取得
          const response = await client.getComments(pageId);
          outputHandler.debug('API Response', response);

          // 出力フォーマットに応じて処理
          if (options.format === 'json') {
            console.log(JSON.stringify(response, null, 2));
            return;
          }

          if (response.results.length === 0) {
            outputHandler.info('コメントはありません。');
            return;
          }

          if (options.format === 'thread') {
            // スレッド形式で表示
            const threads = organizeCommentThreads(response.results);
            const formattedThreads = [];

            for (const [_threadId, comments] of Object.entries(threads)) {
              const threadComments = await Promise.all(
                comments.map((comment, index) =>
                  formatComment(client, comment, {
                    indentLevel: index > 0 ? 1 : 0,
                    showDiscussionId: options.detail,
                  })
                ),
              );

              formattedThreads.push(threadComments.join('\n'));
              if (Object.keys(threads).length > 1) {
                formattedThreads.push(''); // スレッド間の空行
              }
            }

            console.log(formattedThreads.join('\n'));
          } else {
            // マークダウン形式で表示（従来通り）
            const comments = await Promise.all(
              response.results.map((comment) =>
                formatComment(client, comment, {
                  showDiscussionId: options.detail,
                })
              ),
            );
            console.log(comments.join('\n'));
          }
        }, 'コメントの取得に失敗しました');
      }),
  )
  .command(
    'add',
    new Command()
      .description('ページにコメントを追加')
      .arguments('<page_id_or_url:string> <comment:string>')
      .option('-d, --debug', 'デバッグモード')
      .option('-t, --thread <thread_id:string>', 'コメントを追加するスレッドID')
      .action(async (options, pageIdOrUrl, comment) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          outputHandler.debug('Page ID', pageId);

          // コメントの追加
          const response = await client.createComment(
            pageId,
            comment,
            options.thread,
          );
          outputHandler.debug('API Response', response);

          outputHandler.success('コメントを追加しました。');

          // スレッドIDがある場合は表示
          if ('discussion_id' in response && response.discussion_id) {
            outputHandler.info(`スレッドID: ${response.discussion_id}`);
          }
        }, 'コメントの追加に失敗しました');
      }),
  )
  .command(
    'reply',
    new Command()
      .description('コメントスレッドに返信')
      .arguments('<page_id_or_url:string> <thread_id:string> <comment:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, pageIdOrUrl, threadId, comment) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          outputHandler.debug('Page ID', pageId);
          outputHandler.debug('Thread ID', threadId);

          // スレッドにコメントを追加
          const response = await client.createComment(
            pageId,
            comment,
            threadId,
          );
          outputHandler.debug('API Response', response);

          outputHandler.success('コメントスレッドに返信しました。');
        }, 'コメントの返信に失敗しました');
      }),
  )
  .command(
    'list-threads',
    new Command()
      .description('ページのコメントスレッド一覧を表示')
      .arguments('<page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, pageIdOrUrl) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          outputHandler.debug('Page ID', pageId);

          // コメントの取得
          const response = await client.getComments(pageId);
          outputHandler.debug('API Response', response);

          if (response.results.length === 0) {
            outputHandler.info('コメントはありません。');
            return;
          }

          // スレッドごとに整理
          const threads = organizeCommentThreads(response.results);

          console.log(
            `${Object.keys(threads).length}個のコメントスレッドがあります：\n`,
          );

          for (const [threadId, comments] of Object.entries(threads)) {
            const firstComment = comments[0];
            const content = firstComment.rich_text
              .map((rt: any) =>
                'plain_text' in rt ? rt.plain_text : rt.text?.content || ''
              )
              .join('')
              .substring(0, 50) +
              (firstComment.rich_text.join('').length > 50 ? '...' : '');

            console.log(`スレッドID: ${threadId}`);
            console.log(`コメント数: ${comments.length}`);
            console.log(`最初のコメント: ${content}`);
            console.log(''); // 空行
          }
        }, 'コメントスレッドの取得に失敗しました');
      }),
  );
