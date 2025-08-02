#!/usr/bin/env node

/**
 * MCP基本機能テスト
 * MCPサーバーとの通信とツールリストの取得をテストします
 */

import { spawn } from 'child_process';

/**
 * MCPサーバーの基本機能をテストする
 */
async function testMCPBasicFunctions() {
    console.log('=== MCP基本機能テスト ===\n');
    console.log('📡 MCPサーバーを起動しています...\n');

    // MCPサーバーを起動
    const server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'inherit']
    });

    let responseCount = 0;

    // レスポンス処理
    server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                responseCount++;
                
                console.log(`📥 レスポンス ${responseCount}:`);
                
                // JSON応答の全情報を表示
                console.log('🔍 完全なJSON応答:');
                console.log(JSON.stringify(response, null, 2));
                
                if (response.result?.tools) {
                    console.log(`\n✅ ツール数: ${response.result.tools.length}`);
                    console.log('📋 利用可能なツール:');
                    response.result.tools.forEach((tool, index) => {
                        console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
                    });
                }
                
                console.log(''); // 空行
                
            } catch (e) {
                console.log('📝 サーバーログ:', line.trim());
            }
        });
        
        // テスト完了後にサーバーを終了
        setTimeout(() => {
            server.kill();
            console.log('🎉 基本機能テスト完了');
            console.log(`📊 受信レスポンス数: ${responseCount}`);
            process.exit(0);
        }, 1000);
    });

    // エラーハンドリング
    server.on('error', (err) => {
        console.error('❌ サーバー起動エラー:', err);
        process.exit(1);
    });

    // ツールリスト要求を送信
    console.log('📤 ツールリスト要求を送信中...');
    const toolsListRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
    };
    
    server.stdin.write(JSON.stringify(toolsListRequest) + '\n');
}

// テスト実行
testMCPBasicFunctions().catch(console.error);
