import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { BlockToMarkdown } from '../lib/converter/block-to-markdown.ts';
import { MarkdownToBlocks } from '../lib/converter/markdown-to-blocks.ts';
import type {
  NotionBlocks,
  NotionHeading1Block,
} from '../lib/converter/types.ts';
import { basename } from '@std/path';
import { Logger } from '../lib/logger.ts';
import { NotionPageId } from '../lib/notion/page-uri.ts';
import { AliasManager } from '../lib/config/aliases.ts';

// エラー型の定義
interface NotionError {
  message: string;
}

// APIレスポンス型の定義
interface NotionPageResponse {
  properties: Record<string, {
    type: string;
    title?: Array<{
      plain_text: string;
    }>;
  }>;
  url?: string;
}

interface CreatePageResponse {
  url: string;
}

// NotionのURLまたはIDからページIDを抽出する関数
async function extractPageId(input: string): Promise<string> {
  // エイリアスの解決を試みる
  const aliasManager = await AliasManager.load();
  const resolvedInput = aliasManager.get(input) || input;

  const pageId = NotionPageId.fromString(resolvedInput);
  if (!pageId) {
    throw new Error(
      '無効なページIDまたはURLです。32文字の16進数である必要があります。',
    );
  }
  return pageId.toShortId();
}

// 確認プロンプトを表示する関数
async function confirm(message: string): Promise<boolean> {
  console.log(`${message} (y/N)`);
  const buf = new Uint8Array(1);
  await Deno.stdin.read(buf);
  const input = new TextDecoder().decode(buf);
  return input.toLowerCase() === 'y';
}

