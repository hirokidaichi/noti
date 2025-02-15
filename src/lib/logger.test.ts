import { assertEquals } from '@std/assert';
import { Logger } from './logger.ts';

// コンソール出力をキャプチャするためのモック
let consoleOutput: string[] = [];
const originalConsoleError = console.error;

function setupTest() {
  consoleOutput = [];
  console.error = (...args: unknown[]) => {
    consoleOutput.push(args.join(' '));
  };
}

function teardownTest() {
  console.error = originalConsoleError;
}

Deno.test('Logger - シングルトンパターンのテスト', () => {
  const logger1 = Logger.getInstance();
  const logger2 = Logger.getInstance();
  assertEquals(logger1, logger2, '同じインスタンスを返すべき');
});

Deno.test('Logger - デバッグモードのテスト', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();

    // デバッグモードOFF時
    logger.setDebugMode(false);
    logger.debug('テストメッセージ');
    assertEquals(
      consoleOutput.length,
      0,
      'デバッグモードOFF時はメッセージを出力しない',
    );

    // デバッグモードON時
    logger.setDebugMode(true);
    logger.debug('テストメッセージ');
    assertEquals(
      consoleOutput.length > 0,
      true,
      'デバッグモードON時はメッセージを出力する',
    );

    // オブジェクトデータのデバッグ出力
    const testData = { key: 'value' };
    logger.debug('テストデータ', testData);
    const output = consoleOutput.join('\\n');
    assertEquals(
      output.includes('value'),
      true,
      'オブジェクトデータが正しく出力される',
    );
  } finally {
    teardownTest();
  }
});

Deno.test('Logger - デバッグモードのテスト - プリミティブ値', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();
    logger.setDebugMode(true);

    // 文字列データ
    logger.debug('テストデータ', '文字列値');
    assertEquals(
      consoleOutput.some((output) => output.includes('文字列値')),
      true,
      '文字列データが正しく出力される',
    );

    // 数値データ
    logger.debug('テストデータ', 123);
    assertEquals(
      consoleOutput.some((output) => output.includes('123')),
      true,
      '数値データが正しく出力される',
    );

    // undefined
    logger.debug('テストデータ');
    assertEquals(
      consoleOutput.some((output) => !output.includes('undefined')),
      true,
      'undefinedの場合はデータを出力しない',
    );
  } finally {
    teardownTest();
  }
});

Deno.test('Logger - エラーメッセージのテスト', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();

    // 通常のエラーメッセージ
    logger.error('エラーが発生しました');
    assertEquals(consoleOutput.length, 1, 'エラーメッセージが出力される');

    // エラーオブジェクト付きのメッセージ
    const error = new Error('テストエラー');
    logger.error('エラーが発生しました', error);
    assertEquals(
      consoleOutput[1].includes('テストエラー'),
      true,
      'エラーオブジェクトのメッセージが含まれる',
    );
  } finally {
    teardownTest();
  }
});

Deno.test('Logger - エラーメッセージのテスト - 非Error型のエラー', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();

    // 文字列エラー
    logger.error('エラーメッセージ', 'カスタムエラー');
    assertEquals(
      consoleOutput[0].includes('エラーメッセージ: カスタムエラー'),
      true,
      '文字列エラーメッセージが含まれる',
    );

    // オブジェクトエラー
    const customError = { message: 'オブジェクトエラー' };
    logger.error('エラーメッセージ', customError);
    assertEquals(
      consoleOutput[1].includes('エラーメッセージ: [object Object]'),
      true,
      'オブジェクトがString変換されて出力される',
    );
  } finally {
    teardownTest();
  }
});

Deno.test('Logger - 情報メッセージのテスト', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();
    logger.info('情報メッセージ');
    assertEquals(consoleOutput.length, 1, '情報メッセージが出力される');
  } finally {
    teardownTest();
  }
});

Deno.test('Logger - 成功メッセージのテスト', () => {
  setupTest();
  try {
    const logger = Logger.getInstance();
    logger.success('成功メッセージ');
    assertEquals(consoleOutput.length, 1, '成功メッセージが出力される');
  } finally {
    teardownTest();
  }
});
