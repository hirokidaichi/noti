import { Command } from '@cliffy/command';
import { Checkbox, Confirm, Input, Select } from '@cliffy/prompt';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { Logger } from '../lib/logger.ts';
import { NotionPageId } from '../lib/notion/page-uri.ts';
import { AliasManager } from '../lib/config/aliases.ts';
import type {
  BlockObjectResponse,
  CreatePageParameters,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import { BlockToMarkdown } from '../lib/converter/block-to-markdown.ts';
import type { NotionBlocks } from '../lib/converter/types.ts';

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
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // データベースIDの解決
          const aliasManager = await AliasManager.load();
          const resolvedId = aliasManager.get(databaseIdOrUrl) ||
            databaseIdOrUrl;
          const databaseId = NotionPageId.fromString(resolvedId)?.toShortId();

          if (!databaseId) {
            throw new Error('無効なデータベースIDまたはURLです');
          }

          // データベース情報の取得
          const database = await client.getDatabase(databaseId);
          logger.debug('Database Info:', database);

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
          logger.debug('Property Values:', propertyValues);
          const response = await client.createDatabasePage(
            databaseId,
            propertyValues,
          );
          logger.debug('API Response:', response);

          logger.success('データベースページを作成しました');
        } catch (error) {
          logger.error('データベースページの作成に失敗しました:', error);
          Deno.exit(1);
        }
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
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの解決
          const aliasManager = await AliasManager.load();
          const resolvedId = aliasManager.get(databasePageIdOrUrl) ||
            databasePageIdOrUrl;
          const pageId = NotionPageId.fromString(resolvedId)?.toShortId();

          if (!pageId) {
            throw new Error('無効なページIDまたはURLです');
          }

          // ページ情報の取得
          const page = await client.getPage(pageId) as PageObjectResponse;
          logger.debug('Page Info:', page);

          // ブロックの取得
          const blocks = await client.getBlocks(pageId);
          logger.debug('Blocks:', blocks);

          if (options.json) {
            // JSON形式での出力
            const output = JSON.stringify(
              {
                page,
                blocks: blocks.results,
              },
              null,
              2,
            );

            if (options.output) {
              await Deno.writeTextFile(options.output, output);
              logger.success(`ページ情報を${options.output}に保存しました`);
            } else {
              console.log(output);
            }
            return;
          }

          // プロパティの出力
          console.log('# プロパティ');
          for (const [key, value] of Object.entries(page.properties)) {
            const displayValue = formatPropertyForDisplay(value);
            console.log(`- ${key}: ${displayValue}`);
          }

          // ブロックの出力
          console.log('\n# コンテンツ');
          const converter = new BlockToMarkdown();
          const markdown = converter.convert(
            blocks.results.filter((block): block is BlockObjectResponse =>
              'type' in block
            ) as NotionBlocks[],
          );
          console.log(markdown);

          if (options.output) {
            const output = `# プロパティ\n${
              Object.entries(page.properties)
                .map(([key, value]) =>
                  `- ${key}: ${formatPropertyForDisplay(value)}`
                )
                .join('\n')
            }\n\n# コンテンツ\n${markdown}`;

            await Deno.writeTextFile(options.output, output);
            logger.success(`ページ情報を${options.output}に保存しました`);
          }
        } catch (error) {
          logger.error('ページ情報の取得に失敗しました:', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'update',
    new Command()
      .description('データベースページを更新')
      .arguments('<database_page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .action((options, _databasePageIdOrUrl) => {
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);
        logger.info('データベースページの更新機能は未実装です');
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
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // ページIDの解決
          const aliasManager = await AliasManager.load();
          const resolvedId = aliasManager.get(databasePageIdOrUrl) ||
            databasePageIdOrUrl;
          const pageId = NotionPageId.fromString(resolvedId)?.toShortId();

          if (!pageId) {
            throw new Error('無効なページIDまたはURLです');
          }

          // ページ情報の取得
          const page = await client.getPage(pageId) as PageObjectResponse;
          logger.debug('Page Info:', page);

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
              logger.info('削除をキャンセルしました');
              Deno.exit(0);
            }
          }

          // ページの削除
          await client.removePage(pageId);

          // エイリアスの削除（もし存在する場合）
          const alias = Object.entries(aliasManager.getAll()).find((
            [_, value],
          ) => value === databasePageIdOrUrl)?.[0];
          if (alias) {
            aliasManager.remove(alias);
            await aliasManager.update();
            logger.info(`エイリアス "${alias}" を削除しました`);
          }

          logger.success(`ページ「${title}」を削除しました`);
        } catch (error) {
          logger.error('ページの削除に失敗しました:', error);
          Deno.exit(1);
        }
      }),
  )
  .command(
    'create',
    new Command()
      .description('JSONファイルからデータベースページを作成')
      .arguments('<database_id_or_url:string> <json_file:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, databaseIdOrUrl, jsonFile) => {
        const config = await Config.load();
        const client = new NotionClient(config);
        const logger = Logger.getInstance();
        logger.setDebugMode(!!options.debug);

        try {
          // データベースIDの解決
          const aliasManager = await AliasManager.load();
          const resolvedId = aliasManager.get(databaseIdOrUrl) ||
            databaseIdOrUrl;
          const databaseId = NotionPageId.fromString(resolvedId)?.toShortId();

          if (!databaseId) {
            throw new Error('無効なデータベースIDまたはURLです');
          }

          // JSONファイルの読み込み
          const jsonContent = await Deno.readTextFile(jsonFile);
          const data = JSON.parse(jsonContent);

          // データベース情報の取得（プロパティの検証用）
          const database = await client.getDatabase(databaseId);
          logger.debug('Database Info:', database);

          // プロパティの変換
          const propertyValues: CreatePageParameters['properties'] = {};
          for (const [key, value] of Object.entries(data.properties)) {
            const propType = database.properties[key]?.type;
            if (!propType) {
              logger.info(
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
              logger.error(
                `プロパティ "${key}" の変換に失敗しました: ${errorMessage}`,
              );
              throw error;
            }
          }

          // ページの作成
          logger.debug('Property Values:', propertyValues);
          const response = await client.createDatabasePage(
            databaseId,
            propertyValues,
          );
          logger.debug('API Response:', response);

          logger.success('データベースページを作成しました:');
          console.log(`ID: ${response.id}`);
          console.log(
            `URL: https://notion.so/${response.id.replace(/-/g, '')}`,
          );
        } catch (error) {
          logger.error('データベースページの作成に失敗しました:', error);
          Deno.exit(1);
        }
      }),
  );
