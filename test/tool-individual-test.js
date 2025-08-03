#!/usr/bin/env node

/**
 * MCP個別ツールテスト
 * 各ツールの機能を個別にテストします
 */

import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

// テスト設定
const TEST_CONFIG = {
    outputDir: path.resolve('./test/output'),
    timeout: 800
};

/**
 * 個別ツールテストスイート
 */
class MCPToolTester {
    constructor() {
        this.server = null;
        this.requestId = 1;
        this.testResults = [];
    }

    /**
     * 待機ユーティリティ
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * サーバー起動
     */
    async startServer() {
        console.log('📡 MCPサーバーを起動中...');
        
        this.server = spawn('node', ['dist/index.js'], {
            stdio: ['pipe', 'pipe', 'inherit']
        });

        // レスポンス処理設定
        this.server.stdout.on('data', (data) => {
            this.handleServerResponse(data);
        });

        this.server.on('error', (err) => {
            console.error('❌ サーバーエラー:', err);
            process.exit(1);
        });

        await this.delay(500); // サーバー起動待機
        console.log('✅ サーバー起動完了\n');
    }

    /**
     * サーバーレスポンス処理
     */
    handleServerResponse(data) {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            try {
                const response = JSON.parse(line);
                
                if (response.result) {
                    const message = response.result.content?.[0]?.text || 'OK';
                    this.testResults.push({
                        id: response.id,
                        status: 'success',
                        message: message
                    });
                    console.log(`✅ [${response.id}] ${message}`);
                } else if (response.error) {
                    this.testResults.push({
                        id: response.id,
                        status: 'error',
                        message: response.error.message
                    });
                    console.log(`❌ [${response.id}] ${response.error.message}`);
                }
            } catch (e) {
                console.log(`📝 ${line.trim()}`);
            }
        });
    }

    /**
     * ツール実行
     */
    async executeTool(toolName, args, description) {
        const request = {
            jsonrpc: "2.0",
            id: this.requestId++,
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            }
        };

        console.log(`\n🔧 [${request.id}] ${description}`);
        console.log(`   ツール: ${toolName}`);
        
        this.server.stdin.write(JSON.stringify(request) + '\n');
        await this.delay(TEST_CONFIG.timeout);
    }

    /**
     * 全ツールテスト実行
     */
    async runAllTests() {
        console.log('=== MCP個別ツールテスト ===\n');
        
        // 出力ディレクトリ作成
        await fs.mkdir(TEST_CONFIG.outputDir, { recursive: true });
        
        await this.startServer();
        
        const testFile = path.join(TEST_CONFIG.outputDir, 'tool-test.xlsx');
        const csvFile = path.join(TEST_CONFIG.outputDir, 'tool-test.csv');

        // 1. ワークブック作成テスト
        await this.executeTool('create_workbook', {
            filePath: testFile
        }, 'ワークブック作成テスト');

        // 2. ワークブック情報取得テスト
        await this.executeTool('get_workbook_info', {
            filePath: testFile
        }, 'ワークブック情報取得テスト');

        // 3. ワークシート追加テスト
        await this.executeTool('add_worksheet', {
            filePath: testFile,
            sheetName: 'DataSheet'
        }, 'ワークシート追加テスト');

        // 4. セル値設定テスト
        await this.executeTool('set_cell_value', {
            filePath: testFile,
            sheetName: 'DataSheet',
            cell: 'A1',
            value: 'テストデータ'
        }, 'セル値設定テスト');

        // 5. セル値取得テスト
        await this.executeTool('get_cell_value', {
            filePath: testFile,
            sheetName: 'DataSheet',
            cell: 'A1'
        }, 'セル値取得テスト');

        // 6. 範囲データ設定テスト
        await this.executeTool('set_range_values', {
            filePath: testFile,
            sheetName: 'DataSheet',
            startCell: 'B2',
            values: [
                ['項目', '値'],
                ['テスト1', 100],
                ['テスト2', 200]
            ]
        }, '範囲データ設定テスト');

        // 7. 範囲データ取得テスト
        await this.executeTool('get_range_values', {
            filePath: testFile,
            sheetName: 'DataSheet',
            range: 'B2:C4'
        }, '範囲データ取得テスト');

        // 8. 数式追加テスト
        await this.executeTool('add_formula', {
            filePath: testFile,
            sheetName: 'DataSheet',
            cell: 'D5',
            formula: '=SUM(C3:C4)'
        }, '数式追加テスト');

        // 9. セル書式設定テスト
        await this.executeTool('format_cell', {
            filePath: testFile,
            sheetName: 'DataSheet',
            cell: 'B2',
            format: {
                font: { bold: true, size: 14 },
                fill: { type: 'pattern', pattern: 'solid', fgColor: 'FFFF0000' }
            }
        }, 'セル書式設定テスト');

        // 10. データ検索テスト
        await this.executeTool('find_data', {
            filePath: testFile,
            sheetName: 'DataSheet',
            searchValue: 'テスト1'
        }, 'データ検索テスト');

        // 11. CSV出力テスト
        await this.executeTool('export_to_csv', {
            filePath: testFile,
            sheetName: 'DataSheet',
            csvPath: csvFile
        }, 'CSV出力テスト');

        // テスト終了処理
        await this.delay(1500);
        await this.printTestSummary();
        this.server.kill();
    }

    /**
     * テスト結果サマリー出力
     */
    async printTestSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 テスト結果サマリー');
        console.log('='.repeat(60));

        const successCount = this.testResults.filter(r => r.status === 'success').length;
        const errorCount = this.testResults.filter(r => r.status === 'error').length;
        const totalCount = this.testResults.length;

        console.log(`✅ 成功: ${successCount}`);
        console.log(`❌ 失敗: ${errorCount}`);
        console.log(`📈 合計: ${totalCount}`);
        console.log(`🎯 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);

        if (errorCount > 0) {
            console.log('\n🚨 失敗したテスト:');
            this.testResults
                .filter(r => r.status === 'error')
                .forEach(r => {
                    console.log(`   [${r.id}] ${r.message}`);
                });
        }

        // 生成されたファイルの確認
        try {
            const testFile = path.join(TEST_CONFIG.outputDir, 'tool-test.xlsx');
            const csvFile = path.join(TEST_CONFIG.outputDir, 'tool-test.csv');
            
            const excelStats = await fs.stat(testFile);
            const csvStats = await fs.stat(csvFile);
            
            console.log('\n📁 生成されたファイル:');
            console.log(`   Excel: ${testFile} (${excelStats.size} bytes)`);
            console.log(`   CSV: ${csvFile} (${csvStats.size} bytes)`);
            
        } catch (error) {
            console.log('\n⚠️  ファイル確認エラー:', error.message);
        }

        console.log('\n🎉 個別ツールテスト完了！');
    }
}

// テスト実行
const tester = new MCPToolTester();
tester.runAllTests().catch(console.error);
