# 🎓 MCP基礎知識

## MCPとは何か？

**Model Context Protocol (MCP)** は、AI言語モデルが外部のツールやデータソースと安全に連携するための標準プロトコルです。

### なぜMCPが必要なの？

AI（ChatGPT、Claude等）は基本的にテキストの生成しかできません。しかし実際の作業では：
- ファイルの読み書き
- データベースへのアクセス  
- Webサービスとの連携
- 計算処理

などが必要です。MCPはこれらを可能にします。

## MCPの基本構造

```
┌─────────────────┐    MCP Protocol    ┌─────────────────┐
│   AIエージェント   │ ←─────────────→ │   MCPサーバー    │
│  (Claude等)     │                   │  (Excel操作)    │
└─────────────────┘                   └─────────────────┘
                                              │
                                              ▼
                                      ┌─────────────────┐
                                      │  実際のリソース   │
                                      │  (Excelファイル) │
                                      └─────────────────┘
```

### 主要コンポーネント

1. **MCPクライアント** (AI側)
   - AIエージェントが使用
   - サーバーにツールの実行を要求

2. **MCPサーバー** (このプロジェクト)
   - 具体的な機能を提供
   - ツールのリストと実行方法を定義

3. **ツール**
   - サーバーが提供する個別の機能
   - 例：`create_workbook`, `set_cell_value`

## MCPプロトコルの流れ

### 1. ツールリスト取得
```
AI → サーバー: "どんなツールがありますか？"
サーバー → AI: "Excel作成、セル編集、データ検索などができます"
```

### 2. ツール実行要求
```
AI → サーバー: "新しいExcelファイルを作成して"
サーバー: Excelファイルを作成
サーバー → AI: "作成完了しました"
```

## このプロジェクトでのMCP実装

### サーバー側（index.ts）
```typescript
// ツールリストを定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_workbook",
        description: "新しいExcelワークブックを作成します",
        inputSchema: CreateWorkbookSchema,
      },
      // ... 他のツール
    ],
  };
});

// ツール実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "create_workbook":
      const result = await createWorkbook(filePath);
      return { content: [{ type: "text", text: result }] };
  }
});
```

### 通信方式
- **Stdio**: 標準入出力を使用（このプロジェクトで使用）
- **HTTP**: HTTPサーバーとして動作
- **WebSocket**: リアルタイム通信

## MCPの利点

1. **標準化**: 統一されたプロトコルで異なるAIと連携
2. **セキュリティ**: 制御された方法でのリソースアクセス
3. **拡張性**: 新しいツールを簡単に追加可能
4. **再利用性**: 一度作ったサーバーを複数のAIで使用可能

## 次のステップ

MCPの基本を理解したら、次は[セットアップ手順](./02-setup.md)に進んでください。
