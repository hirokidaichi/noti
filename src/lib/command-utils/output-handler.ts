import { writeFile } from 'node:fs/promises';
import { Logger } from '../logger.js';

export interface OutputOptions {
  json?: boolean;
  output?: string;
  debug?: boolean;
}

export class OutputHandler {
  private logger: Logger;

  constructor(options: OutputOptions = {}) {
    this.logger = Logger.getInstance();
    this.logger.setDebugMode(!!options.debug);
  }

  async handleOutput(
    data: unknown,
    options: OutputOptions = {}
  ): Promise<void> {
    if (options.json) {
      const output = JSON.stringify(data, null, 2);
      if (options.output) {
        await writeFile(options.output, output);
        this.logger.success(`出力を${options.output}に保存しました`);
      } else {
        console.log(output);
      }
      return;
    }

    if (options.output) {
      const output =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await writeFile(options.output, output);
      this.logger.success(`出力を${options.output}に保存しました`);
    } else {
      console.log(data);
    }
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(message, data);
  }

  error(message: string, error?: unknown): void {
    this.logger.error(message, error);
  }

  success(message: string): void {
    this.logger.success(message);
  }

  info(message: string): void {
    this.logger.info(message);
  }
}
