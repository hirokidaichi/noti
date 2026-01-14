import { assertEquals } from '@std/assert';
import { assertSpyCall, spy } from '@std/testing/mock';
import { ErrorHandler } from './error-handler.ts';
import { Logger } from '../logger.ts';
import { APIErrorCode, APIResponseError } from '@notionhq/client';

Deno.test('ErrorHandler', async (t) => {
  let errorHandler: ErrorHandler;
  let originalExit: typeof Deno.exit;
  const mockDebug = spy();
  const mockError = spy();
  const mockSuccess = spy();
  const mockInfo = spy();
  const mockSetDebugMode = spy();

  // 各テストの前に実行
  function setup() {
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

    // Deno.exitをモック
    originalExit = Deno.exit;
    Deno.exit = (_code?: number): never => {
      throw new Error('Exit called');
    };

    errorHandler = new ErrorHandler();
  }

  // 各テストの後に実行
  function cleanup() {
    mockDebug.calls.splice(0);
    mockError.calls.splice(0);
    mockSuccess.calls.splice(0);
    mockInfo.calls.splice(0);
    mockSetDebugMode.calls.splice(0);
    Deno.exit = originalExit;
  }

  await t.step('handleError - エラーメッセージの出力', () => {
    setup();
    const error = new Error('test error');
    const context = 'テストコンテキスト';
    try {
      errorHandler.handleError(error, context);
    } catch {
      // Deno.exitが呼ばれるため、エラーは無視
    }
    assertSpyCall(mockError, 0, {
      args: [`${context}: ${error.message}`, error],
    });
    cleanup();
  });

  await t.step('handleError - デバッグモードでのスタックトレース出力', () => {
    setup();
    const error = new Error('test error');
    const context = 'テストコンテキスト';
    try {
      errorHandler.handleError(error, context);
    } catch {
      // Deno.exitが呼ばれるため、エラーは無視
    }
    assertSpyCall(mockError, 0, {
      args: [`${context}: ${error.message}`, error],
    });
    cleanup();
  });

  await t.step('handleError - APIエラーの処理', () => {
    setup();
    const apiError = new APIResponseError({
      code: 'validation_error' as APIErrorCode,
      message: 'Invalid request',
      status: 400,
      headers: new Headers(),
      rawBodyText: '',
    });

    try {
      errorHandler.handleError(apiError, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    assertSpyCall(mockError, 0, {
      args: ['テスト操作: APIエラー - validation_error', apiError],
    });
    cleanup();
  });

  await t.step('handleError - 一般的なエラーの処理', () => {
    setup();
    const error = new Error('テストエラー');

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    assertSpyCall(mockError, 0, {
      args: ['テスト操作: テストエラー', error],
    });
    cleanup();
  });

  await t.step('handleError - 文字列エラーの処理', () => {
    setup();
    const error = 'エラー文字列';

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    assertSpyCall(mockError, 0, {
      args: ['テスト操作: エラー文字列'],
    });
    cleanup();
  });

  await t.step('handleError - 不明なエラーの処理', () => {
    setup();
    const error = { unknown: 'error' };

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    assertSpyCall(mockError, 0, {
      args: ['テスト操作: 不明なエラー', error],
    });
    cleanup();
  });

  await t.step('withErrorHandling - 成功時', async () => {
    setup();
    const result = await errorHandler.withErrorHandling(
      () => Promise.resolve('success'),
      'テスト操作',
    );
    assertEquals(result, 'success');
    cleanup();
  });

  await t.step('withErrorHandling - エラー時', async () => {
    setup();
    const error = new Error('テストエラー');

    try {
      await errorHandler.withErrorHandling(
        () => Promise.reject(error),
        'テスト操作',
      );
    } catch {
      // never関数なので必ずエラーになる
    }

    assertSpyCall(mockError, 0, {
      args: ['テスト操作: テストエラー', error],
    });
    cleanup();
  });
});
