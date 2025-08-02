# 🚀 使用方法

## MCPサーバーの起動

### 基本的な起動方法
```bash
npm start
```

または直接実行：
```bash
node dist/index.js
```

### 開発モード（自動再ビルド）
```bash
npm run dev
```

## AIエージェントとの連携

### Claude Desktop での使用例

1. **Claude Desktop の設定ファイルに追加**
   
   設定ファイルの場所：
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "excel-server": {
         "command": "node",
         "args": ["C:/path/to/Excel/dist/index.js"]
       }
     }
   }
   ```

2. **Claude Desktop を再起動**

3. **AIに指示を出す**
   ```
   新しいExcelファイルを作成して、
   売上データを入力してください
   ```

## 基本的な使用パターン

### パターン1: 新しいワークブック作成
```
AI指示: "新しいExcelファイル 'sales.xlsx' を作成して"

内部処理:
1. create_workbook ツールが呼び出される
2. ExcelJSでワークブックを作成
3. ファイルを保存
```

### パターン2: データ入力
```
AI指示: "A1セルに '商品名'、B1セルに '価格' と入力して"

内部処理:
1. set_cell_value ツールが2回呼び出される
2. 各セルに値を設定
3. ファイルを保存
```

### パターン3: 範囲データ入力
```
AI指示: "以下のデータをA1から入力して：
名前    年齢    職業
田中    30     エンジニア
佐藤    25     デザイナー"

内部処理:
1. set_range_values ツールが呼び出される
2. 2次元配列としてデータを設定
3. ファイルを保存
```

## 実際の使用例

### 例1: 売上レポート作成

**AI指示:**
```
月次売上レポートを作成してください。
ファイル名は "monthly_sales.xlsx" で、
以下の情報を含めてください：

商品名 | 1月 | 2月 | 3月 | 合計
------|-----|-----|-----|-----
商品A | 100 | 120 | 110 | =SUM(B2:D2)
商品B | 80  | 90  | 95  | =SUM(B3:D3)

ヘッダー行は太字にしてください。
```

**実行される処理:**
1. `create_workbook("monthly_sales.xlsx")`
2. `set_range_values` でデータ入力
3. `add_formula` で合計計算
4. `format_cell` でヘッダーを太字化

### 例2: データ分析

**AI指示:**
```
既存のファイル "data.xlsx" から
"売上" が 100以上のデータを
新しいシート "高売上" に抽出してください
```

**実行される処理:**
1. ファイルを読み込み
2. `find_data` で条件に合うデータを検索
3. `add_worksheet("高売上")` で新しいシート作成
4. `set_range_values` で抽出データを設定

## インタラクティブガイドの使用

プロジェクトには対話的なガイドが含まれています：

```bash
node guide.js
```

これにより以下が可能です：
- ツール一覧の確認
- サーバーの起動テスト
- サンプルファイルの確認

## コマンドライン使用例

### 直接的なMCP通信テスト

MCPサーバーは標準入出力で通信するため、以下のようにテストできます：

```bash
# サーバーを起動
node dist/index.js
```

```json
// 標準入力でツールリスト要求
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

```json
// ツール実行要求例
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_workbook",
    "arguments": {
      "filePath": "test.xlsx"
    }
  }
}
```

## VS Code での開発・デバッグ

### タスクの実行
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. "Build and Run Excel MCP Server" を選択

### デバッグ設定
`.vscode/mcp.json` の設定により、VS CodeのMCP拡張機能から直接デバッグが可能です。

## よくある使用パターン

### 1. データ変換
- CSV → Excel変換
- 複数シートの統合
- データクリーニング

### 2. レポート生成
- 定期レポートの自動作成
- グラフ・チャートの挿入
- 書式の統一

### 3. データ分析支援
- 条件に基づくフィルタリング
- 統計計算
- データの可視化

## 次のステップ

基本的な使用方法を理解したら、[ツール詳細](./04-tools.md)で各機能の詳細を確認しましょう。
