import { confirm, input, select } from '@inquirer/prompts';

export interface PromptOptions {
  force?: boolean;
}

export class PromptUtils {
  static async confirm(
    message: string,
    options: PromptOptions = {}
  ): Promise<boolean> {
    if (options.force) {
      return true;
    }
    return await confirm({ message });
  }

  static async select(
    message: string,
    options: string[],
    defaultOption?: string
  ): Promise<string> {
    return await select({
      message,
      choices: options.map((opt) => ({ value: opt, name: opt })),
      default: defaultOption || options[0],
    });
  }

  static async input(message: string, defaultValue?: string): Promise<string> {
    return await input({
      message,
      default: defaultValue,
    });
  }
}
