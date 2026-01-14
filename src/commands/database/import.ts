import { Command } from 'commander';
import Table from 'cli-table3';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { NotionImporter } from '../../lib/importer/notion-importer.js';
import { NotionImportConfig } from '../../lib/importer/notion-types.js';
import { DataMapping, ImportProgress } from '../../lib/importer/types.js';
import { Logger } from '../../lib/logger.js';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';

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

export const importCommand = new Command('import')
  .description('CSVファイルからNotionデータベースにデータをインポートします')
  .requiredOption('-f, --file <file>', 'インポートするCSVファイルのパス')
  .requiredOption(
    '-d, --database <database>',
    'インポート先のデータベース名またはID'
  )
  .option('--dry-run', '実際のインポートを行わずに検証のみを実行します', false)
  .option('--batch-size <size>', '一度にインポートするレコード数', '50')
  .option('--retry-count <count>', 'エラー時のリトライ回数', '3')
  .option('--retry-delay <delay>', 'リトライ間隔（ミリ秒）', '1000')
  .option('--skip-header', 'CSVのヘッダー行をスキップします', false)
  .option('--delimiter <char>', 'CSVの区切り文字', ',')
  .option(
    '--map-file <path>',
    'フィールドマッピング定義ファイルのパス（JSON形式）'
  )
  .action(async (options: ImportOptions) => {
    try {
      // 設定の読み込み
      const config = await Config.load();

      if (!config.token) {
        errorHandler.handleError(
          'NotionAPIトークンが設定されていません。`noti configure` を実行してください。',
          'setup'
        );
        return;
      }

      // CSVファイルの読み込み
      let csvContent: string;
      try {
        csvContent = await readFile(options.file, 'utf-8');
      } catch (error) {
        errorHandler.handleError(
          `CSVファイルの読み込みに失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'file-access'
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
          >
        );
        logger.info('データベーススキーマを取得しました');
      } catch (error) {
        errorHandler.handleError(
          `データベーススキーマの取得に失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'schema-fetch'
        );
        return;
      }

      // マッピング情報の読み込み
      let customMapping: DataMapping[] | undefined;
      if (options.mapFile) {
        try {
          const mapContent = await readFile(options.mapFile, 'utf-8');
          customMapping = JSON.parse(mapContent);
        } catch (error) {
          errorHandler.handleError(
            `マッピングファイルの読み込みに失敗しました: ${
              error instanceof Error ? error.message : String(error)
            }`,
            'mapping-file'
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
        batchSize:
          typeof options.batchSize === 'string'
            ? parseInt(options.batchSize, 10)
            : options.batchSize,
        skipHeader: options.skipHeader,
        delimiter: options.delimiter,
      };

      // 進捗表示用のコールバック
      const progressCallback = (progress: ImportProgress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        const phase = chalk.bold(progress.phase.toUpperCase());
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
        undefined // 標準のNotionClientを使用
      );

      // カスタムマッピングがある場合は設定
      if (customMapping) {
        importer.csvImporter.mapData(customMapping);
      }

      if (options.dryRun) {
        logger.info(chalk.bold.yellow('ドライランモードで実行します'));
      }

      // フィールドマッピングの検証と表示
      const mapping = await importer.generateMappingFromSchema();

      logger.info(chalk.bold('\nフィールドマッピング:'));
      const table = new Table({
        head: ['CSVフィールド', 'Notionプロパティ', 'データ型', '必須'],
      });

      for (const map of mapping) {
        table.push([
          map.sourceField,
          map.targetField,
          map.dataType,
          map.required ? '✓' : '',
        ]);
      }

      console.log(table.toString());

      // インポートの実行
      const result = await importer.import({
        dryRun: options.dryRun,
        progressCallback,
        retryCount:
          typeof options.retryCount === 'string'
            ? parseInt(options.retryCount, 10)
            : options.retryCount,
        retryDelay:
          typeof options.retryDelay === 'string'
            ? parseInt(options.retryDelay, 10)
            : options.retryDelay,
      });

      if (result.success) {
        logger.success(
          chalk.bold.green(
            `\nインポートが完了しました（${result.importedCount}件）`
          )
        );
      } else {
        logger.error(chalk.bold.red('\nインポートに失敗しました'));
        for (const error of result.errors) {
          logger.error(`- ${error}`);
        }
        process.exit(1);
      }
    } catch (_error) {
      errorHandler.handleError('エラーが発生しました', 'unknown');
      process.exit(1);
    }
  });
