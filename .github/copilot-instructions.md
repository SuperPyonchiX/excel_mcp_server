<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Excel MCP Server プロジェクト

このプロジェクトは、AIエージェントがExcelファイルを自由に操作できるModel Context Protocol (MCP) サーバーです。

## プロジェクトの特徴

- TypeScriptで実装されたMCPサーバー
- ExcelJSライブラリを使用してExcelファイルを操作
- 豊富なExcel操作機能（ワークブック/ワークシート作成、セル操作、書式設定、数式、検索、CSV出力など）
- Zodスキーマによる型安全な引数検証

## 開発時の注意点

- ES Moduleを使用しているため、importは `.js` 拡張子を含める
- すべてのツールは非同期関数として実装する
- エラーハンドリングはMcpErrorを使用する
- パラメータ検証はZodスキーマを使用する

## 参考情報

- MCP SDK: https://github.com/modelcontextprotocol/create-python-server
- ExcelJS: https://github.com/exceljs/exceljs
- Model Context Protocol: https://modelcontextprotocol.io/llms-full.txt
