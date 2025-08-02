#!/usr/bin/env node

/**
 * MCP Server Manager
 * MCPサーバーの起動確認・終了・管理を行うユーティリティ
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * MCPサーバー管理クラス
 */
class MCPServerManager {
    constructor() {
        this.serverProcess = null;
        this.isWindows = process.platform === 'win32';
    }

    /**
     * 実行中のMCPサーバープロセスを検索
     */
    async findRunningServers() {
        console.log('🔍 実行中のMCPサーバーを検索中...\n');
        
        try {
            let command;
            if (this.isWindows) {
                // Windowsでnode.exeプロセスを検索
                command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH';
            } else {
                // Unix系でnodeプロセスを検索
                command = 'ps aux | grep node | grep -v grep';
            }

            const { stdout } = await execAsync(command);
            
            if (this.isWindows) {
                const lines = stdout.trim().split('\n').filter(line => line.trim());
                
                if (lines.length === 0) {
                    console.log('❌ 実行中のNode.jsプロセスが見つかりません');
                    return [];
                }

                console.log('📋 実行中のNode.jsプロセス:');
                const processes = [];
                
                lines.forEach((line, index) => {
                    const parts = line.replace(/"/g, '').split(',');
                    if (parts.length >= 2) {
                        const pid = parts[1];
                        console.log(`   ${index + 1}. PID: ${pid} - ${parts[0]}`);
                        processes.push({ pid, name: parts[0] });
                    }
                });
                
                return processes;
            } else {
                console.log('📋 実行中のNode.jsプロセス:');
                console.log(stdout);
                return stdout.split('\n').filter(line => line.trim());
            }
            
        } catch (error) {
            console.log('❌ プロセス検索エラー:', error.message);
            return [];
        }
    }

    /**
     * 特定のPIDでプロセスを終了
     */
    async killProcess(pid) {
        console.log(`🛑 プロセス ${pid} を終了中...`);
        
        try {
            const command = this.isWindows ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
            await execAsync(command);
            console.log(`✅ プロセス ${pid} を正常に終了しました`);
            return true;
        } catch (error) {
            console.log(`❌ プロセス ${pid} の終了に失敗: ${error.message}`);
            return false;
        }
    }

    /**
     * MCPサーバーを起動
     */
    async startServer() {
        console.log('🚀 MCPサーバーを起動中...\n');
        
        const serverPath = path.resolve('./dist/index.js');
        
        this.serverProcess = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });

        this.serverProcess.stdout.on('data', (data) => {
            console.log(`📝 サーバー出力: ${data.toString().trim()}`);
        });

        this.serverProcess.stderr.on('data', (data) => {
            console.log(`⚠️  サーバーエラー: ${data.toString().trim()}`);
        });

        this.serverProcess.on('close', (code) => {
            console.log(`🛑 MCPサーバーが終了しました (終了コード: ${code})`);
            this.serverProcess = null;
        });

        this.serverProcess.on('error', (err) => {
            console.error('❌ サーバー起動エラー:', err);
            this.serverProcess = null;
        });

        console.log(`✅ MCPサーバーを起動しました (PID: ${this.serverProcess.pid})`);
        console.log('💡 終了するには Ctrl+C を押すか、別のターミナルで "node scripts/server-manager.js --kill" を実行してください\n');
        
        return this.serverProcess;
    }

    /**
     * 現在のサーバープロセスを終了
     */
    stopCurrentServer() {
        if (this.serverProcess) {
            console.log('🛑 現在のMCPサーバーを終了中...');
            this.serverProcess.kill('SIGTERM');
            this.serverProcess = null;
            console.log('✅ MCPサーバーを終了しました');
            return true;
        } else {
            console.log('❌ 管理対象のMCPサーバーが実行されていません');
            return false;
        }
    }

    /**
     * サーバーステータスを表示
     */
    showStatus() {
        console.log('📊 MCPサーバーステータス');
        console.log('=' .repeat(40));
        
        if (this.serverProcess && !this.serverProcess.killed) {
            console.log(`✅ 状態: 実行中`);
            console.log(`🆔 PID: ${this.serverProcess.pid}`);
            console.log(`📁 実行ファイル: dist/index.js`);
        } else {
            console.log(`❌ 状態: 停止中`);
        }
        
        console.log('');
    }

    /**
     * ヘルプを表示
     */
    showHelp() {
        console.log('🔧 MCP Server Manager - 使用方法\n');
        console.log('コマンド:');
        console.log('  --start     MCPサーバーを起動');
        console.log('  --stop      現在のMCPサーバーを終了');
        console.log('  --status    サーバーの状態を表示');
        console.log('  --list      実行中のプロセスを一覧表示');
        console.log('  --kill      実行中の全Node.jsプロセスを終了 (危険)');
        console.log('  --help      このヘルプを表示');
        console.log('\n使用例:');
        console.log('  node scripts/server-manager.js --start');
        console.log('  node scripts/server-manager.js --list');
        console.log('  node scripts/server-manager.js --stop');
    }
}

/**
 * メイン処理
 */
async function main() {
    const manager = new MCPServerManager();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        manager.showHelp();
        return;
    }

    const command = args[0];

    switch (command) {
        case '--start':
            await manager.startServer();
            // サーバーを実行し続ける
            process.on('SIGINT', () => {
                console.log('\n🛑 終了シグナルを受信しました');
                manager.stopCurrentServer();
                process.exit(0);
            });
            break;

        case '--stop':
            manager.stopCurrentServer();
            break;

        case '--status':
            manager.showStatus();
            break;

        case '--list':
            await manager.findRunningServers();
            break;

        case '--kill':
            console.log('⚠️  警告: すべてのNode.jsプロセスを終了します');
            const processes = await manager.findRunningServers();
            
            if (processes.length > 0) {
                console.log('続行しますか？ (y/N)');
                process.stdin.setEncoding('utf8');
                process.stdin.once('data', async (data) => {
                    const input = data.toString().trim().toLowerCase();
                    if (input === 'y' || input === 'yes') {
                        for (const proc of processes) {
                            if (proc.pid) {
                                await manager.killProcess(proc.pid);
                            }
                        }
                    } else {
                        console.log('❌ キャンセルしました');
                    }
                    process.exit(0);
                });
            }
            break;

        case '--help':
        default:
            manager.showHelp();
            break;
    }
}

// プロセス終了時のクリーンアップ
process.on('exit', () => {
    console.log('👋 MCP Server Manager を終了します');
});

main().catch(console.error);
