# ⚙️ セットアップ手順

## 前提条件

以下がインストールされている必要があります：

### 必須
- **Node.js** (v18以上推奨)
  - [公式サイト](https://nodejs.org/)からダウンロード
  - `node --version` で確認

- **npm** (Node.jsに含まれています)
  - `npm --version` で確認

### 推奨
- **VS Code** (統合開発環境)
  - [公式サイト](https://code.visualstudio.com/)からダウンロード
  - MCP デバッグ機能を使用するため

## インストール手順

### 1. プロジェクトのクローン/ダウンロード
```bash
# Gitを使用する場合
git clone <リポジトリURL>

# またはZIPファイルをダウンロードして展開
```

### 2. プロジェクトディレクトリに移動
```bash
cd Excel
```

### 3. 依存関係のインストール
```bash
npm install
```

これにより以下のパッケージがインストールされます：
- `@modelcontextprotocol/sdk` - MCP SDK
- `exceljs` - Excel操作ライブラリ
- `zod` - スキーマ検証ライブラリ
- `typescript` - TypeScriptコンパイラ
- `@types/node` - Node.js型定義

### 4. プロジェクトのビルド
```bash
npm run build
```

成功すると `dist/` フォルダにJavaScriptファイルが生成されます。

## ディレクトリ構成の確認

セットアップ後、以下の構成になっているはずです：

```
Excel/
├── dist/                    # ← ビルド後に作成される
│   ├── index.js
│   └── index.d.ts
├── node_modules/            # ← npm install後に作成される
├── src/
│   └── index.ts
├── guide/
│   └── (このガイドファイル群)
├── package.json
├── tsconfig.json
└── README.md
```

## 動作確認

### 1. Excel操作テスト
```bash
node test-excel.js
```

成功すると：
- コンソールに成功メッセージが表示
- `test.xlsx` ファイルが作成される

### 2. MCPサーバーの起動テスト
```bash
npm start
```

成功すると：
- "Excel MCP Server が開始されました" と表示
- サーバーが待機状態になる
- Ctrl+C で終了

## トラブルシューティング

### Node.jsが見つからない
```bash
node: command not found
```
**解決方法**: Node.jsを[公式サイト](https://nodejs.org/)からインストール

### npm installでエラー
```bash
npm ERR! code EACCES
```
**解決方法**: 管理者権限で実行するか、npmの権限を設定

### TypeScriptコンパイルエラー
```bash
error TS2307: Cannot find module
```
**解決方法**: 
1. `npm install`を再実行
2. `node_modules`を削除して再インストール

### ポート使用中エラー
MCPサーバーはstdio通信を使用するため、ポートエラーは通常発生しませんが、他のNode.jsプロセスが動作している場合は：
```bash
taskkill /f /im node.exe    # Windows
pkill node                  # Mac/Linux
```

## VS Code設定

### 推奨拡張機能
以下の拡張機能をインストールすることを推奨します：

1. **TypeScript Importer** - インポート文の自動生成
2. **Error Lens** - エラーの視覚的表示
3. **npm** - npmスクリプトの実行

### デバッグ設定
`.vscode/mcp.json` にMCPサーバーの設定が含まれています：

```json
{
  "servers": {
    "excel-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## 次のステップ

セットアップが完了したら、[使用方法](./03-usage.md)に進んで実際の使い方を学びましょう。
