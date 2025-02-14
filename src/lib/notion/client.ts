import { Client } from "../../deps.ts";
import { Config } from "../config/config.ts";

export class NotionClient {
  private client: Client;

  constructor(config: Config) {
    if (!config.token) {
      throw new Error("Notion APIトークンが設定されていません。`noti configure` を実行してください。");
    }
    this.client = new Client({
      auth: config.token,
    });
  }

  async validateToken() {
    try {
      await this.client.users.me({});
      return true;
    } catch (error) {
      throw new Error("APIトークンが無効です。");
    }
  }

  async search(params: {
    query: string;
    page_size?: number;
    filter?: {
      property: "object";
      value: "page" | "database";
    };
  }) {
    return await this.client.search({
      query: params.query,
      page_size: params.page_size,
      filter: params.filter,
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });
  }

  async getPage(pageId: string) {
    return await this.client.pages.retrieve({
      page_id: pageId,
    });
  }

  async getBlocks(pageId: string) {
    return await this.client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });
  }

  async appendBlocks(pageId: string, blocks: any[]) {
    return await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks,
    });
  }

  async getDatabase(databaseId: string) {
    return await this.client.databases.retrieve({
      database_id: databaseId,
    });
  }

  async createPage(params: {
    parentId: string;
    title?: string;
    blocks?: any[];
  }) {
    const parentType = params.parentId.includes("-") ? "database_id" : "page_id";
    const properties: any = {};

    if (parentType === "database_id") {
      // データベースの場合、Titleプロパティは必須
      properties.Name = {
        title: params.title ? [{ text: { content: params.title } }] : [],
      };
    } else {
      // 通常のページの場合
      properties.title = {
        title: params.title ? [{ text: { content: params.title } }] : [],
      };
    }

    const parent = parentType === "database_id"
      ? { database_id: params.parentId }
      : { page_id: params.parentId };

    return await this.client.pages.create({
      parent,
      properties,
      children: params.blocks || [],
    });
  }

  async removePage(pageId: string) {
    return await this.client.pages.update({
      page_id: pageId,
      archived: true, // Notionではアーカイブが削除に相当
    });
  }
} 