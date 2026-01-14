import { Config } from './types.js';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export class ConfigManager {
  private configPath: string;

  constructor() {
    const homeDir = homedir();
    this.configPath = join(homeDir, '.noti', 'config.json');
  }

  async load(): Promise<Config | null> {
    try {
      await access(this.configPath);
      const content = await readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.error('設定ファイルの読み込みに失敗しました:', error);
      return null;
    }
  }

  async save(config: Config): Promise<void> {
    try {
      await mkdir(dirname(this.configPath), { recursive: true });
      await writeFile(this.configPath, JSON.stringify(config, null, 2));
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
