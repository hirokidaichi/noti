import { assertEquals, assertNotEquals } from '@std/assert';
import { CSVImporter } from './csv-importer.ts';
import { DataMapping } from './types.ts';

Deno.test('CSVImporter - 空のCSVファイルの検証', () => {
  const importer = new CSVImporter('');
  const result = importer.validate();
  assertEquals(result.isValid, false);
  assertEquals(result.errors[0], 'CSVファイルが空です');
});

Deno.test('CSVImporter - 有効なCSVファイルの検証', () => {
  const csvContent = 'name,age\nJohn,30\nJane,25';
  const importer = new CSVImporter(csvContent);
  const mapping = importer.generateDefaultMapping();
  importer.mapData(mapping);
  const result = importer.validate();
  assertEquals(result.isValid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test('CSVImporter - ヘッダー取得', () => {
  const csvContent = 'name,age,email\nJohn,30,john@example.com';
  const importer = new CSVImporter(csvContent);
  const headers = importer.getHeaders();
  assertEquals(headers, ['name', 'age', 'email']);
});

Deno.test('CSVImporter - デフォルトマッピング生成', () => {
  const csvContent = 'name,age,email\nJohn,30,john@example.com';
  const importer = new CSVImporter(csvContent);
  const mapping = importer.generateDefaultMapping();
  assertEquals(mapping, [
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

Deno.test('CSVImporter - マッピングバリデーション - 無効なソースフィールド', () => {
  const csvContent = 'name,age\nJohn,30';
  const importer = new CSVImporter(csvContent);
  const mapping: DataMapping[] = [
    { sourceField: 'invalid', targetField: 'name' },
  ];
  importer.mapData(mapping);
  const result = importer.validateMapping();
  assertEquals(result.isValid, false);
  assertEquals(result.errors[0].field, 'invalid');
  assertEquals(
    result.errors[0].message,
    'ソースフィールド "invalid" がCSVヘッダーに存在しません',
  );
});

Deno.test('CSVImporter - データ型バリデーション - 数値型', () => {
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
  assertEquals(result.isValid, false);
  assertNotEquals(result.errors.length, 0);
});

Deno.test('CSVImporter - 必須項目バリデーション', () => {
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
  assertEquals(result.isValid, false);
  assertEquals(result.errors[0].includes('年齢は必須項目です'), true);
});

Deno.test('CSVImporter - カスタムバリデーション', () => {
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
  assertEquals(result.isValid, false);
  assertEquals(
    result.errors[0].includes('有効なメールアドレスを入力してください'),
    true,
  );
});

Deno.test('CSVImporter - データ変換とインポート', async () => {
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
  assertEquals(result.success, true);
  assertEquals(result.data?.[0].userAge, 30);
  assertEquals(result.data?.[0].isActive, true);
  assertEquals(Array.isArray(result.data?.[0].userTags), true);
});
