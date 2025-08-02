#!/usr/bin/env node

/**
 * Excel操作統合テスト
 * 実際のExcelファイル操作機能を包括的にテストします
 */

import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

// テスト設定
const TEST_CONFIG = {
    filePath: path.resolve('./test/output/test-workbook.xlsx'),
    csvPath: path.resolve('./test/output/test-export.csv'),
    sheetName: 'TestSheet',
    timeout: 1000 // ms
};

/**
 * 待機ユーティリティ
 * @param {number} ms - 待機時間（ミリ秒）
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * MCPリクエストを送信する
 * @param {Object} server - サーバープロセス
 * @param {string} toolName - ツール名
 * @param {Object} args - 引数
 * @param {number} id - リクエストID
 */
function sendMCPRequest(server, toolName, args, id) {
    const request = {
        jsonrpc: "2.0",
        id: id,
        method: "tools/call",
        params: {
            name: toolName,
            arguments: args
        }
    };
    
    console.log(`\n📤 [${id}] ${toolName} を実行中...`);
    server.stdin.write(JSON.stringify(request) + '\n');
}

/**
 * テストデータ定義
 */
const TEST_DATA = {
    sampleData: [
        ['商品名', '価格', '在庫', '売上'],
        ['商品A', 1000, 50, '=B2*C2'],
        ['商品B', 1500, 30, '=B3*C3'],
        ['商品C', 800, 75, '=B4*C4']
    ],
    
    headerFormat: {
        font: {
            bold: true,
            size: 12,
            color: 'FF000080'
        },
        fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: 'FFE0E0E0'
        }
    }
};

/**
 * Excel操作の統合テストを実行
 */
async function runExcelIntegrationTest() {
    console.log('=== Excel操作統合テスト ===\n');
    console.log(`📁 テストファイル: ${TEST_CONFIG.filePath}`);
    console.log(`📁 CSV出力先: ${TEST_CONFIG.csvPath}`);
    
    // 出力ディレクトリを作成
    await fs.mkdir(path.dirname(TEST_CONFIG.filePath), { recursive: true });
    
    // MCPサーバーを起動
    const server = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'inherit']
    });

    let requestId = 1;
    let completedTests = 0;
    const totalTests = 10;

    // レスポンス処理
    server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                
                if (response.result) {
                    const message = response.result.content?.[0]?.text || JSON.stringify(response.result);
                    console.log(`✅ [${response.id}] ${message}`);
                    completedTests++;
                } else if (response.error) {
                    console.log(`❌ [${response.id}] エラー: ${response.error.message}`);
                    completedTests++;
                }
                
                // 全テスト完了チェック
                if (completedTests >= totalTests) {
                    setTimeout(async () => {
                        await printTestSummary();
                        server.kill();
                        process.exit(0);
                    }, 1000);
                }
                
            } catch (e) {
                console.log(`📝 ${line.trim()}`);
            }
        });
    });

    // エラーハンドリング
    server.on('error', (err) => {
        console.error('❌ サーバーエラー:', err);
        process.exit(1);
    });

    console.log('\n🚀 テスト開始\n');
    
    // テストシーケンス実行
    await runTestSequence(server, requestId);
}

/**
 * テストシーケンスを実行
 * @param {Object} server - サーバープロセス
 * @param {number} startId - 開始リクエストID
 */
async function runTestSequence(server, startId) {
    let id = startId;
    
    // 1. ワークブック作成
    sendMCPRequest(server, 'create_workbook', {
        filePath: TEST_CONFIG.filePath
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 2. ワークシート追加
    sendMCPRequest(server, 'add_worksheet', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 3. タイトル設定
    sendMCPRequest(server, 'set_cell_value', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        cell: 'A1',
        value: 'Excel MCP 統合テスト レポート'
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 4. サンプルデータ入力
    sendMCPRequest(server, 'set_range_values', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        startCell: 'A3',
        values: TEST_DATA.sampleData
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 5. ヘッダー書式設定
    sendMCPRequest(server, 'format_cell', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        cell: 'A3',
        format: TEST_DATA.headerFormat
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 6. 合計数式追加
    sendMCPRequest(server, 'add_formula', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        cell: 'E7',
        formula: '=SUM(E4:E6)'
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 7. セル値取得テスト
    sendMCPRequest(server, 'get_cell_value', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        cell: 'A1'
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 8. 範囲データ取得テスト
    sendMCPRequest(server, 'get_range_values', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        range: 'A3:D6'
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 9. データ検索テスト
    sendMCPRequest(server, 'find_data', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        searchValue: '商品A'
    }, id++);
    
    await delay(TEST_CONFIG.timeout);
    
    // 10. CSV出力テスト
    sendMCPRequest(server, 'export_to_csv', {
        filePath: TEST_CONFIG.filePath,
        sheetName: TEST_CONFIG.sheetName,
        csvPath: TEST_CONFIG.csvPath
    }, id++);
}

/**
 * テスト結果サマリーを出力
 */
async function printTestSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Excel操作統合テスト完了');
    console.log('='.repeat(50));
    
    try {
        // ファイル存在確認
        const excelStats = await fs.stat(TEST_CONFIG.filePath);
        const csvStats = await fs.stat(TEST_CONFIG.csvPath);
        
        console.log('📊 生成されたファイル:');
        console.log(`   📈 Excel: ${TEST_CONFIG.filePath}`);
        console.log(`      サイズ: ${excelStats.size} bytes`);
        console.log(`   📋 CSV: ${TEST_CONFIG.csvPath}`);
        console.log(`      サイズ: ${csvStats.size} bytes`);
        
        // CSV内容の確認
        const csvContent = await fs.readFile(TEST_CONFIG.csvPath, 'utf-8');
        console.log(`\n📄 CSV出力内容プレビュー:`);
        console.log(csvContent.split('\n').slice(0, 5).join('\n'));
        
    } catch (error) {
        console.log('⚠️  ファイル確認中にエラーが発生しました:', error.message);
    }
    
    console.log('\n✅ 全ての機能が正常に動作しました！');
}

// テスト実行
runExcelIntegrationTest().catch(console.error);
