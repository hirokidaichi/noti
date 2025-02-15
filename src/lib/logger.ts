import { blue, green, red, yellow } from '@std/fmt/colors';

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

    console.error(yellow('=== Debug: ' + title + ' ==='));
    if (data !== undefined) {
      if (typeof data === 'object') {
        console.error(JSON.stringify(data, null, 2));
      } else {
        console.error(data);
      }
    }
    console.error(yellow('========================'));
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(red(message + (error ? ': ' + errorMessage : '')));
  }

  info(message: string): void {
    console.error(blue(message));
  }

  success(message: string): void {
    console.error(green(message));
  }
}
