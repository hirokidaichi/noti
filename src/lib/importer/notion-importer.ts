import { CSVImporter } from './csv-importer.ts';
import { NotionClient, NotionImportConfig } from './notion-types.ts';
import { Client } from '@notionhq/client';
import {
  DataMapping,
  ImportOptions,
  ImportProgress,
  ImportResult,
  ProgressCallback,
} from './types.ts';

export class NotionImporter {
  private csvImporter: CSVImporter;
  private notionClient: NotionClient;
  private config: NotionImportConfig;

  constructor(
    csvContent: string,
    notionApiKey: string,
    config: NotionImportConfig,
    notionClientClass?: new (apiKey: string) => NotionClient,
  ) {
    this.csvImporter = new CSVImporter(csvContent);
    this.notionClient = notionClientClass
      ? new notionClientClass(notionApiKey)
      : new Client({ auth: notionApiKey });
    this.config = config;
  }

  private reportProgress(
    callback: ProgressCallback | undefined,
    progress: ImportProgress,
  ) {
    if (callback) {
      callback(progress);
    }
  }

  generateMappingFromSchema(): Promise<DataMapping[]> {
    const schema = this.config.schema;
    if (!schema) {
      throw new Error('スキーマが設定されていません');
    }

    return Promise.resolve(
      Object.entries(schema.properties).map(([key, value]) => ({
        sourceField: key,
        targetField: key,
        required: false,
        dataType: this.mapNotionTypeToDataType(value.type),
      })),
    );
  }

  private mapNotionTypeToDataType(
    notionType: string,
  ): DataMapping['dataType'] {
    switch (notionType) {
      case 'number':
        return 'number';
      case 'checkbox':
        return 'boolean';
      case 'date':
        return 'date';
      case 'multi_select':
        return 'array';
      default:
        return 'string';
    }
  }

  async import(options?: ImportOptions): Promise<ImportResult> {
    try {
      const progressCallback = options?.progressCallback;

      // マッピングの生成と設定
      this.reportProgress(progressCallback, {
        phase: 'mapping',
        current: 0,
        total: 1,
        message: 'マッピングの生成中',
      });

      const mapping = await this.generateMappingFromSchema();
      await this.csvImporter.mapData(mapping);

      this.reportProgress(progressCallback, {
        phase: 'mapping',
        current: 1,
        total: 1,
        message: 'マッピングの生成完了',
      });

      // データの検証
      const validationResult = await this.csvImporter.validate(
        progressCallback,
      );
      if (!validationResult.isValid) {
        return {
          success: false,
          importedCount: 0,
          errors: validationResult.errors,
        };
      }

      // データの変換とインポート
      const importResult = await this.csvImporter.import({
        ...options,
        progressCallback,
      });
      if (!importResult.success || !importResult.data) {
        return importResult;
      }

      // ドライランモードの場合はここで終了
      if (options?.dryRun) {
        return importResult;
      }

      // Notionへのインポート
      const totalPages = importResult.data.length;
      const batchSize = this.config.batchSize || 100;
      let importedCount = 0;

      for (let i = 0; i < importResult.data.length; i += batchSize) {
        const batch = importResult.data.slice(i, i + batchSize);

        this.reportProgress(progressCallback, {
          phase: 'import',
          current: importedCount,
          total: totalPages,
          message:
            `Notionへのインポート中: ${importedCount}/${totalPages}ページ`,
        });

        await this.notionClient.createPages(
          this.config.databaseId,
          batch,
        );

        importedCount += batch.length;
      }

      this.reportProgress(progressCallback, {
        phase: 'import',
        current: totalPages,
        total: totalPages,
        message: 'インポート完了',
      });

      return {
        success: true,
        importedCount: importResult.data.length,
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : '不明なエラーが発生しました';
      return {
        success: false,
        importedCount: 0,
        errors: [
          `Notionへのインポート中にエラーが発生しました: ${errorMessage}`,
        ],
      };
    }
  }
}
