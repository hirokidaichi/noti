import { Command } from "@cliffy/command";
import { AliasManager } from "../lib/config/aliases.ts";

export const aliasCommand = new Command()
  .name("alias")
  .description("Notionページのエイリアスを管理します")
  .command("set", new Command()
    .description("エイリアスを設定します")
    .arguments("<name:string> <page_id_or_url:string>")
    .action(async (_options: unknown, name: string, pageIdOrUrl: string) => {
      const aliasManager = await AliasManager.load();
      aliasManager.set(name, pageIdOrUrl);
      await aliasManager.update();
      console.log(`エイリアス "${name}" を "${pageIdOrUrl}" に設定しました`);
    })
  )
  .command("remove", new Command()
    .description("エイリアスを削除します")
    .arguments("<name:string>")
    .action(async (_options: unknown, name: string) => {
      const aliasManager = await AliasManager.load();
      
      if (!aliasManager.get(name)) {
        console.error(`エイリアス "${name}" は存在しません`);
        Deno.exit(1);
      }

      aliasManager.remove(name);
      await aliasManager.update();
      console.log(`エイリアス "${name}" を削除しました`);
    })
  )
  .command("list", new Command()
    .description("設定されているエイリアスの一覧を表示します")
    .action(async () => {
      const aliasManager = await AliasManager.load();
      const aliases = aliasManager.getAll();
      
      if (Object.keys(aliases).length === 0) {
        console.log("設定されているエイリアスはありません");
        return;
      }

      console.log("設定されているエイリアス:");
      for (const [name, value] of Object.entries(aliases)) {
        console.log(`${name} -> ${value}`);
      }
    })
  )
  .command("get", new Command()
    .description("エイリアスの設定値を表示します")
    .arguments("<name:string>")
    .action(async (_options: unknown, name: string) => {
      const aliasManager = await AliasManager.load();
      const value = aliasManager.get(name);
      
      if (!value) {
        console.error(`エイリアス "${name}" は存在しません`);
        Deno.exit(1);
      }
      console.log(`${name} -> ${value}`);
    })
  ); 