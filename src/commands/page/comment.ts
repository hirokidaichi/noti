import { Command } from 'commander';
import chalk from 'chalk';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';

// Notionコメントの型定義
interface RichTextItem {
  plain_text?: string;
  text?: { content: string };
}

interface NotionComment {
  id: string;
  discussion_id: string;
  created_time: string;
  created_by: { id: string };
  rich_text: RichTextItem[];
}

// NotionのURLまたはIDからページIDを抽出する関数
async function extractPageId(input: string): Promise<string> {
  const resolver = await PageResolver.create();
  return await resolver.resolvePageId(input);
}

// コメントをコンソールに表示するための関数
async function formatComment(
  client: NotionClient,
  comment: NotionComment,
  options: { indentLevel?: number; showDiscussionId?: boolean } = {}
) {
  const { indentLevel = 0, showDiscussionId = false } = options;
  const indent = '  '.repeat(indentLevel);

  const content = comment.rich_text
    .map((rt: RichTextItem) =>
      'plain_text' in rt ? rt.plain_text : rt.text?.content || ''
    )
    .join('');

  const date = new Date(comment.created_time).toLocaleString('ja-JP');
  const user = await client.getUser(comment.created_by.id);
  const userName = user.name || user.id;

  let result = `${indent}- ${chalk.bold(userName)}: ${content}`;

  if (showDiscussionId) {
    result += `\n${indent}  ${chalk.gray(`ID: ${comment.id}`)}`;
    result += `\n${indent}  ${chalk.gray(`スレッドID: ${comment.discussion_id}`)}`;
  }

  result += `\n${indent}  ${chalk.italic.gray(date)}`;

  return result;
}

// コメントを階層構造に整理する関数
function organizeCommentThreads(
  comments: NotionComment[]
): Record<string, NotionComment[]> {
  const threads: Record<string, NotionComment[]> = {};

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
    thread.sort(
      (a, b) =>
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
    );
  });

  return threads;
}

// コメント取得サブコマンド
const getSubCommand = new Command('get')
  .description('ページのコメントを取得')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option(
    '-f, --format <format>',
    '出力フォーマット (json/markdown/thread)',
    'thread'
  )
  .option('--detail', 'コメントの詳細情報を表示する', false)
  .action(
    async (
      pageIdOrUrl: string,
      options: { debug?: boolean; format: string; detail?: boolean }
    ) => {
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

        const notionComments = response.results as NotionComment[];

        if (options.format === 'thread') {
          // スレッド形式で表示
          const threads = organizeCommentThreads(notionComments);
          const formattedThreads = [];

          for (const comments of Object.values(threads)) {
            const threadComments = await Promise.all(
              comments.map((comment, index) =>
                formatComment(client, comment, {
                  indentLevel: index > 0 ? 1 : 0,
                  showDiscussionId: options.detail,
                })
              )
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
            notionComments.map((comment) =>
              formatComment(client, comment, {
                showDiscussionId: options.detail,
              })
            )
          );
          console.log(comments.join('\n'));
        }
      }, 'コメントの取得に失敗しました');
    }
  );

// コメント追加サブコマンド
const addSubCommand = new Command('add')
  .description('ページにコメントを追加')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<comment>', 'コメント内容')
  .option('-d, --debug', 'デバッグモード')
  .option('-t, --thread <thread_id>', 'コメントを追加するスレッドID')
  .action(
    async (
      pageIdOrUrl: string,
      comment: string,
      options: { debug?: boolean; thread?: string }
    ) => {
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
          options.thread
        );
        outputHandler.debug('API Response', response);

        outputHandler.success('コメントを追加しました。');

        // スレッドIDがある場合は表示
        if ('discussion_id' in response && response.discussion_id) {
          outputHandler.info(`スレッドID: ${response.discussion_id}`);
        }
      }, 'コメントの追加に失敗しました');
    }
  );

// コメント返信サブコマンド
const replySubCommand = new Command('reply')
  .description('コメントスレッドに返信')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<thread_id>', 'スレッドID')
  .argument('<comment>', 'コメント内容')
  .option('-d, --debug', 'デバッグモード')
  .action(
    async (
      pageIdOrUrl: string,
      threadId: string,
      comment: string,
      options: { debug?: boolean }
    ) => {
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
        const response = await client.createComment(pageId, comment, threadId);
        outputHandler.debug('API Response', response);

        outputHandler.success('コメントスレッドに返信しました。');
      }, 'コメントの返信に失敗しました');
    }
  );

// スレッド一覧サブコマンド
const listThreadsSubCommand = new Command('list-threads')
  .description('ページのコメントスレッド一覧を表示')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .action(async (pageIdOrUrl: string, options: { debug?: boolean }) => {
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
      const threads = organizeCommentThreads(
        response.results as NotionComment[]
      );

      console.log(
        `${Object.keys(threads).length}個のコメントスレッドがあります：\n`
      );

      for (const [threadId, comments] of Object.entries(threads)) {
        const firstComment = comments[0];
        const fullText = firstComment.rich_text
          .map((rt: RichTextItem) =>
            'plain_text' in rt ? rt.plain_text : rt.text?.content || ''
          )
          .join('');
        const content =
          fullText.substring(0, 50) + (fullText.length > 50 ? '...' : '');

        console.log(`スレッドID: ${threadId}`);
        console.log(`コメント数: ${comments.length}`);
        console.log(`最初のコメント: ${content}`);
        console.log(''); // 空行
      }
    }, 'コメントスレッドの取得に失敗しました');
  });

export const commentCommand = new Command('comment')
  .description('コメント操作')
  .addCommand(getSubCommand)
  .addCommand(addSubCommand)
  .addCommand(replySubCommand)
  .addCommand(listThreadsSubCommand);
