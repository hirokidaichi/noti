import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { Aliases } from './types.js';

export class AliasManager {
  private static ALIAS_DIR = join(homedir(), '.noti');
  private static ALIAS_FILE = join(AliasManager.ALIAS_DIR, 'aliases.json');

  constructor(private aliases: Aliases = {}) {}

  /**
   * エイリアスを取得する
   */
  get(alias: string): string | undefined {
    return this.aliases[alias];
  }

  /**
   * エイリアスを設定する
   */
  set(alias: string, pageIdOrUrl: string): void {
    this.aliases[alias] = pageIdOrUrl;
  }

  /**
   * エイリアスを削除する
   */
  remove(alias: string): void {
    delete this.aliases[alias];
  }

  /**
   * 全てのエイリアスを取得する
   */
  getAll(): Aliases {
    return { ...this.aliases };
  }

  /**
   * エイリアスを読み込む
   */
  static async load(): Promise<AliasManager> {
    try {
      const text = await readFile(this.ALIAS_FILE, 'utf-8');
      return new AliasManager(JSON.parse(text));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return new AliasManager();
      }
      throw error;
    }
  }

  /**
   * エイリアスを保存する
   */
  static async save(aliases: Aliases): Promise<void> {
    await mkdir(this.ALIAS_DIR, { recursive: true });
    await writeFile(this.ALIAS_FILE, JSON.stringify(aliases, null, 2));
  }

  /**
   * エイリアスを更新する
   */
  async update(): Promise<void> {
    await AliasManager.save(this.aliases);
  }
}
