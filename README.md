# noti - Notion CLI

NotionのAPIを使用して、コマンドラインからNotionを操作するためのCLIツールです。

## 特徴

- 🔍 高速な検索機能（fuzzy検索対応）
- 📝 ページの作成・編集・取得
- 🗃️ データベースの操作
- 🔐 安全なAPI Token管理
- 📊 Markdownインポート/エクスポート対応

## インストール

```bash
# Denoのインストール（まだの場合）
curl -fsSL https://deno.land/x/install/install.sh | sh

# notiのインストール
git clone https://github.com/hirokidaichi/noti.git
cd noti
```

## 設定

初回使用時は、以下のコマンドで設定を行います：

```bash
deno task noti configure
```

NotionのAPI Tokenを入力するように促されます。API Tokenは[Notion Integrations](https://www.notion.so/my-integrations)から取得できます。

## 使用方法

### 基本的なコマンド

```bash
# 設定
deno task noti configure

# 検索
deno task noti search <検索キーワード>
deno task noti search-fuzzy <検索キーワード>

# ページ操作
deno task noti page get <ページID>
deno task noti page append <ページID> <コンテンツ>
```

### 開発モード

```bash
# 開発モードで実行（ファイル変更を監視）
deno task dev

# テストの実行
deno task test

# テストの監視実行
deno task test:watch
```

## 依存関係

- [@cliffy/command](https://jsr.io/@cliffy/command) - コマンドライン引数のパース
- [@deno-library/termbox](https://jsr.io/@deno-library/termbox) - ターミナルUIの構築
- [@std/cli](https://jsr.io/@std/cli) - CLIユーティリティ
- [@std/fmt](https://jsr.io/@std/fmt) - フォーマッティングユーティリティ

## 開発ステータス

現在、以下の機能が実装されています：

- [x] API Token認証
- [x] 設定ファイル管理
- [x] ページの取得
- [x] ページへのコンテンツ追加
- [x] 検索機能
- [x] Fuzzy検索

詳細な開発状況は[todo.md](todo.md)を参照してください。

## ライセンス

MIT

## コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 仕様

詳細な仕様については[spec.md](spec.md)を参照してください。
