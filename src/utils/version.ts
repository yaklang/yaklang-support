import * as vscode from 'vscode';
import * as https from 'https';


import { spawnSync } from 'child_process';
import { findYakBinary } from './path';

const YAK_VERSION_KEY_NAME = 'yak_version';

export function isValidYakBinary(binary: string): boolean {
    const p = spawnSync(binary, ["version"]);
    return p.stdout?.toString().includes("Yak Language Build Info:");
}

export function getAndSetYakVersion(context: vscode.ExtensionContext): string | undefined {
    let version: string | undefined = context.workspaceState.get(YAK_VERSION_KEY_NAME);
    if (version) {
        return version;
    }

    const binary = findYakBinary(context);
    const p = spawnSync(binary, ["version", "-json"]);
    const result = JSON.parse(p.stdout?.toString() || "");
    version = result.Version ?? "";
    if (version !== "") {
        context.workspaceState.update(YAK_VERSION_KEY_NAME, version);
    }
    return version;
}

export function updateYakVersionByBinary(context: vscode.ExtensionContext, path: string) {
    const p = spawnSync(path, ["version", "-json"]);
    if (p.status !== 0) {
        return "";
    }
    const result = JSON.parse(p.stdout?.toString() || "");
    let version = result.Version ?? "";
    context.workspaceState.update(YAK_VERSION_KEY_NAME, version);
    return version;
}

export function getYakVersion(context: vscode.ExtensionContext): string | undefined {
    let version: string| undefined = context.workspaceState.get(YAK_VERSION_KEY_NAME);
    if (!version) {
        version = "no selection";
    }
    return version;
}

export function resetYakVersion(context: vscode.ExtensionContext) {
    context.workspaceState.update(YAK_VERSION_KEY_NAME, undefined);
}

export const asyncFetchLatestYaklangVersion = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        let rsp = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/yak/latest/version.txt")
        rsp.on("response", (rsp) => {
            rsp.on("data", (data) => {
                resolve(`v${Buffer.from(data).toString("utf8")}`.trim())
            }).on("error", (err) => {
                reject(err)
            })
        })
        rsp.on("error", reject)
    })
}