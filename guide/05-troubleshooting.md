# 🔧 トラブルシューティング

## よくある問題と解決方法

### インストール・セットアップ関連

#### 1. `npm install` でエラーが発生する

**症状:**
```bash
npm ERR! code EACCES
npm ERR! errno -4048
```

**原因:**
- 権限不足
- ネットワーク接続の問題
- npmキャッシュの破損

**解決方法:**
```bash
# 1. 管理者権限で実行 (Windows)
# PowerShellを管理者として実行

# 2. npmキャッシュをクリア
npm cache clean --force

# 3. node_modulesを削除して再インストール
rmdir /s node_modules  # Windows
rm -rf node_modules    # Mac/Linux
npm install
```

#### 2. TypeScriptコンパイルエラー

**症状:**
```bash
error TS2307: Cannot find module '@modelcontextprotocol/sdk'
```

**解決方法:**
```bash
# 1. node_modulesとpackage-lock.jsonを削除
del package-lock.json
rmdir /s node_modules

# 2. 再インストール
npm install

# 3. TypeScript設定確認
npx tsc --noEmit  # コンパイルチェックのみ
```

#### 3. Node.jsバージョンの問題

**症状:**
```bash
error: The engine "node" is incompatible with this module
```

**解決方法:**
```bash
# Node.jsバージョン確認
node --version

# v18以上が必要です
# 公式サイトから最新版をダウンロード: https://nodejs.org/
```

---

### MCPサーバー実行時の問題

#### 4. サーバーが起動しない

**症状:**
```bash
node dist/index.js
# 何も表示されない、またはエラー
```

**診断手順:**
```bash
# 1. ビルドファイルの確認
dir dist  # Windows
ls dist   # Mac/Linux

# 2. 直接的なエラーチェック
node -e "console.log('Node.js動作確認')"

# 3. TypeScriptコンパイル確認
npm run build
```

**解決方法:**
```bash
# 1. 強制的に再ビルド
npm run build

# 2. ソースファイルの構文チェック
npx tsc --noEmit

# 3. 依存関係の再インストール
npm ci
```

#### 5. MCP通信エラー

**症状:**
```
エラー: 無効なパラメータ: filePath: Required
```

**原因:**
- パラメータの型が不正
- 必須パラメータが不足
- JSONフォーマットが不正

**解決方法:**
```json
// 正しいパラメータ例
{
  "name": "create_workbook",
  "arguments": {
    "filePath": "C:\\path\\to\\file.xlsx"  // Windowsでは\\を使用
  }
}
```

---

### Excel操作関連の問題

#### 6. ファイルが見つからない

**症状:**
```
エラー: ワークブック読み込みエラー: ENOENT: no such file or directory
```

**解決方法:**
```bash
# 1. 絶対パスを使用
# ❌ 相対パス: "data.xlsx"
# ✅ 絶対パス: "C:\\Users\\Username\\Documents\\data.xlsx"

# 2. ファイル存在確認
dir "C:\path\to\file.xlsx"  # Windows
ls "/path/to/file.xlsx"     # Mac/Linux

# 3. ファイル権限確認
# ファイルが他のアプリケーションで開かれていないか確認
```

#### 7. ワークシートが見つからない

**症状:**
```
エラー: ワークシート 'Sheet2' が見つかりません。
```

**診断:**
```javascript
// 既存シート名を確認するテストスクリプト
const ExcelJS = require('exceljs');
async function checkSheets() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('your-file.xlsx');
  console.log('利用可能なシート:');
  workbook.eachSheet((worksheet) => {
    console.log(`- "${worksheet.name}"`);
  });
}
checkSheets();
```

#### 8. セル位置の指定エラー

**症状:**
```
エラー: 無効なセル位置: 'A'
```

**正しいセル位置の指定:**
```
✅ 正しい: "A1", "B2", "AA10", "Z99"
❌ 間違い: "A", "1", "a1", "A1:B2"
```

#### 9. 大きなファイルの処理が遅い

**症状:**
- 処理が数分かかる
- メモリ不足エラー

