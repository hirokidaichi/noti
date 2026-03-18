# Changelog

## [0.3.0] - 2026-03-18

### Added
- `status`, `relation`, `people` プロパティ型のサポート
- `date` 型の自動変換（文字列 `"YYYY-MM-DD"` → `{ start: "..." }` に自動変換）
- `database page add/update` に `--show-schema` オプション（スキーマ事前確認）
- プロパティ値の型バリデーション（型不一致時に具体的なエラーメッセージ）
- 読み取り専用プロパティ（formula, rollup等）の自動スキップと警告
- 存在しないプロパティ指定時に利用可能なプロパティ名一覧を表示
- 全コマンドにAI向けヘルプテキスト・Examples・コマンド選択ガイドを追加
- `database query` にフィルタ演算子一覧（=, !=, >, <, contains等 + 型別対応）
- `formatPropertyForUpdate` のユニットテスト（32件追加、計230件）

### Fixed
- `database export/page-add/schema` が `resolvePageId` を使っていた問題を `resolveDatabaseId` に修正
- `search/list/query` の `--limit` に NaN フォールバックと 1-100 クランプを追加
- `database create` の JSON.parse にエラーハンドリング追加
- `page remove/update`, `database page remove` の `-f` 未指定時に正しくエラー終了するよう修正
- パッケージから `dist/test/` を除外（テストフィクスチャが配布に含まれていた問題）

## [0.2.0] - 2026-02-10

### Added
- `database schema` コマンド
- `database page update` コマンド
- `database page get` コマンドのCLIヘルプ充実
- パッケージバージョンの動的読み込み

## [0.1.0] - 2025-01-14

- 初回リリース
