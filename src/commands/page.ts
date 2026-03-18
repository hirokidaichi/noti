import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { NotionClient } from '../lib/notion/client.js';
import { Config } from '../lib/config/config.js';
import { BlockToMarkdown } from '../lib/converter/block-to-markdown.js';
import { MarkdownToBlocks } from '../lib/converter/markdown-to-blocks.js';
import type {
  NotionBlocks,
  NotionHeading1Block,
} from '../lib/converter/types.js';
import { PageResolver } from '../lib/command-utils/page-resolver.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { commentCommand } from './page/comment.js';

interface CreatePageResponse {
  url: string;
}

// ページ取得サブコマンド
const getSubCommand = new Command('get')
  .description(
    'ページの情報を取得（プロパティと本文をMarkdownまたはJSONで出力）'
  )
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option(
    '-f, --format <format>',
    '出力フォーマット (json/markdown)',
    'markdown'
  )
  .option('-o, --output <file>', '出力ファイルパス')
  .addHelpText(
    'after',
    `
Examples:
  $ noti page get <page_id>                       # Markdown形式で標準出力
  $ noti page get <page_id> -f json               # JSON形式で出力
  $ noti page get <page_id> -o page.md            # ファイルに保存
  $ noti page get https://notion.so/xxxx -f json  # URLでも指定可能
  $ noti page get my-alias                        # エイリアスでも指定可能

Notes:
  - Markdown出力にはプロパティ一覧と本文ブロックの両方が含まれます
  - データベースページのプロパティだけ見たい場合は "database page get" を使用`
  )
  .action(
    async (
      pageIdOrUrl: string,
      options: { debug?: boolean; format: string; output?: string }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの解決
        const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
        outputHandler.debug('Extracted Page ID', pageId);

        // ページ情報の取得
        const page = (await client.getPage(pageId)) as PageObjectResponse;
        const blocks = await client.getBlocks(pageId);

        outputHandler.debug('Raw Response', page);
        outputHandler.debug('Blocks', blocks);

        // 出力フォーマットに応じて処理
        let output = '';
        if (options.format === 'markdown') {
          const converter = new BlockToMarkdown();
          const propertiesMarkdown = converter.convertProperties(
            page.properties as Parameters<typeof converter.convertProperties>[0]
          );
          const blocksMarkdown = converter.convert(
            blocks.results as NotionBlocks[]
          );
          output = propertiesMarkdown + blocksMarkdown;
        } else {
          output = JSON.stringify(
            {
              page,
              blocks: blocks.results,
            },
            null,
            2
          );
        }

        // 出力処理
        await outputHandler.handleOutput(output, {
          output: options.output,
          json: options.format === 'json',
        });
      }, 'ページの取得に失敗しました');
    }
  );

// ページ追記サブコマンド
const appendSubCommand = new Command('append')
  .description('ページの末尾にMarkdownコンテンツを追記（既存内容は保持）')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<input_file>', '入力Markdownファイルパス')
  .option('-d, --debug', 'デバッグモード')
  .addHelpText(
    'after',
    `
Examples:
  $ noti page append <page_id> notes.md     # ページ末尾にMarkdownを追記
  $ noti page append my-alias meeting.md    # エイリアスで指定

Notes:
  - 既存のコンテンツは削除されません（末尾に追加）
  - 本文を完全に置き換えたい場合は "page update" を使用
  - 対応Markdown: 見出し, 段落, リスト, 引用, コードブロック, チェックボックス`
  )
  .action(
    async (
      pageIdOrUrl: string,
      inputFile: string,
      options: { debug?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // URLまたはIDからページIDを抽出
        const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
        outputHandler.debug('Extracted Page ID', pageId);

        // 入力ファイルの読み込み
        const markdown = await readFile(inputFile, 'utf-8');

        // MarkdownをNotionブロックに変換
        const converter = new MarkdownToBlocks();
        const { blocks } = converter.convert(markdown);

        outputHandler.debug('Converted Blocks', blocks);

        // ブロックの追加
        const result = await client.appendBlocks(pageId, blocks);
        outputHandler.debug('API Response', result);

        outputHandler.success('コンテンツを追加しました。');
      }, 'コンテンツの追加に失敗しました');
    }
  );

// ページ作成サブコマンド
const createSubCommand = new Command('create')
  .description('親ページ配下にMarkdownから新規ページを作成')
  .argument('<parent_id_or_url>', '親ページIDまたはURL')
  .argument('<input_file>', '入力Markdownファイルパス')
  .option('-t, --title <title>', 'ページのタイトル')
  .option('-d, --debug', 'デバッグモード')
  .addHelpText(
    'after',
    `
Examples:
  $ noti page create <parent_id> doc.md              # 親ページ配下に作成
  $ noti page create <parent_id> doc.md -t "議事録"  # タイトルを明示的に指定

Notes:
  - タイトル未指定時、Markdownの最初の # 見出しがタイトルになります
  - # 見出しもない場合、ファイル名がタイトルになります
  - データベースにページ（行）を追加する場合は "database page add" を使用`
  )
  .action(
    async (
      parentIdOrUrl: string,
      inputFile: string,
      options: { title?: string; debug?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // 親ページIDの抽出
        const parentId = await pageResolver.resolvePageId(parentIdOrUrl);
        outputHandler.debug('Parent Page ID', parentId);

        // 入力ファイルの読み込み
        const markdown = await readFile(inputFile, 'utf-8');

        // MarkdownをNotionブロックに変換
        const converter = new MarkdownToBlocks();
        const { blocks } = converter.convert(markdown);

        // タイトルの決定
        let title = options.title;
        if (!title) {
          // 最初のheading_1ブロックからタイトルを抽出
          const firstHeading = blocks.find(
            (block) =>
              block.type === 'heading_1' &&
              block.heading_1?.rich_text?.[0]?.text?.content
          );
          if (firstHeading) {
            title = (firstHeading as NotionHeading1Block).heading_1.rich_text[0]
              .text.content;
            // タイトルとして使用したheading_1は削除
            blocks.splice(blocks.indexOf(firstHeading), 1);
          } else {
            // heading_1がない場合は、ファイル名から拡張子を除いたものをタイトルとして使用
            const fileName = basename(inputFile);
            title = fileName.replace(/\.[^/.]+$/, ''); // 拡張子を削除
          }
        }

        outputHandler.debug('Title', title);
        outputHandler.debug('Blocks', blocks);

        // ページの作成
        const result = (await client.createPage({
          parentId,
          title,
          blocks,
        })) as CreatePageResponse;

        outputHandler.debug('API Response', result);
        outputHandler.success('ページを作成しました: ' + result.url);
      }, 'ページの作成に失敗しました');
    }
  );

