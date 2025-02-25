import { join } from 'jsr:@std/path@^0.220.1';
import { ensureDir } from 'jsr:@std/fs@^0.220.1';
import { Aliases } from './types.ts';

export class AliasManager {
  private static ALIAS_DIR = join(Deno.env.get('HOME') || '.', '.noti');
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
      const text = await Deno.readTextFile(this.ALIAS_FILE);
      return new AliasManager(JSON.parse(text));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new AliasManager();
      }
      throw error;
    }
  }

  /**
   * エイリアスを保存する
   */
  static async save(aliases: Aliases): Promise<void> {
    await ensureDir(this.ALIAS_DIR);
    await Deno.writeTextFile(
      this.ALIAS_FILE,
      JSON.stringify(aliases, null, 2),
    );
  }

  /**
   * エイリアスを更新する
   */
  async update(): Promise<void> {
    await AliasManager.save(this.aliases);
  }
}
