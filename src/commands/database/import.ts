import { Command } from '@cliffy/command';
import { Table } from '@cliffy/table';
import { NotionImporter } from '../../lib/importer/notion-importer.ts';
import { NotionImportConfig } from '../../lib/importer/notion-types.ts';
import { DataMapping, ImportProgress } from '../../lib/importer/types.ts';
import { Logger } from '../../lib/logger.ts';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import { bold, green, red, yellow } from '@std/fmt/colors';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';

const logger = Logger.getInstance();
const errorHandler = new ErrorHandler('database-import');

interface ImportOptions {
  file: string;
  database: string;
  dryRun: boolean;
  batchSize: number;
  retryCount: number;
  retryDelay: number;
  skipHeader: boolean;
  delimiter: string;
  mapFile?: string;
}

export const importCommand = new Command()
  .name('import')
  .description('CSVファイルからNotionデータベースにデータをインポートします')
  .option('-f, --file <file:string>', 'インポートするCSVファイルのパス', {
    required: true,
  })
  .option(
    '-d, --database <database:string>',
    'インポート先のデータベース名またはID',
    {
      required: true,
    },
  )
  .option('--dry-run', '実際のインポートを行わずに検証のみを実行します', {
    default: false,
  })
  .option('--batch-size <size:number>', '一度にインポートするレコード数', {
    default: 50,
  })
  .option('--retry-count <count:number>', 'エラー時のリトライ回数', {
    default: 3,
  })
  .option('--retry-delay <delay:number>', 'リトライ間隔（ミリ秒）', {
    default: 1000,
  })
  .option('--skip-header', 'CSVのヘッダー行をスキップします', {
    default: false,
  })
  .option('--delimiter <char:string>', 'CSVの区切り文字', {
    default: ',',
  })
  .option(
    '--map-file <path:string>',
    'フィールドマッピング定義ファイルのパス（JSON形式）',
  )
  .action(async (options: ImportOptions) => {
    try {
      // 設定の読み込み
      const config = await Config.load();

      if (!config.token) {
        errorHandler.handleError(
          'NotionAPIトークンが設定されていません。`noti configure` を実行してください。',
          'setup',
        );
        return;
      }

      // CSVファイルの読み込み
      let csvContent: string;
      try {
        csvContent = await Deno.readTextFile(options.file);
      } catch (error) {
        errorHandler.handleError(
          `CSVファイルの読み込みに失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'file-access',
        );
        return;
      }

      // データベースIDを直接使用
      const databaseId = options.database;
      logger.info(`データベースID: ${databaseId}を使用します`);

      // データベースのスキーマを取得
      const notionClient = new NotionClient(config);
      logger.info('データベーススキーマを取得中...');

      let databaseSchema: Record<
        string,
        { type: string; name?: string; required?: boolean }
      >;
      try {
        const database = await notionClient.getDatabase(databaseId);
        databaseSchema = Object.entries(database.properties).reduce(
          (acc, [key, property]) => {
            // @ts-ignore - Notionの型定義が複雑なため
            acc[key] = {
              type: property.type,
              name: key.toLowerCase(),
              required: key === 'Name', // タイトルプロパティは必須
            };
            return acc;
          },
          {} as Record<
            string,
            { type: string; name?: string; required?: boolean }
          >,
        );
        logger.info('データベーススキーマを取得しました');
      } catch (error) {
        errorHandler.handleError(
          `データベーススキーマの取得に失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'schema-fetch',
        );
        return;
      }

      // マッピング情報の読み込み
      let customMapping: DataMapping[] | undefined;
      if (options.mapFile) {
        try {
          const mapContent = await Deno.readTextFile(options.mapFile);
          customMapping = JSON.parse(mapContent);
        } catch (error) {
          errorHandler.handleError(
            `マッピングファイルの読み込みに失敗しました: ${
              error instanceof Error ? error.message : String(error)
            }`,
            'mapping-file',
          );
          return;
        }
      }

      // インポート設定
      const importConfig: NotionImportConfig = {
        databaseId,
        schema: {
          properties: databaseSchema,
        },
        batchSize: options.batchSize,
        skipHeader: options.skipHeader,
        delimiter: options.delimiter,
      };

      // 進捗表示用のコールバック
      const progressCallback = (progress: ImportProgress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        const phase = bold(progress.phase.toUpperCase());
        const message = progress.message || '';

        // プログレスバーの作成
        const width = 30;
        const filled = Math.round((progress.current / progress.total) * width);
        const bar = '█'.repeat(filled) + '░'.repeat(width - filled);

        logger.info(`${phase} ${bar} ${percent}% ${message}`);
      };

      // インポーターの作成
      const importer = new NotionImporter(
        csvContent,
        config.token,
        importConfig,
        undefined, // 標準のNotionClientを使用
      );

      // カスタムマッピングがある場合は設定
      if (customMapping) {
        importer.csvImporter.mapData(customMapping);
      }

      if (options.dryRun) {
        logger.info(bold(yellow('ドライランモードで実行します')));
      }

      // フィールドマッピングの検証と表示
      const mapping = await importer.generateMappingFromSchema();

      logger.info(bold('\nフィールドマッピング:'));
      new Table()
        .header(['CSVフィールド', 'Notionプロパティ', 'データ型', '必須'])
        .body(
          mapping.map((map) => [
            map.sourceField,
            map.targetField,
            map.dataType,
            map.required ? '✓' : '',
          ]),
        )
        .border(true)
        .render();

      // インポートの実行
      const result = await importer.import({
        dryRun: options.dryRun,
        progressCallback,
        retryCount: options.retryCount,
        retryDelay: options.retryDelay,
      });

      if (result.success) {
        logger.success(
          bold(
            green(`\nインポートが完了しました（${result.importedCount}件）`),
          ),
        );
      } else {
        logger.error(bold(red('\nインポートに失敗しました')));
        for (const error of result.errors) {
          logger.error(`- ${error}`);
        }
        Deno.exit(1);
      }
    } catch (_error) {
      errorHandler.handleError('エラーが発生しました', 'unknown');
      Deno.exit(1);
    }
  });
