import chalk from 'chalk';

export class Logger {
  private static instance: Logger;
  private isDebugMode = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled;
  }

  debug(title: string, data?: unknown): void {
    if (!this.isDebugMode) return;

    console.error(chalk.yellow('=== Debug: ' + title + ' ==='));
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.error(JSON.stringify(data, null, 2));
      } else {
        console.error(data);
      }
    }
    console.error(chalk.yellow('========================'));
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message + (error ? ': ' + errorMessage : '')));
  }

  info(message: string): void {
    console.error(chalk.blue(message));
  }

  success(message: string): void {
    console.error(chalk.green(message));
  }
}
