import { Logger } from '../logger.ts';
import { APIResponseError } from '@notionhq/client';

export class ErrorHandler {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  handleError(error: unknown, context: string): never {
    if (error instanceof APIResponseError) {
      this.logger.error(`${context}: APIエラー - ${error.code}`, error);
    } else if (error instanceof Error) {
      this.logger.error(`${context}: ${error.message}`, error);
    } else {
      this.logger.error(`${context}: 不明なエラー`, error);
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
