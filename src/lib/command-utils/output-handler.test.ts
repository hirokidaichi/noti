import { describe, it, expect, afterEach, vi } from 'vitest';
import { OutputHandler } from './output-handler.js';
import { Logger } from '../logger.js';
import * as fs from 'node:fs/promises';

describe('OutputHandler', () => {
  let outputHandler: OutputHandler;
  let originalConsoleLog: typeof console.log;
  let consoleLogCalls: unknown[] = [];
  const mockDebug = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();
  const mockInfo = vi.fn();
  const mockSetDebugMode = vi.fn();

  function setup(options: { debug?: boolean } = {}) {
    // LoggerのgetInstanceをモック
    const mockLogger = Logger.getInstance();
    Object.defineProperties(mockLogger, {
      debug: { value: mockDebug, configurable: true },
      error: { value: mockError, configurable: true },
      success: { value: mockSuccess, configurable: true },
      info: { value: mockInfo, configurable: true },
      setDebugMode: { value: mockSetDebugMode, configurable: true },
    });
    Logger.getInstance = () => mockLogger;

    outputHandler = new OutputHandler(options);
    originalConsoleLog = console.log;
    consoleLogCalls = [];
    console.log = (...args: unknown[]) => {
      consoleLogCalls.push(args[0]);
    };
  }

  function cleanup() {
    console.log = originalConsoleLog;
    mockDebug.mockClear();
    mockError.mockClear();
    mockSuccess.mockClear();
    mockInfo.mockClear();
    mockSetDebugMode.mockClear();
  }

  afterEach(() => {
    cleanup();
  });

  it('constructor - デバッグモードの設定', () => {
    setup({ debug: true });
    expect(mockSetDebugMode).toHaveBeenCalledWith(true);
  });

  it('handleOutput - JSON形式での出力', async () => {
    setup();
    const testData = { test: 'data' };
    await outputHandler.handleOutput(testData, { json: true });
    expect(consoleLogCalls[0]).toBe(JSON.stringify(testData, null, 2));
  });

  it('handleOutput - ファイルへの出力', async () => {
    setup();
    const testData = 'test data';
    const tempFile = './test-output.txt';

    try {
      await outputHandler.handleOutput(testData, { output: tempFile });
      const fileContent = await fs.readFile(tempFile, 'utf-8');
      expect(fileContent).toBe(testData);
      expect(mockSuccess).toHaveBeenCalledWith(
        `出力を${tempFile}に保存しました`
      );
    } finally {
      try {
        await fs.unlink(tempFile);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
  });

  it('debug - デバッグメッセージの出力', () => {
    setup();
    const message = 'debug message';
    const data = { test: 'data' };
    outputHandler.debug(message, data);
    expect(mockDebug).toHaveBeenCalledWith(message, data);
  });

  it('error - エラーメッセージの出力', () => {
    setup();
    const message = 'error message';
    const error = new Error('test error');
    outputHandler.error(message, error);
    expect(mockError).toHaveBeenCalledWith(message, error);
  });

  it('success - 成功メッセージの出力', () => {
    setup();
    const message = 'success message';
    outputHandler.success(message);
    expect(mockSuccess).toHaveBeenCalledWith(message);
  });

  it('info - 情報メッセージの出力', () => {
    setup();
    const message = 'info message';
    outputHandler.info(message);
    expect(mockInfo).toHaveBeenCalledWith(message);
  });
});
