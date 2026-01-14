import { Command } from 'commander';
import { NotionClient } from '../lib/notion/client.js';
import { Config } from '../lib/config/config.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';

export interface BlockObject {
  id: string;
  type: string;
  has_children: boolean;
  created_time: string;
  last_edited_time: string;
  [key: string]: unknown;
}

interface CommandOptions {
  debug?: boolean;
  json?: boolean;
  children?: boolean;
  force?: boolean;
}

// ブロックからテキストを抽出
export function extractBlockText(block: BlockObject): string {
  const type = block.type;
  const content = block[type] as { rich_text?: Array<{ plain_text: string }> };

  if (content?.rich_text) {
    return content.rich_text.map((t) => t.plain_text).join('');
  }

  return '';
}

// get サブコマンド
const getCommand = new Command('get')
  .description('ブロックを取得')
  .argument('<block_id>', 'ブロックID')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .option('-c, --children', '子ブロックも取得')
  .action(async (blockId: string, options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const block = (await client.getBlock(blockId)) as BlockObject;
      outputHandler.debug('Block:', block);

      let children: BlockObject[] = [];
      if (options.children && block.has_children) {
        const childrenResponse = await client.getBlocks(blockId);
        children = childrenResponse.results as BlockObject[];
      }

      if (options.json) {
        const output = options.children ? { block, children } : block;
        await outputHandler.handleOutput(output, { json: true });
        return;
      }

      // テーブル形式で出力
      const text = extractBlockText(block);
      console.log(`${block.id}\t${block.type}\t${text.slice(0, 50)}`);

      if (options.children && children.length > 0) {
        console.log('\n--- Children ---');
        for (const child of children) {
          const childText = extractBlockText(child);
          console.log(`${child.id}\t${child.type}\t${childText.slice(0, 50)}`);
        }
      }
    }, 'ブロックの取得に失敗しました');
  });

// delete サブコマンド
const deleteCommand = new Command('delete')
  .description('ブロックを削除')
  .argument('<block_id>', 'ブロックID')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '確認なしで削除')
  .option('--json', 'JSON形式で出力')
  .action(async (blockId: string, options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      // -f オプションが必須
      if (!options.force) {
        outputHandler.error(
          '削除を実行するには -f オプションを指定してください'
        );
        return;
      }

      // 削除前にブロック情報を取得
      const block = (await client.getBlock(blockId)) as BlockObject;
      outputHandler.debug('Block to delete:', block);

      const result = await client.deleteBlock(blockId);
      outputHandler.debug('Delete result:', result);

      if (options.json) {
        await outputHandler.handleOutput(result, { json: true });
        return;
      }

      console.log(`ブロック ${blockId} を削除しました`);
    }, 'ブロックの削除に失敗しました');
  });

// list サブコマンド（子ブロック一覧）
const listCommand = new Command('list')
  .description('指定したブロック/ページの子ブロック一覧を取得')
  .argument('<parent_id>', '親ブロックまたはページのID')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .action(async (parentId: string, options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      const response = await client.getBlocks(parentId);
      const blocks = response.results as BlockObject[];
      outputHandler.debug('Blocks:', blocks);

      if (options.json) {
        await outputHandler.handleOutput(blocks, { json: true });
        return;
      }

      if (blocks.length === 0) {
        console.log('子ブロックがありません');
        return;
      }

      // テーブル形式で出力
      console.log('ID\tType\tContent');
      for (const block of blocks) {
        const text = extractBlockText(block);
        console.log(`${block.id}\t${block.type}\t${text.slice(0, 50)}`);
      }
    }, 'ブロック一覧の取得に失敗しました');
  });

export const blockCommand = new Command('block')
  .description('ブロック操作コマンド')
  .addCommand(getCommand)
  .addCommand(deleteCommand)
  .addCommand(listCommand);
