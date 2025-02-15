import { assertEquals } from '@std/assert';
import { assertSpyCall, spy } from '@std/testing/mock';
import { OutputHandler } from './output-handler.ts';
import { Logger } from '../logger.ts';

Deno.test('OutputHandler', async (t) => {
  let outputHandler: OutputHandler;
  let originalConsoleLog: typeof console.log;
  let consoleLogCalls: unknown[] = [];
  const mockDebug = spy();
  const mockError = spy();
  const mockSuccess = spy();
  const mockInfo = spy();
  const mockSetDebugMode = spy();

  // 各テストの前に実行
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

  // 各テストの後に実行
  function cleanup() {
    console.log = originalConsoleLog;
    mockDebug.calls.splice(0);
    mockError.calls.splice(0);
    mockSuccess.calls.splice(0);
    mockInfo.calls.splice(0);
    mockSetDebugMode.calls.splice(0);
  }

  await t.step('constructor - デバッグモードの設定', () => {
    setup({ debug: true });
    assertSpyCall(mockSetDebugMode, 0, { args: [true] });
    cleanup();
  });

  await t.step('handleOutput - JSON形式での出力', async () => {
    setup();
    const testData = { test: 'data' };
    await outputHandler.handleOutput(testData, { json: true });
    assertEquals(consoleLogCalls[0], JSON.stringify(testData, null, 2));
    cleanup();
  });

  await t.step('handleOutput - ファイルへの出力', async () => {
    setup();
    const testData = 'test data';
    const tempFile = await Deno.makeTempFile();

    try {
      await outputHandler.handleOutput(testData, { output: tempFile });
      const fileContent = await Deno.readTextFile(tempFile);
      assertEquals(fileContent, testData);
      assertSpyCall(mockSuccess, 0, {
        args: [`出力を${tempFile}に保存しました`],
      });
    } finally {
      await Deno.remove(tempFile);
    }
    cleanup();
  });

  await t.step('debug - デバッグメッセージの出力', () => {
    setup();
    const message = 'debug message';
    const data = { test: 'data' };
    outputHandler.debug(message, data);
    assertSpyCall(mockDebug, 0, { args: [message, data] });
    cleanup();
  });

  await t.step('error - エラーメッセージの出力', () => {
    setup();
    const message = 'error message';
    const error = new Error('test error');
    outputHandler.error(message, error);
    assertSpyCall(mockError, 0, { args: [message, error] });
    cleanup();
  });

  await t.step('success - 成功メッセージの出力', () => {
    setup();
    const message = 'success message';
    outputHandler.success(message);
    assertSpyCall(mockSuccess, 0, { args: [message] });
    cleanup();
  });

  await t.step('info - 情報メッセージの出力', () => {
    setup();
    const message = 'info message';
    outputHandler.info(message);
    assertSpyCall(mockInfo, 0, { args: [message] });
    cleanup();
  });
});
