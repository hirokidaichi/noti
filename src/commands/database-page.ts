import { Command } from '@cliffy/command';
import { Checkbox, Confirm, Input, Select } from '@cliffy/prompt';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import type {
  BlockObjectResponse,
  CreatePageParameters,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import { BlockToMarkdown } from '../lib/converter/block-to-markdown.ts';
import type { NotionBlocks } from '../lib/converter/types.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';
import { PageResolver } from '../lib/command-utils/page-resolver.ts';

// データベースのプロパティ型定義
interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  options?: Array<{ id: string; name: string; color: string }>;
  number?: { format: string };
  formula?: { expression: string };
  date?: { start?: string; end?: string };
  required?: boolean;
}

// プロパティ値の型変換ヘルパー関数
function convertPropertyValue(value: string, type: string): unknown {
  switch (type) {
    case 'number':
      return Number(value);
    case 'checkbox':
      return value.toLowerCase() === 'true';
    case 'date': {
      const date = new Date(value);
      return {
        start: date.toISOString(),
      };
    }
    default:
      return value;
  }
}

// プロパティ入力のバリデーション関数
function validatePropertyValue(value: string, type: string): boolean {
  switch (type) {
    case 'number':
      return !isNaN(Number(value));
    case 'checkbox':
      return ['true', 'false'].includes(value.toLowerCase());
    case 'date':
      return !isNaN(Date.parse(value));
    default:
      return true;
  }
}

// プロパティ値をNotionのAPI形式に変換
function formatPropertyForUpdate(
  value: unknown,
  type: string,
): CreatePageParameters['properties'][string] {
  switch (type) {
    case 'title':
      return {
        title: [{ text: { content: value as string } }],
      };
    case 'rich_text':
      return {
        rich_text: [{ text: { content: value as string } }],
      };
    case 'number':
      return { number: value as number };
    case 'select':
      return { select: { name: value as string } };
    case 'multi_select':
      return {
        multi_select: (value as string[]).map((name) => ({ name })),
      };
    case 'checkbox':
      return { checkbox: value as boolean };
    case 'date':
      return { date: value as { start: string; end?: string } };
    case 'url':
      return { url: value as string };
    case 'email':
      return { email: value as string };
    case 'phone_number':
      return { phone_number: value as string };
    default:
      throw new Error(`未対応のプロパティタイプ: ${type}`);
  }
}