// ページ削除サブコマンド
const removeSubCommand = new Command('remove')
  .description('ページを削除（アーカイブ）。-f 必須')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '削除を実行（必須・誤削除防止）')
  .addHelpText(
    'after',
    `
Examples:
  $ noti page remove <page_id> -f            # ページをアーカイブ
  $ noti page remove https://notion.so/xxxx -f

Notes:
  - -f オプションは必須です（誤削除防止のため）
  - Notion APIではページは完全削除されず、アーカイブされます
  - データベース行を削除する場合は "database page remove" を使用`
  )
  .action(
    async (
      pageIdOrUrl: string,
      options: { debug?: boolean; force?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        // -f オプションが必須
        if (!options.force) {
          throw new Error('削除を実行するには -f オプションを指定してください');
        }

        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの解決
        const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
        outputHandler.debug('Page ID', pageId);

        // ページ情報の取得
        const page = (await client.getPage(pageId)) as PageObjectResponse;
        // タイトルプロパティを検索
        const titleProp = Object.values(page.properties).find(
          (prop) => prop.type === 'title'
        );
        const title =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (titleProp as any)?.title?.[0]?.plain_text || 'Untitled';

        // ページの削除
        const result = await client.removePage(pageId);
        outputHandler.debug('API Response', result);
        outputHandler.success(`ページ「${title}」を削除しました。`);
      }, 'ページの削除に失敗しました');
    }
  );

// ページ更新サブコマンド
const updateSubCommand = new Command('update')
  .description('ページの本文をMarkdownで完全に置換。-f 必須')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<input_file>', '入力Markdownファイルパス')
  .option('-t, --title <title>', '新しいページタイトル')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '更新を実行（必須・誤操作防止）')
  .addHelpText(
    'after',
    `
Examples:
  $ noti page update <page_id> new-content.md -f              # 本文を置換
  $ noti page update <page_id> new-content.md -f -t "新タイトル"  # タイトルも変更

Notes:
  - 既存の本文ブロックはすべて削除され、新しい内容で置換されます
  - 末尾に追記したい場合は "page append" を使用
  - データベース行のプロパティを更新する場合は "database page update" を使用
  - -f オプションは必須です（誤操作防止のため）`
  )
  .action(
    async (
      pageIdOrUrl: string,
      inputFile: string,
      options: { title?: string; debug?: boolean; force?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        // -f オプションが必須
        if (!options.force) {
          throw new Error('更新を実行するには -f オプションを指定してください');
        }

        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの抽出
        const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
        outputHandler.debug('Page ID', pageId);

        // 入力ファイルの読み込み
        const markdown = await readFile(inputFile, 'utf-8');

        // MarkdownをNotionブロックに変換
        const converter = new MarkdownToBlocks();
        const { blocks } = converter.convert(markdown);

        // タイトルの決定
        let title = options.title;
        if (!title) {
          // 最初のheading_1ブロックからタイトルを抽出
          const firstHeading = blocks.find(
            (block) =>
              block.type === 'heading_1' &&
              block.heading_1?.rich_text?.[0]?.text?.content
          );
          if (firstHeading) {
            title = (firstHeading as NotionHeading1Block).heading_1.rich_text[0]
              .text.content;
            // タイトルとして使用したheading_1は削除
            blocks.splice(blocks.indexOf(firstHeading), 1);
          }
        }

        // 既存のブロックを削除
        const existingBlocks = await client.getBlocks(pageId);
        for (const block of existingBlocks.results) {
          await client.deleteBlock(block.id);
        }

        // 新しいブロックを追加
        await client.appendBlocks(pageId, blocks);

        // タイトルを更新（指定がある場合）
        if (title) {
          await client.updatePage(pageId, {
            title: [{ text: { content: title } }],
          });
        }

        outputHandler.success('ページを更新しました。');
      }, 'ページの更新に失敗しました');
    }
  );

export const pageCommand = new Command('page')
  .description('ページの本文コンテンツを操作（取得/作成/更新/追記/削除）')
  .addCommand(getSubCommand)
  .addCommand(appendSubCommand)
  .addCommand(createSubCommand)
  .addCommand(removeSubCommand)
  .addCommand(updateSubCommand)
  .addCommand(commentCommand);
