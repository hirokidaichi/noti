import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';

export interface ConfigData {
  apiToken?: string;
}

export class Config {
  private static CONFIG_DIR = join(homedir(), '.noti');
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
      const text = await readFile(this.CONFIG_FILE, 'utf-8');
      return new Config(JSON.parse(text));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new Config();
      }
      throw error;
    }
  }

  /**
   * 設定を保存する
   */
  static async save(config: ConfigData): Promise<void> {
    await mkdir(this.CONFIG_DIR, { recursive: true });
    await writeFile(this.CONFIG_FILE, JSON.stringify(config, null, 2));
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
