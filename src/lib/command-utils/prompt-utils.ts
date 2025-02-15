import { Confirm, Input, Select } from '@cliffy/prompt';

export interface PromptOptions {
  force?: boolean;
}

export class PromptUtils {
  static async confirm(
    message: string,
    options: PromptOptions = {},
  ): Promise<boolean> {
    if (options.force) {
      return true;
    }
    return await Confirm.prompt(message);
  }

  static async select(
    message: string,
    options: string[],
    defaultOption?: string,
  ): Promise<string> {
    return await Select.prompt({
      message,
      options,
      default: defaultOption || options[0],
    });
  }

  static async input(message: string, defaultValue?: string): Promise<string> {
    return await Input.prompt({
      message,
      default: defaultValue,
    });
  }
}