export const pageCommand = new Command()
  .name('page')
  .description('ページ操作コマンド')
  .command(
    'get',
    new Command()
      .description('ページの情報を取得')
      .arguments('<page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .option(
        '-f, --format <format:string>',
        '出力フォーマット (json/markdown)',
        {
          default: 'json',
        },
      )
      .option('-o, --output <file:string>', '出力ファイルパス')
      .action(async (options, pageIdOrUrl) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // URLまたはIDからページIDを抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Extracted Page ID', pageId);

          // ページ情報の取得
          const page = (await client.getPage(pageId)) as NotionPageResponse;

          // ブロックの取得
          const blocks = await client.getBlocks(pageId);

          logger.debug('Raw Response', page);
          logger.debug('Blocks', blocks);

          // 出力フォーマットに応じて処理
          let output = '';
          if (options.format === 'markdown') {
            const converter = new BlockToMarkdown();

            const propertiesMarkdown = converter.convertProperties(
              page.properties,
            );
            // 次にブロックを変換
            const blocksMarkdown = converter.convert(
              blocks.results as NotionBlocks[],
            );
            // 両方を結合
            output = propertiesMarkdown + blocksMarkdown;
          } else {
            // JSON形式で出力（ページ情報とブロック情報を含む）
            output = JSON.stringify(
              {
                page,
                blocks: blocks.results,
              },
              null,
              2,
            );
          }

          // 出力先の処理
          if (options.output) {
            await Deno.writeTextFile(options.output, output);
            logger.success(`出力を ${options.output} に保存しました。`);
          } else {
            console.log(output);
          }
        } catch (error) {
          logger.error('ページの取得に失敗しました', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'append',
    new Command()
      .description('ページにコンテンツを追加')
      .arguments('<page_id_or_url:string> <input_file:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, pageIdOrUrl, inputFile) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // URLまたはIDからページIDを抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Extracted Page ID', pageId);

          // 入力ファイルの読み込み
          const markdown = await Deno.readTextFile(inputFile);

          // MarkdownをNotionブロックに変換
          const converter = new MarkdownToBlocks();
          const { blocks } = converter.convert(markdown);

          logger.debug('Converted Blocks', blocks);

          // ブロックの追加
          const result = await client.appendBlocks(pageId, blocks);
          logger.debug('API Response', result);

          logger.success('コンテンツを追加しました。');
        } catch (error) {
          logger.error('コンテンツの追加に失敗しました', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'create',
    new Command()
      .description('新規ページを作成')
      .arguments('<parent_id_or_url:string> <input_file:string>')
      .option('-t, --title <title:string>', 'ページのタイトル')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, parentIdOrUrl, inputFile) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // 親ページIDの抽出
          const parentId = await extractPageId(parentIdOrUrl);
          logger.debug('Parent Page ID', parentId);

          // 入力ファイルの読み込み
          const markdown = await Deno.readTextFile(inputFile);

          // MarkdownをNotionブロックに変換
          const converter = new MarkdownToBlocks();
          const { blocks } = converter.convert(markdown);

          // タイトルの決定
          let title = options.title;
          if (!title) {
            // 最初のheading_1ブロックからタイトルを抽出
            const firstHeading = blocks.find((block) =>
              block.type === 'heading_1' &&
              block.heading_1?.rich_text?.[0]?.text?.content
            );
            if (firstHeading) {
              title =
                (firstHeading as NotionHeading1Block).heading_1.rich_text[0]
                  .text.content;
              // タイトルとして使用したheading_1は削除
              blocks.splice(blocks.indexOf(firstHeading), 1);
            } else {
              // heading_1がない場合は、ファイル名から拡張子を除いたものをタイトルとして使用
              const fileName = basename(inputFile);
              title = fileName.replace(/\.[^/.]+$/, ''); // 拡張子を削除
            }
          }

          logger.debug('Title', title);
          logger.debug('Blocks', blocks);

          // ページの作成
          const result = (await client.createPage({
            parentId,
            title,
            blocks,
          })) as CreatePageResponse;

          logger.debug('API Response', result);
          logger.success('ページを作成しました: ' + result.url);
        } catch (error) {
          logger.error('ページの作成に失敗しました', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'remove',
    new Command()
      .description('ページを削除（アーカイブ）')
      .arguments('<page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .option('-f, --force', '確認なしで削除')
      .action(async (options, pageIdOrUrl) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Page ID', pageId);

          // ページ情報の取得（タイトルを表示するため）
          const page = (await client.getPage(pageId)) as NotionPageResponse;
          const title = page.properties?.title?.title?.[0]?.plain_text ||
            'Untitled';

          // 確認プロンプト（--forceオプションがない場合）
          if (!options.force) {
            const answer = await confirm(`ページ「${title}」を削除しますか？`);

            if (!answer) {
              console.error('削除をキャンセルしました。');
              Deno.exit(0);
            }
          }

          // ページの削除
          const result = await client.removePage(pageId);

          logger.debug('API Response', result);
          logger.success(`ページ「${title}」を削除しました。`);
        } catch (error) {
          logger.error('ページの削除に失敗しました', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'update',
    new Command()
      .description('ページの内容を更新')
      .arguments('<page_id_or_url:string> <input_file:string>')
      .option('-t, --title <title:string>', '新しいページタイトル')
      .option('-d, --debug', 'デバッグモード')
      .option('-f, --force', '確認なしで更新')
      .action(async (options, pageIdOrUrl, inputFile) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの抽出
          const pageId = await extractPageId(pageIdOrUrl);
          logger.debug('Page ID', pageId);

          // 現在のページ情報の取得
          const page = (await client.getPage(pageId)) as NotionPageResponse;
          const currentTitle = page.properties?.title?.title?.[0]?.plain_text ||
            'Untitled';

          // 入力ファイルの読み込み
          const markdown = await Deno.readTextFile(inputFile);

          // MarkdownをNotionブロックに変換
          const converter = new MarkdownToBlocks();
          const { blocks } = converter.convert(markdown);

          // タイトルの決定
          let title = options.title;
          if (!title) {
            // 最初のheading_1ブロックからタイトルを抽出
            const firstHeading = blocks.find((block) =>
              block.type === 'heading_1' &&
              block.heading_1?.rich_text?.[0]?.text?.content
            );
            if (firstHeading) {
              title =
                (firstHeading as NotionHeading1Block).heading_1.rich_text[0]
                  .text.content;
              // タイトルとして使用したheading_1は削除
              blocks.splice(blocks.indexOf(firstHeading), 1);
            }
          }

          // 確認プロンプト（--forceオプションがない場合）
          if (!options.force) {
            const message = `ページ「${currentTitle}」を更新しますか？` +
              (title ? `\n新しいタイトル: ${title}` : '');
            const answer = await confirm(message);

            if (!answer) {
              console.error('更新をキャンセルしました。');
              Deno.exit(0);
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

          logger.success('ページを更新しました。');
        } catch (error) {
          logger.error('ページの更新に失敗しました', error);
          Deno.exit(1);
        }
      }),
  );
