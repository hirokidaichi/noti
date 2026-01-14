import { parse as parseCSV } from '@std/csv';
import {
  DataImporter,
  DataMapping,
  DataType,
  ImportOptions,
  ImportProgress,
  ImportResult,
  MappingValidationError,
  MappingValidationResult,
  ProgressCallback,
  ValidationResult,
  ValidationRule,
} from './types.ts';

export class CSVImporter implements DataImporter {
  private data: string[][];
  private mapping: DataMapping[] = [];
  private skipHeader: boolean;
  private hasCustomHeaders = false;

  constructor(csvContent: string, options?: {
    skipHeader?: boolean;
    delimiter?: string;
  }) {
    this.skipHeader = options?.skipHeader || false;

    // Note: 区切り文字カスタマイズ機能は一時的に無効化
    // options?.delimiter は将来のバージョンで対応

    this.data = parseCSV(csvContent) as string[][];
  }

  private reportProgress(
    callback: ProgressCallback | undefined,
    progress: ImportProgress,
  ) {
    if (callback) {
      callback(progress);
    }
  }

  getHeaders(): string[] {
    if (this.data.length === 0) return [];

    // ヘッダーをスキップする場合は、最初の行の列数に基づいて生成したヘッダーを返す
    if (this.skipHeader && !this.hasCustomHeaders) {
      const firstRow = this.data[0];
      return firstRow.map((_, index) => `column${index + 1}`);
    }

    return this.data[0];
  }

  getData(): Record<string, unknown>[] {
    if (this.data.length === 0) return [];

    // スキップヘッダーが有効な場合は最初の行からデータを開始
    const startIndex = this.skipHeader ? 0 : 1;

    // データが不足している場合
    if (this.data.length <= startIndex && !this.skipHeader) return [];

    const headers = this.getHeaders();
    return this.data.slice(startIndex).map((row) => {
      return headers.reduce((obj, header, index) => {
        obj[header] = index < row.length ? row[index] : '';
        return obj;
      }, {} as Record<string, unknown>);
    });
  }

  generateDefaultMapping(): DataMapping[] {
    const headers = this.getHeaders();
    return headers.map((header) => ({
      sourceField: header,
      targetField: header,
      required: false,
      dataType: 'string',
    }));
  }

