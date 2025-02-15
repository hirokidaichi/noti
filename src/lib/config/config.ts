import { join } from '@std/path';
import { ensureDir } from '@std/fs';

export interface ConfigData {
  apiToken?: string;
}

export class Config {
  private static CONFIG_DIR = join(Deno.env.get('HOME') || '.', '.noti');
  private static CONFIG_FILE = join(Config.CONFIG_DIR, 'config.json');

  constructor(private config: ConfigData = {}) {}

  get token(): string | undefined {
    return this.config.apiToken;
  }

  /**
   * 設定を読み込む
   */
  static async load(): Promise<Config> {
    try {
      const text = await Deno.readTextFile(this.CONFIG_FILE);
      return new Config(JSON.parse(text));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Config();
      }
      throw error;
    }
  }

  /**
   * 設定を保存する
   */
  static async save(config: ConfigData): Promise<void> {
    await ensureDir(this.CONFIG_DIR);
    await Deno.writeTextFile(
      this.CONFIG_FILE,
      JSON.stringify(config, null, 2),
    );
  }

  /**
   * 設定を更新する
   */
  static async update(partial: Partial<ConfigData>): Promise<Config> {
    const current = await this.load();
    const updated = new Config({ ...current.config, ...partial });
    await this.save(updated.config);
    return updated;
  }
}
