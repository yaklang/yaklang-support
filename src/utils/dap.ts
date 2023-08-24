import { spawnSync } from 'child_process';
import * as vscode from 'vscode';

export function CanDebug(binary: string): boolean {
    const p = spawnSync(binary, ["dap", "-version"]);
    return p.stdout?.toString().includes("Debugger Adapter version:");
}

export function getDefaultConfig(): vscode.DebugConfiguration {
    return {
        name: "Launch",
        request: "launch",
        type: "yak",
        program: "${file}",
    };
}