// プロパティ値の表示用ヘルパー関数
function formatPropertyForDisplay(
  property: PageObjectResponse['properties'][string],
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
            return (formula as { type: 'number'; number: number }).number
              ?.toString() || '';
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

export const databasePageCommand = new Command()
  .description('データベースページ操作')
  .command(
    'add',
    new Command()
      .description('データベースに新規ページを追加')
      .arguments('<database_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, databaseIdOrUrl) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();
        const pageResolver = await PageResolver.create();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // データベースIDの解決
          const databaseId = await pageResolver.resolvePageId(databaseIdOrUrl);
          outputHandler.debug('Database ID:', databaseId);

          // データベース情報の取得
          const database = await client.getDatabase(databaseId);
          outputHandler.debug('Database Info:', database);

          // プロパティ情報の整理
          const properties: Record<string, DatabaseProperty> = {};
          for (const [name, prop] of Object.entries(database.properties)) {
            properties[name] = {
              id: prop.id,
              name,
              type: prop.type,
              options: prop.type === 'select'
                ? prop.select?.options
                : prop.type === 'multi_select'
                ? prop.multi_select?.options
                : undefined,
              number: prop.type === 'number' ? prop.number : undefined,
              formula: prop.type === 'formula' ? prop.formula : undefined,
              required: ['title'].includes(prop.type),
            };
          }

          // プロパティ値の入力
          const propertyValues: CreatePageParameters['properties'] = {};

          for (const [name, prop] of Object.entries(properties)) {
            // 計算式プロパティはスキップ
            if (prop.type === 'formula') {
              continue;
            }

            let value: unknown;

            switch (prop.type) {
              case 'select': {
                if (prop.options && prop.options.length > 0) {
                  const options = prop.options.map((opt) => opt.name);
                  value = await Select.prompt({
                    message: `${name} を選択してください:`,
                    options,
                    default: options[0],
                  });
                } else {
                  value = await Input.prompt(`${name} を入力してください:`);
                }
                break;
              }
              case 'multi_select': {
                if (prop.options && prop.options.length > 0) {
                  const options = prop.options.map((opt) => opt.name);
                  value = await Checkbox.prompt({
                    message: `${name} を選択してください:`,
                    options,
                  });
                } else {
                  const input = await Input.prompt(
                    `${name} をカンマ区切りで入力してください:`,
                  );
                  value = input.split(',').map((v) => v.trim());
                }
                break;
              }
              case 'checkbox': {
                value = await Confirm.prompt(`${name}:`);
                break;
              }
              default: {
                let isValid = false;
                while (!isValid) {
                  const input = await Input.prompt({
                    message: `${name} を入力してください${
                      prop.required ? ' (必須)' : ''
                    }:`,
                    validate: (value) => {
                      if (prop.required && !value) {
                        return `${name} は必須項目です`;
                      }
                      if (value && !validatePropertyValue(value, prop.type)) {
                        return `無効な ${prop.type} 形式です`;
                      }
                      return true;
                    },
                  });

                  if (!input && !prop.required) {
                    break;
                  }

                  value = convertPropertyValue(input, prop.type);
                  isValid = true;
                }
              }
            }

            if (value !== undefined) {
              propertyValues[name] = formatPropertyForUpdate(value, prop.type);
            }
          }

          // ページの作成
          outputHandler.debug('Property Values:', propertyValues);
          const response = await client.createDatabasePage(
            databaseId,
            propertyValues,
          );
          outputHandler.debug('API Response:', response);

          outputHandler.success('データベースページを作成しました');
        }, 'データベースページの作成に失敗しました');
      }),
  )
  .command(
    'get',
    new Command()
      .description('データベースページの情報を取得')
      .arguments('<database_page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .option('-j, --json', 'JSON形式で出力')
      .option('-o, --output <path:string>', '出力ファイルパス')
      .action(async (options, databasePageIdOrUrl) => {
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
          const page = await client.getPage(pageId) as PageObjectResponse;
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
                2,
              ),
              {
                output: options.output,
                json: true,
              },
            );
            return;
          }

          // プロパティとブロックのMarkdown形式での出力
          const propertiesMarkdown = Object.entries(page.properties)
            .map(([key, value]) =>
              `- ${key}: ${formatPropertyForDisplay(value)}`
            )
            .join('\n');

          const converter = new BlockToMarkdown();
          const blocksMarkdown = converter.convert(
            blocks.results.filter((block): block is BlockObjectResponse =>
              'type' in block
            ) as NotionBlocks[],
          );

          const output =
            `# プロパティ\n${propertiesMarkdown}\n\n# コンテンツ\n${blocksMarkdown}`;

          await outputHandler.handleOutput(output, {
            output: options.output,
          });
        }, 'ページ情報の取得に失敗しました');
      }),
  )
  .command(
    'update',
    new Command()
      .description('データベースページを更新')
      .arguments('<database_page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .action((options, _databasePageIdOrUrl) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        outputHandler.info('データベースページの更新機能は未実装です');
      }),
  )
  .command(
    'remove',
    new Command()
      .description('データベースページを削除')
      .arguments('<database_page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .option('-f, --force', '確認なしで削除')
      .action(async (options, databasePageIdOrUrl) => {
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
          const page = await client.getPage(pageId) as PageObjectResponse;
          outputHandler.debug('Page Info:', page);

          // タイトルの取得
          const title = Object.values(page.properties).find((prop) =>
            prop.type === 'title'
          )?.title?.[0]?.plain_text || 'Untitled';

          // 確認プロンプト（--forceオプションがない場合）
          if (!options.force) {
            const answer = await Confirm.prompt(
              `ページ「${title}」を削除しますか？`,
            );
            if (!answer) {
              outputHandler.info('削除をキャンセルしました');
              Deno.exit(0);
            }
          }

          // ページの削除
          await client.removePage(pageId);
          outputHandler.success(`ページ「${title}」を削除しました`);
        }, 'ページの削除に失敗しました');
      }),
  )
  .command(
    'create',
    new Command()
      .description('JSONファイルからデータベースページを作成')
      .arguments('<database_id_or_url:string> <json_file:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, databaseIdOrUrl, jsonFile) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();
        const pageResolver = await PageResolver.create();

        await errorHandler.withErrorHandling(async () => {
          const config = await Config.load();
          const client = new NotionClient(config);

          // データベースIDの解決
          const databaseId = await pageResolver.resolvePageId(databaseIdOrUrl);
          outputHandler.debug('Database ID:', databaseId);

          // JSONファイルの読み込み
          const jsonContent = await Deno.readTextFile(jsonFile);
          const data = JSON.parse(jsonContent);
          outputHandler.debug('JSON Data:', data);

          // データベース情報の取得（プロパティの検証用）
          const database = await client.getDatabase(databaseId);
          outputHandler.debug('Database Info:', database);

          // プロパティの変換
          const propertyValues: CreatePageParameters['properties'] = {};
          for (const [key, value] of Object.entries(data.properties)) {
            const propType = database.properties[key]?.type;
            if (!propType) {
              outputHandler.info(
                `警告: プロパティ "${key}" はデータベースに存在しません`,
              );
              continue;
            }

            try {
              propertyValues[key] = formatPropertyForUpdate(value, propType);
            } catch (error) {
              const errorMessage = error instanceof Error
                ? error.message
                : String(error);
              throw new Error(
                `プロパティ "${key}" の変換に失敗しました: ${errorMessage}`,
              );
            }
          }

          // ページの作成
          outputHandler.debug('Property Values:', propertyValues);
          const response = await client.createDatabasePage(
            databaseId,
            propertyValues,
          );
          outputHandler.debug('API Response:', response);

          outputHandler.success('データベースページを作成しました:');
          const output = [
            `ID: ${response.id}`,
            `URL: https://notion.so/${response.id.replace(/-/g, '')}`,
          ].join('\n');

          await outputHandler.handleOutput(output);
        }, 'データベースページの作成に失敗しました');
      }),
  );
