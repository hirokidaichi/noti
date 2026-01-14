import { describe, it, expect } from 'vitest';
import { CSVImporter } from './csv-importer.js';
import { DataMapping } from './types.js';

describe('CSVImporter', () => {
  it('空のCSVファイルの検証', () => {
    const importer = new CSVImporter('');
    const result = importer.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toBe('CSVファイルが空です');
  });

  it('有効なCSVファイルの検証', () => {
    const csvContent = 'name,age\nJohn,30\nJane,25';
    const importer = new CSVImporter(csvContent);
    const mapping = importer.generateDefaultMapping();
    importer.mapData(mapping);
    const result = importer.validate();
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('ヘッダー取得', () => {
    const csvContent = 'name,age,email\nJohn,30,john@example.com';
    const importer = new CSVImporter(csvContent);
    const headers = importer.getHeaders();
    expect(headers).toEqual(['name', 'age', 'email']);
  });

  it('デフォルトマッピング生成', () => {
    const csvContent = 'name,age,email\nJohn,30,john@example.com';
    const importer = new CSVImporter(csvContent);
    const mapping = importer.generateDefaultMapping();
    expect(mapping).toEqual([
      {
        sourceField: 'name',
        targetField: 'name',
        required: false,
        dataType: 'string',
      },
      {
        sourceField: 'age',
        targetField: 'age',
        required: false,
        dataType: 'string',
      },
      {
        sourceField: 'email',
        targetField: 'email',
        required: false,
        dataType: 'string',
      },
    ]);
  });

  it('マッピングバリデーション - 無効なソースフィールド', () => {
    const csvContent = 'name,age\nJohn,30';
    const importer = new CSVImporter(csvContent);
    const mapping: DataMapping[] = [
      { sourceField: 'invalid', targetField: 'name' },
    ];
    importer.mapData(mapping);
    const result = importer.validateMapping();
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('invalid');
    expect(result.errors[0].message).toBe(
      'ソースフィールド "invalid" がCSVヘッダーに存在しません'
    );
  });

  it('データ型バリデーション - 数値型', () => {
    const csvContent = 'name,age\nJohn,30\nJane,invalid';
    const importer = new CSVImporter(csvContent);
    const mapping: DataMapping[] = [
      { sourceField: 'name', targetField: 'fullName' },
      {
        sourceField: 'age',
        targetField: 'userAge',
        dataType: 'number',
        rules: [
          {
            type: 'number',
            min: 0,
            max: 150,
            message: '年齢は0から150の間である必要があります',
          },
        ],
      },
    ];
    importer.mapData(mapping);
    const result = importer.validateDataTypes(importer.getData(), mapping);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).not.toBe(0);
  });

  it('必須項目バリデーション', () => {
    const csvContent = 'name,age\nJohn,\nJane,25';
    const importer = new CSVImporter(csvContent);
    const mapping: DataMapping[] = [
      { sourceField: 'name', targetField: 'fullName' },
      {
        sourceField: 'age',
        targetField: 'userAge',
        rules: [
          {
            required: true,
            message: '年齢は必須項目です',
          },
        ],
      },
    ];
    importer.mapData(mapping);
    const result = importer.validateDataTypes(importer.getData(), mapping);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].includes('年齢は必須項目です')).toBe(true);
  });

  it('カスタムバリデーション', () => {
    const csvContent = 'email\ntest@example.com\ninvalid-email';
    const importer = new CSVImporter(csvContent);
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const mapping: DataMapping[] = [
      {
        sourceField: 'email',
        targetField: 'userEmail',
        rules: [
          {
            custom: (value) =>
              typeof value === 'string' && emailRegex.test(value),
            message: '有効なメールアドレスを入力してください',
          },
        ],
      },
    ];
    importer.mapData(mapping);
    const result = importer.validateDataTypes(importer.getData(), mapping);
    expect(result.isValid).toBe(false);
    expect(
      result.errors[0].includes('有効なメールアドレスを入力してください')
    ).toBe(true);
  });

  it('データ変換とインポート', async () => {
    const csvContent =
      'name,age,active,tags\nJohn,30,true,tag1,tag2\nJane,25,false,tag3';
    const importer = new CSVImporter(csvContent);
    const mapping: DataMapping[] = [
      { sourceField: 'name', targetField: 'fullName', dataType: 'string' },
      { sourceField: 'age', targetField: 'userAge', dataType: 'number' },
      { sourceField: 'active', targetField: 'isActive', dataType: 'boolean' },
      { sourceField: 'tags', targetField: 'userTags', dataType: 'array' },
    ];
    await importer.mapData(mapping);
    const result = await importer.import();
    expect(result.success).toBe(true);
    expect(result.data?.[0].userAge).toBe(30);
    expect(result.data?.[0].isActive).toBe(true);
    expect(Array.isArray(result.data?.[0].userTags)).toBe(true);
  });
});
