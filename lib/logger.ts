import { colors } from '../deps.ts';

export class Logger {
  private prefix(type: string, color: (str: string) => string): string {
    return color(`[${type}]`);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(
      this.prefix('INFO', colors.blue),
      message,
      ...args,
    );
  }

  success(message: string, ...args: unknown[]): void {
    console.log(
      this.prefix('SUCCESS', colors.green),
      message,
      ...args,
    );
  }

  warn(message: string, ...args: unknown[]): void {
    console.log(
      this.prefix('WARN', colors.yellow),
      message,
      ...args,
    );
  }

  error(message: string, ...args: unknown[]): void {
    console.error(
      this.prefix('ERROR', colors.red),
      message,
      ...args,
    );
  }

  debug(message: string, ...args: unknown[]): void {
    if (Deno.env.get('DEBUG')) {
      console.debug(
        this.prefix('DEBUG', colors.gray),
        message,
        ...args,
      );
    }
  }
}