  private validateValue(value: unknown, rules: ValidationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      if (
        rule.required && (value === null || value === undefined || value === '')
      ) {
        errors.push(rule.message || '必須項目です');
        continue;
      }

      if (value === null || value === undefined || value === '') {
        continue;
      }

      if (rule.type) {
        const valueType = this.getValueType(value);
        if (valueType !== rule.type) {
          errors.push(rule.message || `${rule.type}型である必要があります`);
          continue;
        }
      }

      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(
            rule.message || `${rule.minLength}文字以上である必要があります`,
          );
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(
            rule.message || `${rule.maxLength}文字以下である必要があります`,
          );
        }
        if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
          errors.push(rule.message || '形式が正しくありません');
        }
      }

      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(rule.message || `${rule.min}以上である必要があります`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(rule.message || `${rule.max}以下である必要があります`);
        }
      }

      if (rule.custom && !rule.custom(value)) {
        errors.push(rule.message || 'カスタムバリデーションエラー');
      }
    }

    return errors;
  }

  private getValueType(value: unknown): DataType {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number' && !isNaN(value)) return 'number';
    return 'string';
  }

  validateDataTypes(
    _data: Record<string, unknown>[],
    _mapping: DataMapping[],
  ): ValidationResult {
    const errors: string[] = [];
    const totalRows = this.data.length - 1;
    const data = this.getData();

    for (let i = 0; i < data.length; i++) {
      this.reportProgress(undefined, {
        phase: 'validation',
        current: i + 1,
        total: totalRows,
        message: `データ型の検証中: ${i + 1}/${totalRows}行目`,
      });

      const row = data[i];
      for (const map of this.mapping) {
        const value = row[map.sourceField];
        if (map.rules) {
          const validationErrors = this.validateValue(value, map.rules);
          if (validationErrors.length > 0) {
            errors.push(
              `行${i + 2} - ${map.sourceField}: ${validationErrors.join(', ')}`,
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateMapping(): MappingValidationResult {
    const errors: MappingValidationError[] = [];
    const headers = this.getHeaders();

    // マッピングが設定されているかチェック
    if (this.mapping.length === 0) {
      return {
        isValid: false,
        errors: [{
          field: '*',
          message: 'マッピングが設定されていません',
        }],
      };
    }

    // 各マッピングの検証
    for (const map of this.mapping) {
      // ソースフィールドの存在チェック
      if (!headers.includes(map.sourceField)) {
        errors.push({
          field: map.sourceField,
          message:
            `ソースフィールド "${map.sourceField}" がCSVヘッダーに存在しません`,
        });
      }

      // ターゲットフィールドの設定チェック
      if (!map.targetField) {
        errors.push({
          field: map.sourceField,
          message: 'ターゲットフィールドが設定されていません',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validate(
    progressCallback?: ProgressCallback,
  ): ValidationResult {
    this.reportProgress(progressCallback, {
      phase: 'validation',
      current: 0,
      total: 3,
      message: 'CSVファイルの基本検証中',
    });

    if (this.data.length === 0) {
      return {
        isValid: false,
        errors: ['CSVファイルが空です'],
      };
    }

    this.reportProgress(progressCallback, {
      phase: 'validation',
      current: 1,
      total: 3,
      message: 'ヘッダーの検証中',
    });

    // ヘッダー行の存在確認
    const headers = this.getHeaders();
    if (headers.length === 0) {
      return {
        isValid: false,
        errors: ['CSVファイルにヘッダーが存在しません'],
      };
    }

    // ヘッダースキップモードでカスタムヘッダーが設定されていない場合は警告
    if (this.skipHeader && !this.hasCustomHeaders) {
      // エラーではなく続行可能な警告
      console.warn(
        'ヘッダースキップモードでマッピングが設定されていません。自動生成されたフィールド名を使用します。',
      );
    }

    this.reportProgress(progressCallback, {
      phase: 'validation',
      current: 2,
      total: 3,
      message: 'マッピングの検証中',
    });

    // マッピングの検証
    const mappingValidation = this.validateMapping();
    if (!mappingValidation.isValid) {
      return {
        isValid: false,
        errors: mappingValidation.errors.map((e) => `${e.field}: ${e.message}`),
      };
    }

    // データ型の検証
    const dataTypeValidation = this.validateDataTypes(
      this.getData(),
      this.mapping,
    );
    if (!dataTypeValidation.isValid) {
      return dataTypeValidation;
    }

    this.reportProgress(progressCallback, {
      phase: 'validation',
      current: 3,
      total: 3,
      message: '検証完了',
    });

    return {
      isValid: true,
      errors: [],
    };
  }

  mapData(mapping: DataMapping[]): void {
    this.mapping = mapping;
    // マッピングが設定された場合、カスタムヘッダーが使用されていると判断
    this.hasCustomHeaders = mapping.length > 0;
  }

  private transformRow(row: string[]): Record<string, unknown> {
    const headers = this.getHeaders();
    const result: Record<string, unknown> = {};

    for (const map of this.mapping) {
      const sourceIndex = headers.indexOf(map.sourceField);
      if (sourceIndex === -1) continue;

      let value: unknown = row[sourceIndex];

      // トランスフォーマーの適用
      if (map.transformer) {
        try {
          value = map.transformer(value);
        } catch (error) {
          console.error(`トランスフォーム中にエラーが発生しました: ${error}`);
          value = null;
        }
      }

      // データ型の変換
      if (map.dataType) {
        value = this.convertToType(value, map.dataType);
      }

      // バリデーションの実行
      if (map.validate && !map.validate(value)) {
        value = null;
      }

      result[map.targetField] = value;
    }

    return result;
  }

  private convertToType(value: unknown, type: DataType): unknown {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (type) {
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? null : num;
      }
      case 'boolean':
        return String(value).toLowerCase() === 'true';
      case 'date': {
        const date = new Date(String(value));
        return isNaN(date.getTime()) ? null : date;
      }
      case 'array':
        return String(value).split(',').map((v) => v.trim());
      case 'object':
        try {
          return JSON.parse(String(value));
        } catch {
          return null;
        }
      default:
        return String(value);
    }
  }

  import(options?: ImportOptions): ImportResult {
    try {
      const progressCallback = options?.progressCallback;

      // データの検証
      this.reportProgress(progressCallback, {
        phase: 'validation',
        current: 0,
        total: 1,
        message: 'データの検証中',
      });

      const validationResult = this.validate(progressCallback);
      if (!validationResult.isValid) {
        return {
          success: false,
          importedCount: 0,
          errors: validationResult.errors,
        };
      }

      // データの変換
      const totalRows = this.data.length - 1;
      const transformedData: Record<string, unknown>[] = [];

      for (let i = 0; i < totalRows; i++) {
        this.reportProgress(progressCallback, {
          phase: 'transformation',
          current: i,
          total: totalRows,
          message: `データの変換中: ${i + 1}/${totalRows}行目`,
        });

        const row = this.data[i + 1];
        const transformed = this.transformRow(row);
        transformedData.push(transformed);
      }

      this.reportProgress(progressCallback, {
        phase: 'transformation',
        current: totalRows,
        total: totalRows,
        message: 'データの変換完了',
      });

      // ドライランモードの場合はここで終了
      if (options?.dryRun) {
        return {
          success: true,
          importedCount: transformedData.length,
          errors: [],
          data: transformedData,
        };
      }

      return {
        success: true,
        importedCount: transformedData.length,
        errors: [],
        data: transformedData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : '不明なエラーが発生しました';
      return {
        success: false,
        importedCount: 0,
        errors: [`インポート中にエラーが発生しました: ${errorMessage}`],
      };
    }
  }
}
