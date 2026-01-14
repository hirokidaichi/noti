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
  .description('ページの情報を取得')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option(
    '-f, --format <format>',
    '出力フォーマット (json/markdown)',
    'markdown'
  )
  .option('-o, --output <file>', '出力ファイルパス')
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
  .description('ページにコンテンツを追加')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<input_file>', '入力ファイルパス')
  .option('-d, --debug', 'デバッグモード')
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
  .description('新規ページを作成')
  .argument('<parent_id_or_url>', '親ページIDまたはURL')
  .argument('<input_file>', '入力ファイルパス')
  .option('-t, --title <title>', 'ページのタイトル')
  .option('-d, --debug', 'デバッグモード')
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
  .description('ページを削除（アーカイブ）')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '確認なしで削除')
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
          outputHandler.error(
            '削除を実行するには -f オプションを指定してください'
          );
          return;
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
  .description('ページの内容を更新')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<input_file>', '入力ファイルパス')
  .option('-t, --title <title>', '新しいページタイトル')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '確認なしで更新')
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
          outputHandler.error(
            '更新を実行するには -f オプションを指定してください'
          );
          return;
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
  .description('ページ操作コマンド')
  .addCommand(getSubCommand)
  .addCommand(appendSubCommand)
  .addCommand(createSubCommand)
  .addCommand(removeSubCommand)
  .addCommand(updateSubCommand)
  .addCommand(commentCommand);
