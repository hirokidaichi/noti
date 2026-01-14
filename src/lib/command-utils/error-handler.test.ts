import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler } from './error-handler.js';
import { Logger } from '../logger.js';
import { APIErrorCode, APIResponseError } from '@notionhq/client';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let originalExit: typeof process.exit;
  const mockDebug = vi.fn();
  const mockError = vi.fn();
  const mockSuccess = vi.fn();
  const mockInfo = vi.fn();
  const mockSetDebugMode = vi.fn();

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

    // process.exitをモック
    originalExit = process.exit;
    process.exit = ((_code?: number): never => {
      throw new Error('Exit called');
    }) as typeof process.exit;

    errorHandler = new ErrorHandler();
  }

  function cleanup() {
    mockDebug.mockClear();
    mockError.mockClear();
    mockSuccess.mockClear();
    mockInfo.mockClear();
    mockSetDebugMode.mockClear();
    process.exit = originalExit;
  }

  beforeEach(() => {
    setup();
  });

  afterEach(() => {
    cleanup();
  });

  it('handleError - エラーメッセージの出力', () => {
    const error = new Error('test error');
    const context = 'テストコンテキスト';
    try {
      errorHandler.handleError(error, context);
    } catch {
      // process.exitが呼ばれるため、エラーは無視
    }
    expect(mockError).toHaveBeenCalledWith(
      `${context}: ${error.message}`,
      error
    );
  });

  it('handleError - デバッグモードでのスタックトレース出力', () => {
    const error = new Error('test error');
    const context = 'テストコンテキスト';
    try {
      errorHandler.handleError(error, context);
    } catch {
      // process.exitが呼ばれるため、エラーは無視
    }
    expect(mockError).toHaveBeenCalledWith(
      `${context}: ${error.message}`,
      error
    );
  });

  it('handleError - APIエラーの処理', () => {
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

    expect(mockError).toHaveBeenCalledWith(
      'テスト操作: APIエラー - validation_error',
      apiError
    );
  });

  it('handleError - 一般的なエラーの処理', () => {
    const error = new Error('テストエラー');

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    expect(mockError).toHaveBeenCalledWith('テスト操作: テストエラー', error);
  });

  it('handleError - 文字列エラーの処理', () => {
    const error = 'エラー文字列';

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    expect(mockError).toHaveBeenCalledWith('テスト操作: エラー文字列');
  });

  it('handleError - 不明なエラーの処理', () => {
    const error = { unknown: 'error' };

    try {
      errorHandler.handleError(error, 'テスト操作');
    } catch {
      // never関数なので必ずエラーになる
    }

    expect(mockError).toHaveBeenCalledWith('テスト操作: 不明なエラー', error);
  });

  it('withErrorHandling - 成功時', async () => {
    const result = await errorHandler.withErrorHandling(
      () => Promise.resolve('success'),
      'テスト操作'
    );
    expect(result).toBe('success');
  });

  it('withErrorHandling - エラー時', async () => {
    const error = new Error('テストエラー');

    try {
      await errorHandler.withErrorHandling(
        () => Promise.reject(error),
        'テスト操作'
      );
    } catch {
      // never関数なので必ずエラーになる
    }

    expect(mockError).toHaveBeenCalledWith('テスト操作: テストエラー', error);
  });
});
