import { Command } from '@cliffy/command';
import { NotionImporter } from '../../lib/importer/notion-importer.ts';
import { NotionImportConfig } from '../../lib/importer/notion-types.ts';
import { ImportProgress } from '../../lib/importer/types.ts';
import { Logger } from '../../lib/logger.ts';
import { colors } from '../../deps.ts';

const logger = new Logger();

interface ImportOptions {
  file: string;
  database: string;
  dryRun: boolean;
  batchSize: number;
  retryCount: number;
  retryDelay: number;
}

export const importCommand = new Command()
  .name('import')
  .description('CSVファイルからNotionデータベースにデータをインポートします')
  .option('-f, --file <file:string>', 'インポートするCSVファイルのパス', {
    required: true,
  })
  .option('-d, --database <database:string>', 'インポート先のデータベースID', {
    required: true,
  })
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
  .action(async (options: ImportOptions) => {
    try {
      // CSVファイルの読み込み
      const csvContent = await Deno.readTextFile(options.file);

      // データベースのスキーマを取得
      // TODO: 実際のデータベースからスキーマを取得する
      const config: NotionImportConfig = {
        databaseId: options.database,
        schema: {
          properties: {
            Name: { type: 'title', name: 'name' },
            Age: { type: 'number', name: 'age', required: true },
            Email: { type: 'email', name: 'email' },
            Tags: { type: 'multi_select', name: 'tags' },
          },
        },
        batchSize: options.batchSize,
      };

      // 進捗表示用のコールバック
      const progressCallback = (progress: ImportProgress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        const phase = colors.bold(progress.phase.toUpperCase());
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
        Deno.env.get('NOTION_API_KEY') || '',
        config,
      );

      if (options.dryRun) {
        logger.info('ドライランモードで実行します');
      }

      // インポートの実行
      const result = await importer.import({
        dryRun: options.dryRun,
        progressCallback,
        retryCount: options.retryCount,
        retryDelay: options.retryDelay,
      });

      if (result.success) {
        logger.success(
          `インポートが完了しました（${result.importedCount}件）`,
        );
      } else {
        logger.error('インポートに失敗しました');
        for (const error of result.errors) {
          logger.error(`- ${error}`);
        }
        Deno.exit(1);
      }
    } catch (error) {
      logger.error('エラーが発生しました:', error);
      Deno.exit(1);
    }
  });
