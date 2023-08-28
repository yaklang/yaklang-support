import * as vscode from 'vscode';
import * as https from 'https';


import { spawnSync } from 'child_process';
import { findYakBinary } from './path';
import { showErrorMessageWithDownloadOption } from '../commands';

const YAK_VERSION_KEY_NAME = 'yak_version';
const VERSION_REGEXP = /    Version: .*/ig;


export function isValidYakBinary(binary: string): boolean {
    const p = spawnSync(binary, ["version"]);
    return p.stdout?.toString().includes("Yak Language Build Info:");
}

export function getAndSetYakVersion(context: vscode.ExtensionContext, cache?: boolean): string | undefined {
    let version: string | undefined = context.workspaceState.get(YAK_VERSION_KEY_NAME);
    if (version && !cache) {
        return version;
    }

    const binary = findYakBinary(context, cache);
    if (binary === "") {
        showErrorMessageWithDownloadOption(context, "Cannot find yak in PATH");
        return "";
    }
    version = updateYakVersionByBinary(context, binary);
    if (version === "") {
        showErrorMessageWithDownloadOption(context, "Cannot get yak version, please download the latest version of yak");
    }
    return version;
}

export function updateYakVersionByBinary(context: vscode.ExtensionContext, path: string) {
    let p = spawnSync(path, ["version", "-json"]);
    if (p.status !== 0) {
        return "";
    }

    try {
        const result = JSON.parse(p.stdout?.toString() || "");
        let version = result.Version ?? "";
        context.workspaceState.update(YAK_VERSION_KEY_NAME, version);
        return version;
    } catch {
        // 兼容旧版本
        p = spawnSync(path, ["version"]);
        const result = p.stdout?.toString();
        let version = result?.match(VERSION_REGEXP)?.[0]?.replace("Version: ", "").trim() ?? "";
        // 去除git-hash
        const splited = version.split("-");
        if (splited.length > 1) {
            version = `${splited[0]}-${splited[1]}`;
        }
        if (version.startsWith("v")) {
            version = version.substr(1);
        }
        context.workspaceState.update(YAK_VERSION_KEY_NAME, version);
        return version;
    }
}

export function getYakVersion(context: vscode.ExtensionContext): string | undefined {
    let version: string | undefined = context.workspaceState.get(YAK_VERSION_KEY_NAME);
    if (!version) {
        version = "";
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