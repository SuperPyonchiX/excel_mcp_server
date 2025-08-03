# Excel MCP Server テストスイート

このディレクトリには、Excel MCP Serverの各種テストファイルが含まれています。

## 📋 テストファイル一覧

### 1. `mcp-basic-test.js`
- **目的**: MCP基本機能のテスト
- **テスト内容**:
  - MCPサーバーの起動確認
  - ツールリストの取得
  - JSONRPC通信の確認

```bash
node test/mcp-basic-test.js
```

### 2. `excel-integration-test.js`
- **目的**: Excel操作の統合テスト
- **テスト内容**:
  - ワークブック作成・操作
  - セル値設定・取得
  - 範囲データ操作
  - 書式設定
  - 数式追加
  - CSV出力

```bash
node test/excel-integration-test.js
```

### 3. `tool-individual-test.js`
- **目的**: 各ツールの個別機能テスト
- **テスト内容**:
  - 全11ツールの個別テスト
  - エラーハンドリング確認
  - 詳細な結果レポート

```bash
node test/tool-individual-test.js
```

## 🗂️ 出力ディレクトリ

テスト実行時に `test/output/` ディレクトリが作成され、以下のファイルが生成されます：

- `test-workbook.xlsx` - 統合テスト用Excelファイル
- `tool-test.xlsx` - 個別テスト用Excelファイル
- `test-export.csv` - CSV出力テスト結果
- `tool-test.csv` - 個別テスト用CSV出力

## 🚀 全テスト実行

すべてのテストを順次実行する場合：

```bash
# 基本機能テスト
node test/mcp-basic-test.js

# 統合テスト
node test/excel-integration-test.js

# 個別ツールテスト
node test/tool-individual-test.js
```

## 📊 テスト結果の見方

### ✅ 成功例
```
✅ [1] Excelワークブック 'test.xlsx' を作成しました。
```

### ❌ エラー例
```
❌ [2] エラー: ワークシート 'Sheet1' が見つかりません。
```

### 📝 ログ例
```
📝 Excel MCP Server が開始されました
```

## 🔧 トラブルシューティング

### よくある問題

1. **サーバーが起動しない**
   ```bash
   npm run build  # TypeScriptをビルド
   ```

2. **ファイル作成エラー**
   - 出力ディレクトリの権限を確認
   - ファイルパスの絶対パス指定を確認

3. **タイムアウトエラー**
   - `TEST_CONFIG.timeout` の値を増加
   - システムの負荷状況を確認

## 📈 継続的テスト

開発時の継続的テストには以下のワークフローを推奨：

1. **コード変更後**
   ```bash
   npm run build && node test/mcp-basic-test.js
   ```

2. **機能追加後**
   ```bash
   node test/tool-individual-test.js
   ```

3. **リリース前**
   ```bash
   node test/excel-integration-test.js
   ```
