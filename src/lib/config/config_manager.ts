import { Config } from './types.ts';
import { ensureDir, exists } from '@std/fs';
import { dirname, join } from '@std/path';

export class ConfigManager {
  private configPath: string;

  constructor() {
    const homeDir = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '.';
    this.configPath = join(homeDir, '.noti', 'config.json');
  }

  async load(): Promise<Config | null> {
    try {
      if (await exists(this.configPath)) {
        const content = await Deno.readTextFile(this.configPath);
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('設定ファイルの読み込みに失敗しました:', error);
    }
    return null;
  }

  async save(config: Config): Promise<void> {
    try {
      await ensureDir(dirname(this.configPath));
      await Deno.writeTextFile(
        this.configPath,
        JSON.stringify(config, null, 2),
      );
    } catch (error) {
      console.error('設定ファイルの保存に失敗しました:', error);
      throw error;
    }
  }

  async update(partialConfig: Partial<Config>): Promise<Config> {
    const current = (await this.load()) || { apiToken: '' };
    const updated = { ...current, ...partialConfig } as Config;
    if (!updated.apiToken) {
      throw new Error('APIトークンは必須です');
    }
    await this.save(updated);
    return updated;
  }
}
