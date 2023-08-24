
import * as vscode from 'vscode';
import { ProviderResult } from 'vscode';
import { findYakBinary } from './utils/path';
import { CanDebug } from './utils/dap';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

function Random(min: number, max: number): number {
    return Math.round(Math.random() * (max - min)) + min;
}

export class YakDebugAdapterExecutableFactory implements vscode.DebugAdapterDescriptorFactory {
    private dap?: ChildProcessWithoutNullStreams;
    private host?: string;
    private port?: number;
    private debugConsole?: vscode.DebugConsole;

    createDebugAdapterDescriptor(_session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): ProviderResult<vscode.DebugAdapterDescriptor> {
        if (!executable) {
            // todo: debug
            // return new vscode.DebugAdapterServer(23333, "127.0.0.1");


            if (this.dap) {
                return new vscode.DebugAdapterServer(this.port || 0, this.host);
            }
            return new Promise<vscode.DebugAdapterDescriptor>((resolve, reject) => {
                let binary = findYakBinary();
                if (binary === "") {
                    vscode.window.showErrorMessage("Cannot find yak in PATH");
                    return;
                }

                if (!CanDebug(binary)) {
                    const message = "yak binary does not support debug, please download the latest version from https://github.com/yaklang/yaklang/releases"
                    vscode.window.showErrorMessage(message);
                    return;
                }

                const config = _session.configuration;
                const host = config.host || "127.0.0.1";
                const port = config.port || Random(50000, 65535).toString();
                const debug = config.debug as boolean;
                const args = [
                    "dap",
                    "-host", host,
                    "-port", port
                ];
                if (debug) {
                    args.push("-debug");
                }

                const dap = spawn(binary, args);
                dap.stdout.on('data', (data) => {
                    if (this.debugConsole) {
                        this.debugConsole.appendLine(data.toString());
                    }

                    if (data.includes("Start DAP server")) {
                        this.debugConsole = vscode.debug.activeDebugConsole;
                        this.dap = dap;
                        this.host = host;
                        this.port = parseInt(port);
                        resolve(new vscode.DebugAdapterServer(this.port, host));
                    }
                });

                dap.stderr.on('data', (data) => {
                    if (this.debugConsole) {
                        if (!data.includes("use of closed network connection")) {
                            this.debugConsole.appendLine(data.toString());
                        }
                    }
                    vscode.window.showErrorMessage(data.toString());
                });
                dap.on('close', (code) => {
                    if (this.debugConsole) {
                        this.debugConsole.appendLine(`child process exited with code ${code}`);
                        this.debugConsole = undefined;
                    }
                    this.dap = undefined;
                })
            }
            )
        }
        else {
            return executable;
        }
    }

    dispose() {
        if (this.dap) {
            this.dap.kill('SIGTERM');
        }
    }
}
