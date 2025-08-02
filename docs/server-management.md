# 🖥️ MCPサーバー管理ガイド

Excel MCP Serverの起動・停止・管理方法について説明します。

## 📊 サーバーの状態確認

### クイックステータス確認
```bash
node scripts/quick-status.js
```

### 詳細なプロセス確認
```bash
npm run server:list
```

### サーバーステータス表示  
```bash
npm run server:status
```

## 🚀 サーバーの起動

### 基本的な起動方法
```bash
# 標準的な起動
npm start

# 開発モード（自動ビルド）
npm run dev

# 管理機能付き起動
npm run server:start
```

### バックグラウンド起動（Windows）
```bash
# PowerShellの場合
Start-Process npm -ArgumentList "start" -WindowStyle Hidden

# コマンドプロンプトの場合
start /B npm start
```

## 🛑 サーバーの終了

### 1. **実行中のターミナルで終了**
```
Ctrl + C
```

### 2. **別のターミナルから終了**
```bash
npm run server:stop
```

### 3. **特定のプロセスを終了**
```bash
# プロセス一覧を確認
npm run server:list

# 特定のPIDを終了
taskkill /PID <PID番号> /F
```

### 4. **全てのNode.jsプロセスを終了（注意）**
```bash
npm run server:kill
```

⚠️ **警告**: この方法は他のNode.jsアプリケーションも終了させる可能性があります。

## 🔍 トラブルシューティング

### サーバーが応答しない場合

1. **プロセス確認**
   ```bash
   tasklist /FI "IMAGENAME eq node.exe"
   ```

2. **ポート使用状況確認**
   ```bash
   netstat -ano | findstr :3000
   ```

3. **強制終了**
   ```bash
   taskkill /IM node.exe /F
   ```

### よくある問題と解決方法

#### **問題**: サーバーが起動しない
```bash
# 解決手順
npm run build          # TypeScriptをビルド
node dist/index.js     # 直接起動してエラー確認
```

#### **問題**: ポートが既に使用されている
```bash
# 使用中のポートを確認
netstat -ano | findstr :3000

# プロセスを終了
taskkill /PID <PID> /F
```

#### **問題**: 複数のサーバーが起動している
```bash
# 全Node.jsプロセスを確認
npm run server:list

# 不要なプロセスを個別に終了
taskkill /PID <PID> /F
```

## 🔧 開発時のワークフロー

### 推奨手順

1. **開発開始時**
   ```bash
   node scripts/quick-status.js  # 状態確認
   npm run dev                   # 開発モードで起動
   ```

2. **コード変更後**
   ```bash
   # 自動で再ビルド・再起動（devモード使用時）
   # または手動で：
   npm run server:stop
   npm run build
   npm run server:start
   ```

3. **作業終了時**
   ```bash
   npm run server:stop  # サーバー停止
   ```

### VS Code統合

VS Codeのタスクとして登録済み：

- `Ctrl+Shift+P` → "Tasks: Run Task"
- "Build and Run Excel MCP Server" を選択

## 📈 モニタリング

### リアルタイム監視
```bash
# Windows
wmic process where "name='node.exe'" get ProcessId,CommandLine,PageFileUsage /format:table

# 継続監視（PowerShell）
while($true) { 
    Get-Process node -ErrorAction SilentlyContinue | Format-Table
    Start-Sleep -Seconds 5 
}
```

### ログ監視
MCPサーバーは標準出力にログを出力します：
```bash
npm start > server.log 2>&1  # ログをファイルに保存
tail -f server.log           # リアルタイムでログを確認（Git Bashなど）
```

## 🚨 緊急時の対処

### 全てのMCPサーバーを強制終了
```bash
# 警告: 他のNode.jsアプリも終了します
taskkill /IM node.exe /F

# より安全な方法
npm run server:kill
```

### システムリソース確認
```bash
# メモリ使用量確認
tasklist /FI "IMAGENAME eq node.exe" /FO TABLE

# CPU使用率確認（PowerShell）
Get-Process node | Select-Object Name,CPU,WorkingSet
```

## 📋 管理コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm start` | 基本的なサーバー起動 |
| `npm run dev` | 開発モード起動 |
| `npm run server:start` | 管理機能付きサーバー起動 |
| `npm run server:stop` | サーバー停止 |
| `npm run server:status` | サーバー状態表示 |
| `npm run server:list` | プロセス一覧表示 |
| `npm run server:kill` | 全Node.jsプロセス終了 |
| `node scripts/quick-status.js` | クイックステータス確認 |