**最適化方法:**
```javascript
// 大量データの場合は分割処理
const chunkSize = 1000;
for (let i = 0; i < data.length; i += chunkSize) {
  const chunk = data.slice(i, i + chunkSize);
  await setRangeValues(filePath, sheetName, `A${i+1}`, chunk);
}
```

---

### VS Code・デバッグ関連

#### 10. VS Codeでタスクが実行できない

**症状:**
```
Tasks: Run Task で何も表示されない
```

**解決方法:**
```bash
# 1. .vscode/tasks.json の存在確認
dir .vscode\tasks.json

# 2. 手動でタスクファイルを再作成
# Ctrl+Shift+P → "Configure Task"

# 3. ワークスペースの再読み込み
# Ctrl+Shift+P → "Developer: Reload Window"
```

#### 11. MCP設定が認識されない

**症状:**
```
.vscode/mcp.json が無視される
```

**解決方法:**
```json
// .vscode/mcp.json の内容確認
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

---

### AI連携の問題

#### 12. Claude DesktopでMCPサーバーが認識されない

**症状:**
- Excelツールが利用できない
- サーバー接続エラー

**解決方法:**
```json
// Claude Desktop設定ファイル
// Windows: %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "excel-server": {
      "command": "node",
      "args": ["C:\\full\\path\\to\\Excel\\dist\\index.js"],
      "env": {}
    }
  }
}
```

**注意点:**
- フルパスを使用する
- 設定後にClaude Desktopを再起動
- サーバーが正常にビルドされていることを確認

#### 13. AI指示が理解されない

**症状:**
- 「そのツールは利用できません」
- 期待した操作が実行されない

**改善方法:**
```
❌ 曖昧な指示:
"Excelでなんかやって"

✅ 具体的な指示:
"新しいExcelファイル 'report.xlsx' を作成して、
A1セルに 'タイトル' と入力してください"
```

---

### パフォーマンス・メモリ問題

#### 14. メモリ不足エラー

**症状:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**解決方法:**
```bash
# Node.jsヒープサイズを増加
node --max-old-space-size=4096 dist/index.js

# または package.json のスクリプトを変更
"start": "node --max-old-space-size=4096 dist/index.js"
```

#### 15. 処理が異様に遅い

**診断:**
```javascript
// 処理時間の測定
console.time('Excel処理');
await someExcelOperation();
console.timeEnd('Excel処理');
```

**最適化:**
- 一度に大量のデータを処理する際は `set_range_values` を使用
- 不要な書式設定は避ける
- ファイルの読み書き回数を最小限に

---

### 緊急時の対処

#### システム全体のリセット

```bash
# 1. 全プロセス終了
taskkill /f /im node.exe

# 2. プロジェクト完全リセット
del package-lock.json
rmdir /s node_modules
rmdir /s dist

# 3. 再インストール・ビルド
npm install
npm run build

# 4. テスト実行
node test-excel.js
```

#### ログの確認

```bash
# コンソールログの保存
npm start > server.log 2>&1

# ログファイルの内容確認
type server.log  # Windows
cat server.log   # Mac/Linux
```

---

### サポート・コミュニティ

#### 追加のヘルプが必要な場合

1. **公式ドキュメント**
   - [Model Context Protocol](https://modelcontextprotocol.io/)
   - [ExcelJS](https://github.com/exceljs/exceljs)

2. **GitHub Issues**
   - プロジェクトのIssuesセクションで質問

3. **ログの提供**
   - エラーメッセージの完全なコピー
   - 実行環境の情報（OS、Node.jsバージョン）
   - 再現手順

#### 問題報告テンプレート

```markdown
## 環境情報
- OS: Windows 11 / macOS / Ubuntu
- Node.js: v18.x.x
- npm: v9.x.x

## 問題の詳細
[具体的な症状を記載]

## 再現手順
1. npm install を実行
2. npm run build を実行
3. [問題が発生する操作]

## エラーメッセージ
```
[エラーの完全なコピー]
```

## 期待する動作
[正常に動作すべき内容]
```

この包括的なトラブルシューティングガイドにより、ほとんどの問題を解決できるはずです。それでも解決しない場合は、詳細な情報とともにサポートに連絡してください。
