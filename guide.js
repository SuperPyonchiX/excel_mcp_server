import { spawn } from "child_process";
import fs from "fs";

console.log("=== Excel MCP Server 使用ガイド ===\n");

console.log("📚 詳細なガイドが利用可能です！");
console.log("   guide/ ディレクトリに以下のファイルがあります：");
console.log("   📖 README.md - メインガイド");
console.log("   🎓 01-basics.md - MCP基礎知識");
console.log("   ⚙️ 02-setup.md - セットアップ手順");
console.log("   🚀 03-usage.md - 使用方法");
console.log("   🔧 04-tools.md - ツール詳細");
console.log("   🛠️ 05-troubleshooting.md - トラブルシューティング");
console.log("   📋 06-samples.md - サンプル集\n");

console.log("1. このMCPサーバーは以下のツールを提供します：");
console.log("   - create_workbook: 新しいExcelワークブックを作成");
console.log("   - add_worksheet: ワークシートを追加");
console.log("   - set_cell_value: セルに値を設定");
console.log("   - get_cell_value: セルの値を取得");
console.log("   - set_range_values: 範囲に2次元配列データを設定");
console.log("   - get_range_values: 範囲のデータを取得");
console.log("   - format_cell: セルの書式を設定");
console.log("   - add_formula: セルに数式を追加");
console.log("   - find_data: データを検索");
console.log("   - export_to_csv: CSVにエクスポート\n");

console.log("2. MCPサーバーの起動方法：");
console.log("   npm start または node dist/index.js\n");

console.log("3. VS Code での デバッグ：");
console.log("   .vscode/mcp.json ファイルに設定済み\n");

console.log("4. テスト用サンプルファイル：");
if (fs.existsSync("./test.xlsx")) {
  console.log("   ✓ test.xlsx が作成されています");
} else {
  console.log("   test.xlsx を作成するには: node test-excel.js");
}

console.log("\n=== サーバーを起動してテストしますか？ (y/n) ===");

process.stdin.setEncoding('utf8');
process.stdin.once('data', (data) => {
  const input = data.toString().trim().toLowerCase();
  if (input === 'y' || input === 'yes') {
    console.log("\nMCPサーバーを起動しています...");
    console.log("終了するには Ctrl+C を押してください。\n");
    
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: 'inherit'
    });
    
    serverProcess.on('error', (err) => {
      console.error('サーバー起動エラー:', err);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`\nサーバーが終了しました (終了コード: ${code})`);
    });
  } else {
    console.log("MCPサーバーのセットアップが完了しました！");
    console.log("準備ができたら 'npm start' で起動してください。");
    process.exit(0);
  }
});
