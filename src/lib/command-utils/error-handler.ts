import { Logger } from '../logger.ts';
import { APIResponseError } from '@notionhq/client';

export class ErrorHandler {
  private logger: Logger;

  constructor(private defaultContext = '') {
    this.logger = Logger.getInstance();
  }

  handleError(error: unknown, context?: string): never {
    const ctx = context || this.defaultContext;
    if (error instanceof APIResponseError) {
      this.logger.error(`${ctx}: APIエラー - ${error.code}`, error);
    } else if (error instanceof Error) {
      this.logger.error(`${ctx}: ${error.message}`, error);
    } else if (typeof error === 'string') {
      this.logger.error(`${ctx}: ${error}`);
    } else {
      this.logger.error(`${ctx}: 不明なエラー`, error);
    }
    Deno.exit(1);
  }

  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
    }
  }
}
