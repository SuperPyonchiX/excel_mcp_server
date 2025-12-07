---
agent: 'generate-typescript-mcp-server'
description: 'ツール、リソース、適切な設定を持つ完全なTypeScriptのMCPサーバープロジェクトを生成'
---

# TypeScript MCPサーバーの生成

以下の仕様で完全なModel Context Protocol (MCP)サーバーをTypeScriptで作成します：

## 要件

**プロトコルリビジョン**: 2025-06-18  
**推奨SDK**: @modelcontextprotocol/sdk 最新版

1. **プロジェクト構造**: 適切なディレクトリ構造で新しいTypeScript/Node.jsプロジェクトを作成
2. **NPMパッケージ**: @modelcontextprotocol/sdk、zod@3、およびexpress（HTTP用）またはstdioサポートを含める
3. **TypeScript設定**: ESモジュールサポート付きの適切なtsconfig.json
4. **サーバータイプ**: HTTP（Streamable HTTPトランスポート付き）またはstdioベースサーバーから選択
5. **ツール**: 適切なスキーマ検証付きの少なくとも1つの有用なツールを作成
6. **エラーハンドリング**: 包括的なエラーハンドリングと検証を含める

### エラーハンドリングの標準化

MCPは2種類のエラー報告メカニズムを使用します：

**1. プロトコルエラー（JSON-RPCエラー）**
- 不明なツール、無効な引数: エラーコード `-32602`
- 内部エラー: エラーコード `-32603`
- リソースが見つからない: エラーコード `-32002`

**2. ツール実行エラー（`isError: true`）**
- API失敗、無効な入力データ、ビジネスロジックエラー
- ツール結果で `isError: true` を返す
- ユーザーに分かりやすいエラーメッセージを提供

## 実装詳細

### プロジェクトセットアップ
- `npm init` で初期化してpackage.jsonを作成
- 依存関係をインストール: `@modelcontextprotocol/sdk`、`zod@3`、およびトランスポート固有のパッケージ
- ESモジュールでTypeScriptを設定: package.jsonに `"type": "module"`
- dev依存関係を追加: 開発用に `tsx` または `ts-node`
- 適切な.gitignoreファイルを作成

### サーバー設定
- 高レベル実装に `McpServer` クラスを使用
- サーバー名とバージョンを設定
- 適切なトランスポートを選択（StreamableHTTPServerTransportまたはStdioServerTransport）
- HTTP用: 適切なミドルウェアとエラーハンドリングでExpressをセットアップ
- stdio用: StdioServerTransportを直接使用

### ツール実装
- 説明的な名前で `registerTool()` メソッドを使用
- **ツール命名規則**:
  - スネークケースを使用: `get_weather`, `analyze_data`, `fetch_forecast`
  - 動詞+名詞の組み合わせで明確に
  - キャメルケース、空白、特殊文字を避ける
- 入力と出力の検証にzodを使用してスキーマを定義
- 明確な `title` と `description` フィールドを提供
- 結果に `content` と `structuredContent` の両方を返す
- try-catchブロックで適切なエラーハンドリングを実装
- 適切な場所で非同期操作をサポート

### リソース/プロンプトセットアップ（オプション）
- 動的URIのためにResourceTemplateで `registerResource()` を使用してリソースを追加
- 引数スキーマで `registerPrompt()` を使用してプロンプトを追加
- より良いUXのために補完サポートの追加を検討

### コード品質
- 型安全性のためにTypeScriptを使用
- 一貫してasync/awaitパターンに従う
- トランスポートクローズイベントで適切なクリーンアップを実装
- 設定に環境変数を使用
- 複雑なロジックにインラインコメントを追加
- 明確な関心の分離でコードを構造化

## 検討すべきツールタイプの例
- データ処理と変換
- 外部API統合
- ファイルシステム操作（読み取り、検索、分析）
- データベースクエリ
- テキスト分析または要約（サンプリング付き）
- システム情報取得

## 設定オプション
- **HTTPサーバーの場合**: 
  - 環境変数によるポート設定
  - ブラウザクライアント用のCORSセットアップ
  - セッション管理（ステートレス vs ステートフル）
  - ローカルサーバー用のDNSリバインディング保護
  
- **stdioサーバーの場合**:
  - 適切なstdin/stdoutハンドリング
  - 環境ベースの設定
  - プロセスライフサイクル管理

## テストガイダンス
- サーバーの実行方法を説明（`npm start` または `npx tsx server.ts`）
- MCP Inspectorコマンドを提供: `npx @modelcontextprotocol/inspector`
- HTTPサーバーの場合、接続URLを含める: `http://localhost:PORT/mcp`
- ツール呼び出しの例を含める
- 一般的な問題のトラブルシューティングのヒントを追加

## 重要な警告とベストプラクティス

### 🚨 STDIOログ出力に関する警告
- **STDIOサーバーで絶対に禁止**: `console.log()` ステートメントまたはstdoutへの出力
  - 理由: stdoutへの出力はJSON-RPCメッセージを破壊します
- **正しいログ記録方法**:
  - `console.error()` で stderr に出力
  - ロギングライブラリ（winston, pino）で stderr に設定
- **HTTPサーバー**: stdoutへのログ出力は問題ありません

## セキュリティ考慮事項

生成するサーバーに以下のセキュリティ対策を実装してください：

### 必須対策（MUST）
- **入力検証**: すべてのツール入力を検証（zodスキーマで定義）
- **アクセス制御**: 機密リソースへの適切なアクセス制御を実装
- **レート制限**: ツール呼び出しの頻度制限を実装
- **出力サニタイズ**: ツール出力から機密情報を除去
- **環境変数**: シークレットは環境変数で管理（ハードコードしない）

### 設計原則
- 人間の承認が必要なことを前提に設計
- 最小権限の原則でツールを実装
- ツールの機能と影響範囲を`title`と`description`で明確に説明

## 検討すべき追加機能

- LLMパワードツールのためのサンプリングサポート
- インタラクティブワークフローのためのユーザー入力要求
- **アノテーション機能**: ツール結果、リソース、プロンプトにメタデータを付与
  - `audience`: `["user"]`、`["assistant"]`、または`["user", "assistant"]`
  - `priority`: 0.0（任意）から1.0（必須）
  - `lastModified`: ISO 8601形式のタイムスタンプ
- **outputSchema**: ツールに出力JSON Schemaを定義
  - zodスキーマで出力型を定義
  - 構造化された結果を`structuredContent`で返し、`content`にもJSONを含める
- 有効化/無効化機能付きの動的ツール登録
- 一括更新のための通知デバウンシング
- 効率的なデータ参照のためのリソースリンク

型安全性、エラーハンドリング、包括的なドキュメントを備えた、完全で本番環境対応のMCPサーバーを生成します。
