# 📚 Excel MCP Server 完全ガイド

## 🤔 MCPって何？

**MCP (Model Context Protocol)** は、AIエージェントが外部ツールやサービスと連携するための標準プロトコルです。

### MCPの基本概念
- **サーバー**: 特定の機能を提供するプログラム（今回はExcel操作）
- **クライアント**: MCPサーバーを利用するAIエージェント
- **ツール**: サーバーが提供する具体的な機能（例：Excelファイル作成）

## 🗂️ プロジェクト構成の詳細説明

```
Excel MCP Server/
├── .github/                    # GitHubとCopilot設定
│   └── copilot-instructions.md # Copilot用の開発指示
├── .vscode/                    # VS Code設定
│   ├── mcp.json               # MCP設定ファイル
│   └── tasks.json             # VS Codeタスク設定
├── dist/                       # コンパイル済みJavaScript
│   ├── index.js               # メインサーバーファイル
│   └── index.d.ts             # TypeScript型定義
├── guide/                      # このガイド
│   ├── README.md              # メインガイド（このファイル）
│   ├── 01-basics.md           # MCP基礎知識
│   ├── 02-setup.md            # セットアップ手順
│   ├── 03-usage.md            # 使用方法
│   ├── 04-tools.md            # ツール詳細
│   ├── 05-troubleshooting.md  # トラブルシューティング
│   ├── 06-samples.md          # サンプル集  
│   └── 07-api-specification.md # API仕様書
├── node_modules/               # NPMパッケージ
├── src/                       # TypeScriptソースコード
│   └── index.ts               # メインサーバーファイル
├── package.json               # プロジェクト設定
├── package-lock.json          # 依存関係ロック
├── tsconfig.json              # TypeScript設定
├── README.md                  # プロジェクト概要
├── guide.js                   # インタラクティブガイド
├── test-excel.js              # Excel動作テスト
└── test.xlsx                  # テスト用Excelファイル
```

## 🚀 クイックスタート

1. **依存関係インストール**
   ```bash
   npm install
   ```

2. **プロジェクトビルド**
   ```bash
   npm run build
   ```

3. **サーバー起動**
   ```bash
   npm start
   ```

## 📖 詳細ガイド

各項目の詳細は以下のファイルを参照してください：

1. **[MCP基礎知識](./01-basics.md)** - MCPとはなにか、仕組みを理解
2. **[セットアップ手順](./02-setup.md)** - 開発環境の構築方法
3. **[使用方法](./03-usage.md)** - 実際の使い方と例
4. **[ツール詳細](./04-tools.md)** - 各Excel操作ツールの説明
5. **[トラブルシューティング](./05-troubleshooting.md)** - よくある問題と解決方法
6. **[サンプル集](./06-samples.md)** - 実用的な使用例集
7. **[API仕様書](./07-api-specification.md)** - 引数の詳細仕様と正しい使用例

## 🎯 このプロジェクトでできること

- ✅ Excelワークブックの作成・編集
- ✅ セルへのデータ入力・取得
- ✅ セル範囲の一括操作
- ✅ セルの書式設定（フォント、色、罫線）
- ✅ 数式の追加・計算
- ✅ データの検索・フィルタリング
- ✅ CSV形式でのエクスポート

## 🔧 開発者向け情報

### 技術スタック
- **言語**: TypeScript
- **ランタイム**: Node.js
- **MCP SDK**: @modelcontextprotocol/sdk
- **Excel操作**: ExcelJS
- **スキーマ検証**: Zod

### アーキテクチャ
```
AIエージェント (Claude等)
    ↓ MCP Protocol
Excel MCP Server
    ↓ ExcelJS Library
Excel ファイル (.xlsx)
```

## 📞 サポート・質問

このガイドでわからないことがあれば：
1. まず [トラブルシューティング](./05-troubleshooting.md) を確認
2. 各詳細ガイドを参照
3. プロジェクトのREADME.mdも参照

Happy Excel automation! 🎉
