import { Command } from 'commander';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import { BlockToMarkdown } from '../../lib/converter/block-to-markdown.js';
import type { NotionBlocks } from '../../lib/converter/types.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

// プロパティ値の表示用ヘルパー関数
function formatPropertyForDisplay(
  property: PageObjectResponse['properties'][string]
): string {
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'number':
      return property.number?.toString() || '';
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map((item) => item.name).join(', ') || '';
    case 'date': {
      const start = property.date?.start || '';
      const end = property.date?.end ? ` → ${property.date.end}` : '';
      return start + end;
    }
    case 'checkbox':
      return property.checkbox ? '✓' : '✗';
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'formula': {
      const formula = property.formula;
      if ('type' in formula) {
        switch (formula.type) {
          case 'string':
            return (formula as { type: 'string'; string: string }).string || '';
          case 'number':
            return (
              (
                formula as { type: 'number'; number: number }
              ).number?.toString() || ''
            );
          case 'boolean':
            return formula.boolean ? '✓' : '✗';
          case 'date':
            return formula.date?.start || '';
          default:
            return '';
        }
      }
      return '';
    }
    default:
      return '未対応の型';
  }
}

export const getCommand = new Command('get')
  .description('データベースページの情報を取得')
  .argument('<database_page_id_or_url>', 'データベースページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('-j, --json', 'JSON形式で出力')
  .option('-o, --output <path>', '出力ファイルパス')
  .action(
    async (
      databasePageIdOrUrl: string,
      options: { debug?: boolean; json?: boolean; output?: string }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの解決
        const pageId = await pageResolver.resolvePageId(databasePageIdOrUrl);
        outputHandler.debug('Page ID:', pageId);

        // ページ情報の取得
        const page = (await client.getPage(pageId)) as PageObjectResponse;
        outputHandler.debug('Page Info:', page);

        // ブロックの取得
        const blocks = await client.getBlocks(pageId);
        outputHandler.debug('Blocks:', blocks);

        if (options.json) {
          // JSON形式での出力
          await outputHandler.handleOutput(
            JSON.stringify(
              {
                page,
                blocks: blocks.results,
              },
              null,
              2
            ),
            {
              output: options.output,
              json: true,
            }
          );
          return;
        }

        // プロパティとブロックのMarkdown形式での出力
        const propertiesMarkdown = Object.entries(page.properties)
          .map(([key, value]) => `- ${key}: ${formatPropertyForDisplay(value)}`)
          .join('\n');

        const converter = new BlockToMarkdown();
        const blocksMarkdown = converter.convert(
          blocks.results.filter(
            (block): block is BlockObjectResponse => 'type' in block
          ) as NotionBlocks[]
        );

        const output = `# プロパティ\n${propertiesMarkdown}\n\n# コンテンツ\n${blocksMarkdown}`;

        await outputHandler.handleOutput(output, {
          output: options.output,
        });
      }, 'ページ情報の取得に失敗しました');
    }
  );
