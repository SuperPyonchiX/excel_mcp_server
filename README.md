# Excel MCP Server

AIエージェントがExcelを自由に操作できるModel Context Protocol (MCP) サーバーです。

## 📚 詳細ガイド

**初心者の方は `guide/` ディレクトリの詳細ガイドを参照してください：**

- 📖 **[メインガイド](./guide/README.md)** - プロジェクト全体の概要
- 🎓 **[MCP基礎知識](./guide/01-basics.md)** - MCPとは何か、仕組みの理解
- ⚙️ **[セットアップ手順](./guide/02-setup.md)** - 開発環境の構築方法
- 🚀 **[使用方法](./guide/03-usage.md)** - 実際の使い方と例
- 🔧 **[ツール詳細](./guide/04-tools.md)** - 各Excel操作ツールの詳細説明
- 🛠️ **[トラブルシューティング](./guide/05-troubleshooting.md)** - よくある問題と解決方法
- 📋 **[サンプル集](./guide/06-samples.md)** - 実用的な使用例集

## 機能

このMCPサーバーは以下のExcel操作機能を提供します：

### ワークブック・ワークシート操作
- `create_workbook` - 新しいExcelワークブックを作成
- `get_workbook_info` - ワークブックの詳細情報を取得
- `add_worksheet` - ワークシートを追加

### セル・範囲操作
- `set_cell_value` - セルに値を設定
- `get_cell_value` - セルの値を取得
- `set_range_values` - 範囲に2次元配列データを設定
- `get_range_values` - 範囲のデータを取得

### 書式設定
- `format_cell` - セルの書式（フォント、塗りつぶし、罫線）を設定

### 数式・計算
- `add_formula` - セルに数式を追加

### データ操作
- `find_data` - ワークシート内でデータを検索

### 出力
- `export_to_csv` - ワークシートをCSVファイルにエクスポート

## セットアップ

1. 依存関係をインストール：
```bash
npm install
```

2. TypeScriptをコンパイル：
```bash
npm run build
```

3. サーバーを起動：
```bash
npm start
```

## 開発

開発モード（コンパイル後に実行）：
```bash
npm run dev
```

## 使用例

MCPクライアントから以下のようにツールを呼び出せます：

```javascript
// 新しいワークブックを作成
await callTool("create_workbook", {
  filePath: "C:/path/to/workbook.xlsx"
});

// ワークシートを追加
await callTool("add_worksheet", {
  filePath: "C:/path/to/workbook.xlsx",
  sheetName: "Sheet1"
});

// セルに値を設定
await callTool("set_cell_value", {
  filePath: "C:/path/to/workbook.xlsx",
  sheetName: "Sheet1",
  cell: "A1",
  value: "Hello, Excel!"
});

// 範囲にデータを設定
await callTool("set_range_values", {
  filePath: "C:/path/to/workbook.xlsx",
  sheetName: "Sheet1",
  startCell: "A1",
  values: [
    ["名前", "年齢", "職業"],
    ["田中", 30, "エンジニア"],
    ["佐藤", 25, "デザイナー"]
  ]
});

// セルの書式を設定
await callTool("format_cell", {
  filePath: "C:/path/to/workbook.xlsx",
  sheetName: "Sheet1",
  cell: "A1",
  format: {
    font: {
      bold: true,
      size: 14,
      color: "FF0000FF"
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: "FFFF00"
    }
  }
});
```

## 技術仕様

- **言語**: TypeScript
- **ランタイム**: Node.js
- **MCP SDK**: @modelcontextprotocol/sdk
- **Excel ライブラリ**: ExcelJS
- **スキーマ検証**: Zod

## VS Code での デバッグ

このプロジェクトはVS Codeでデバッグできるように設定されています。`.vscode/mcp.json`ファイルにMCPサーバーの設定が含まれています。

## ライセンス

ISC
