import { Command } from '@cliffy/command';
import { Confirm, Input, Select } from '@cliffy/prompt';
import { bold, green, yellow } from '@std/fmt/colors';
import { Logger } from '../../lib/logger.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { Table } from '@cliffy/table';

const logger = Logger.getInstance();
const errorHandler = new ErrorHandler('database-creation');

// プロパティタイプの選択肢
const PROPERTY_TYPES = [
  { name: 'テキスト', value: 'rich_text' },
  { name: 'タイトル', value: 'title' },
  { name: '数値', value: 'number' },
  { name: 'セレクト', value: 'select' },
  { name: 'マルチセレクト', value: 'multi_select' },
  { name: '日付', value: 'date' },
  { name: 'チェックボックス', value: 'checkbox' },
  { name: 'URL', value: 'url' },
  { name: 'メール', value: 'email' },
  { name: '電話番号', value: 'phone_number' },
];

interface PropertyDefinition {
  name: string;
  type: string;
  options?: string[]; // セレクトタイプ用のオプション
  required?: boolean;
}

interface DatabaseCreateOptions {
  title?: string;
  parent?: string;
}

// Notionプロパティ設定の生成
function generatePropertyConfig(properties: PropertyDefinition[]) {
  const propertyConfig: Record<string, unknown> = {};

  for (const prop of properties) {
    switch (prop.type) {
      case 'title':
        propertyConfig[prop.name] = { title: {} };
        break;
      case 'rich_text':
        propertyConfig[prop.name] = { rich_text: {} };
        break;
      case 'number':
        propertyConfig[prop.name] = { number: {} };
        break;
      case 'select':
        propertyConfig[prop.name] = {
          select: {
            options: prop.options?.map((option) => ({ name: option })) || [],
          },
        };
        break;
      case 'multi_select':
        propertyConfig[prop.name] = {
          multi_select: {
            options: prop.options?.map((option) => ({ name: option })) || [],
          },
        };
        break;
      case 'date':
        propertyConfig[prop.name] = { date: {} };
        break;
      case 'checkbox':
        propertyConfig[prop.name] = { checkbox: {} };
        break;
      case 'url':
        propertyConfig[prop.name] = { url: {} };
        break;
      case 'email':
        propertyConfig[prop.name] = { email: {} };
        break;
      case 'phone_number':
        propertyConfig[prop.name] = { phone_number: {} };
        break;
      default:
        propertyConfig[prop.name] = { rich_text: {} };
    }
  }

  return propertyConfig;
}

// プロパティの編集ウィザード
async function propertyWizard(): Promise<PropertyDefinition> {
  const name = await Input.prompt({
    message: 'プロパティ名を入力してください:',
    validate: (value) => {
      if (!value) return 'プロパティ名は必須です';
      if (value === 'Name' && !isFirstProperty) {
        return 'Nameはすでに存在するか、タイトルプロパティとして予約されています';
      }
      return true;
    },
  });

  const typeChoice = await Select.prompt({
    message: 'プロパティタイプを選択してください:',
    options: isFirstProperty
      ? [{ name: 'タイトル (必須)', value: 'title' }]
      : PROPERTY_TYPES,
  });

  let options: string[] = [];
  if (typeChoice === 'select' || typeChoice === 'multi_select') {
    // オプションのカンマ区切り入力
    const optionsInput = await Input.prompt({
      message: 'オプション値をカンマ区切りで入力してください:',
      default: '',
    });
    if (optionsInput) {
      options = optionsInput.split(',').map((opt) => opt.trim());
    }
  }

  const required = await Confirm.prompt({
    message: 'このプロパティは必須ですか?',
    default: typeChoice === 'title',
  });

  return {
    name,
    type: typeChoice,
    options,
    required,
  };
}

// 最初のプロパティかどうかのフラグ
let isFirstProperty = true;

export const createCommand = new Command()
  .name('create')
  .description('インタラクティブにNotionデータベースを作成します')
  .option('--title <title:string>', 'データベースのタイトル')
  .option(
    '--parent <parent:string>',
    '親ページID（デフォルトはワークスペースのルート）',
  )
  .action(async (options: DatabaseCreateOptions) => {
    try {
      // 設定の読み込み
      const config = await Config.load();

      if (!config.token) {
        errorHandler.handleError(
          'NotionAPIトークンが設定されていません。`noti configure` を実行してください。',
        );
        return;
      }

      const notionClient = new NotionClient(config);

      // タイトルの入力
      const title = options.title || await Input.prompt({
        message: 'データベースのタイトルを入力してください:',
        validate: (value) => value ? true : 'タイトルは必須です',
      });

      // 親ページIDの入力 (オプション)
      let parentId = options.parent;
      if (!parentId) {
        const useParentPage = await Confirm.prompt({
          message: '特定のページ内にデータベースを作成しますか?',
          default: false,
        });

        if (useParentPage) {
          parentId = await Input.prompt({
            message: '親ページIDを入力してください:',
            validate: (value) => value ? true : '親ページIDは必須です',
          });
        }
      }

      // プロパティの定義
      const properties: PropertyDefinition[] = [];
      isFirstProperty = true;

      // まずタイトルプロパティを追加 (必須)
      logger.info(bold(yellow('\nタイトルプロパティの設定 (必須)')));
      properties.push(await propertyWizard());
      isFirstProperty = false;

      // 追加のプロパティ
      let addMore = true;
      while (addMore) {
        logger.info(bold(yellow('\n追加プロパティの設定')));
        properties.push(await propertyWizard());

        addMore = await Confirm.prompt({
          message: '別のプロパティを追加しますか?',
          default: true,
        });
      }

      // プロパティ定義の表示
      logger.info(bold('\nデータベース定義のプレビュー:'));
      logger.info(bold(`タイトル: ${title}`));
      logger.info(bold('プロパティ:'));

      new Table()
        .header(['名前', 'タイプ', 'オプション', '必須'])
        .body(
          properties.map((prop) => [
            prop.name,
            prop.type,
            prop.options?.join(', ') || '',
            prop.required ? '✓' : '',
          ]),
        )
        .border(true)
        .render();

      // 確認
      const confirm = await Confirm.prompt({
        message: 'このデータベースを作成しますか?',
        default: true,
      });

      if (!confirm) {
        logger.info('データベース作成をキャンセルしました。');
        return;
      }

      // データベース作成
      logger.info('データベースを作成中...');

      try {
        const propertyConfig = generatePropertyConfig(properties);

        if (!parentId) {
          logger.error(
            '親ページIDが必要です。--parent オプションで指定してください。',
          );
          return;
        }

        // deno-lint-ignore no-explicit-any
        const response = await notionClient.createDatabase({
          parent: { page_id: parentId },
          title: [{ text: { content: title } }],
          properties: propertyConfig as any,
        });

        logger.success('データベースを作成しました');

        logger.success(bold(green('\nデータベースが正常に作成されました！')));
        logger.info(`データベースID: ${response.id}`);
        logger.info(`データベース名: ${title}`);

        // 作成されたデータベースへのリンク表示
        if ('url' in response) {
          logger.info(`URL: ${response.url}`);
        }
      } catch (error) {
        logger.error('データベースの作成に失敗しました');
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        errorHandler.handleError(
          `データベースの作成中にエラーが発生しました: ${errorMessage}`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      errorHandler.handleError(`予期せぬエラーが発生しました: ${errorMessage}`);
    }
  });
