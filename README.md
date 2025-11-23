# Excel MCP Server

AIエージェント（Claude、ChatGPT、Copilotなど）がExcelファイルを自動操作できるModel Context Protocol (MCP) サーバーです。

## 🎯 できること

このMCPサーバーを使うと、AIエージェントに自然言語で指示するだけで、以下のようなExcel操作が自動化できます：

- 📊 **データ入力・編集**: セルや範囲に値を設定、取得
- 📝 **ワークブック管理**: 新規作成、シート追加、情報取得
- 🎨 **書式設定**: フォント、色、罫線などの装飾
- 🔢 **数式・計算**: セルに数式を追加して自動計算
- 🔍 **データ検索**: ワークシート内のデータを検索
- 💾 **データ出力**: ExcelシートをCSVファイルにエクスポート

**例**: 「売上データを分析して、月別の合計を計算し、グラフ用のシートを作成して」と指示すれば、AIが自動的にExcelファイルを操作します。

## 📚 詳細ガイド

**初心者の方は `guide/` ディレクトリの詳細ガイドを参照してください：**

- 📖 **[メインガイド](./guide/README.md)** - プロジェクト全体の概要
- 🎓 **[MCP基礎知識](./guide/01-basics.md)** - MCPとは何か、仕組みの理解
- ⚙️ **[セットアップ手順](./guide/02-setup.md)** - 環境構築方法
- 🚀 **[使用方法](./guide/03-usage.md)** - 実際の使い方と例
- 🔧 **[ツール詳細](./guide/04-tools.md)** - 各Excel操作ツールの詳細
- 🛠️ **[トラブルシューティング](./guide/05-troubleshooting.md)** - よくある問題と解決方法
- 📋 **[サンプル集](./guide/06-samples.md)** - 実用的な使用例集

## 🚀 セットアップ手順

### 1. 必要な環境

- Node.js (v16以降)
- Windows、macOS、またはLinux

### 2. インストール

```bash
# ディレクトリ移動
cd excel_mcp_server

# 依存関係をインストール
npm install

# ビルド
npm run build
```

### 3. VS Code Copilotとの連携設定

VS CodeでCopilotと連携する場合、`mcp.json`ファイルに設定を追加します。

**設定ファイルの場所**: 
- **Windows**: `%APPDATA%\Code\User\mcp.json` (安定版) または `%APPDATA%\Code - Insiders\User\mcp.json` (Insiders版)
- **macOS**: `~/Library/Application Support/Code/User/mcp.json` または `~/Library/Application Support/Code - Insiders/User/mcp.json`
- **Linux**: `~/.config/Code/User/mcp.json` または `~/.config/Code - Insiders/User/mcp.json`

**設定内容**:
```json
{
  "servers": {
    "excel-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/path/to/excel_mcp_server/dist/index.js"]
    }
  }
}
```

**重要**: `C:/path/to/excel_mcp_server/dist/index.js` は、実際のプロジェクトの `dist/index.js` への絶対パスに置き換えてください。

### 4. 動作確認

VS Codeを再起動後、Copilotに以下のように話しかけてみてください：

```
「ExcelファイルC:/test/sample.xlsxを作成して、Sheet1を追加し、A1セルに"Hello Excel"と入力してください」
```

## 💡 使用例

### 基本的な操作

1. **新しいExcelファイルを作成**
   ```
   「C:/reports/monthly.xlsxという新しいExcelファイルを作成して」
   ```

2. **データを入力**
   ```
   「Sheet1のA1からC3の範囲に、商品名、価格、在庫数の表を作成して」
   ```

3. **書式を設定**
   ```
   「A1セルを太字にして、背景色を黄色にして」
   ```

4. **数式で計算**
   ```
   「D列に合計を計算する数式を追加して」
   ```

### より高度な使い方

詳細な使用例は [サンプル集](./guide/06-samples.md) を参照してください。

## 🔧 提供される機能

このMCPサーバーは以下のExcel操作ツールを提供します：

### ワークブック・ワークシート操作
- `create_workbook` - 新しいExcelワークブックを作成
- `get_workbook_info` - ワークブックの詳細情報を取得（シート一覧など）
- `add_worksheet` - 既存のワークブックにワークシートを追加

### セル・範囲操作
- `set_cell_value` - 単一のセルに値を設定
- `get_cell_value` - 単一のセルの値を取得
- `set_range_values` - 複数セルに一括でデータを設定（表形式データに便利）
- `get_range_values` - 複数セルのデータを一括取得

### 書式設定
- `format_cell` - セルの書式を設定（フォント、背景色、罫線など）

### 数式・計算
- `add_formula` - セルに数式を追加（SUM、AVERAGEなど）

### データ操作
- `find_data` - ワークシート内で特定のデータを検索

### 出力
- `export_to_csv` - ワークシートをCSVファイルにエクスポート

詳細は [ツール詳細ガイド](./guide/04-tools.md) を参照してください。

## 🛠️ トラブルシューティング

問題が発生した場合は、[トラブルシューティングガイド](./guide/05-troubleshooting.md) を確認してください。

## 📄 ライセンス

ISC

---

## 開発者向け情報

### 開発環境のセットアップ

開発モードで実行：
```bash
npm run dev
```

### プロジェクト構造

### プロジェクト構造

- **言語**: TypeScript
- **ランタイム**: Node.js
- **MCP SDK**: @modelcontextprotocol/sdk
- **Excel ライブラリ**: ExcelJS
- **スキーマ検証**: Zod

### デバッグ

VS Codeでのデバッグ設定は `.vscode/mcp.json` に含まれています。
