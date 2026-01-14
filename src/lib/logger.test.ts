import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from './logger.js';

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

describe('Logger', () => {
  it('シングルトンパターンのテスト', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    expect(logger1).toBe(logger2);
  });

  describe('デバッグモードのテスト', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('デバッグモードOFF時はメッセージを出力しない', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(false);
      logger.debug('テストメッセージ');
      expect(consoleOutput.length).toBe(0);
    });

    it('デバッグモードON時はメッセージを出力する', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(true);
      logger.debug('テストメッセージ');
      expect(consoleOutput.length).toBeGreaterThan(0);
    });

    it('オブジェクトデータが正しく出力される', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(true);
      const testData = { key: 'value' };
      logger.debug('テストデータ', testData);
      const output = consoleOutput.join('\\n');
      expect(output).toContain('value');
    });
  });

  describe('デバッグモードのテスト - プリミティブ値', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('文字列データが正しく出力される', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(true);
      logger.debug('テストデータ', '文字列値');
      expect(consoleOutput.some((output) => output.includes('文字列値'))).toBe(
        true
      );
    });

    it('数値データが正しく出力される', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(true);
      logger.debug('テストデータ', 123);
      expect(consoleOutput.some((output) => output.includes('123'))).toBe(true);
    });

    it('undefinedの場合はデータを出力しない', () => {
      const logger = Logger.getInstance();
      logger.setDebugMode(true);
      logger.debug('テストデータ');
      expect(
        consoleOutput.some((output) => !output.includes('undefined'))
      ).toBe(true);
    });
  });

  describe('エラーメッセージのテスト', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('エラーメッセージが出力される', () => {
      const logger = Logger.getInstance();
      logger.error('エラーが発生しました');
      expect(consoleOutput.length).toBe(1);
    });

    it('エラーオブジェクトのメッセージが含まれる', () => {
      const logger = Logger.getInstance();
      logger.error('エラーが発生しました');
      const error = new Error('テストエラー');
      logger.error('エラーが発生しました', error);
      expect(consoleOutput[1]).toContain('テストエラー');
    });
  });

  describe('エラーメッセージのテスト - 非Error型のエラー', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('文字列エラーメッセージが含まれる', () => {
      const logger = Logger.getInstance();
      logger.error('エラーメッセージ', 'カスタムエラー');
      expect(consoleOutput[0]).toContain('エラーメッセージ: カスタムエラー');
    });

    it('オブジェクトがString変換されて出力される', () => {
      const logger = Logger.getInstance();
      logger.error('エラーメッセージ', 'カスタムエラー');
      const customError = { message: 'オブジェクトエラー' };
      logger.error('エラーメッセージ', customError);
      expect(consoleOutput[1]).toContain('エラーメッセージ: [object Object]');
    });
  });

  describe('情報メッセージのテスト', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('情報メッセージが出力される', () => {
      const logger = Logger.getInstance();
      logger.info('情報メッセージ');
      expect(consoleOutput.length).toBe(1);
    });
  });

  describe('成功メッセージのテスト', () => {
    beforeEach(() => {
      setupTest();
    });

    afterEach(() => {
      teardownTest();
    });

    it('成功メッセージが出力される', () => {
      const logger = Logger.getInstance();
      logger.success('成功メッセージ');
      expect(consoleOutput.length).toBe(1);
    });
  });
});
