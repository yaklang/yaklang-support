import * as vscode from 'vscode';
import * as https from 'https';


import { spawnSync } from 'child_process';
import { findYakBinary } from './path';
import { showErrorMessageWithDownloadOption } from '../commands';

const YAK_VERSION_KEY_NAME = 'yak_version';
const AVAILABLE_VERSIONS_KEY_NAME = 'yak_available_versions';
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

export interface YaklangVersionInfo {
    version: string;
    displayName: string;
    isLatest?: boolean;
}

export const asyncFetchAvailableYaklangVersions = (): Promise<YaklangVersionInfo[]> => {
    return new Promise((resolve, reject) => {
        const url = "https://oss-qn.yaklang.com/yak/version-info/active_versions.txt";
        let rsp = https.get(url)
        rsp.on("response", (rsp) => {
            let data = '';
            rsp.on("data", (chunk) => {
                data += chunk.toString('utf8');
            }).on("end", () => {
                try {
                    // 解析版本列表，每行一个版本号
                    const versions = data.trim().split('\n')
                        .map(v => v.trim())
                        .filter(v => v.length > 0)
                        .map((v, index) => ({
                            version: v.startsWith('v') ? v.substring(1) : v,
                            displayName: v.startsWith('v') ? v : `v${v}`,
                            isLatest: index === 0
                        }));
                    resolve(versions);
                } catch (err) {
                    reject(err);
                }
            }).on("error", (err) => {
                reject(err)
            })
        })
        rsp.on("error", reject)
    })
}

// 从缓存获取可用版本列表，如果缓存不存在则返回 undefined
export function getCachedAvailableVersions(context: vscode.ExtensionContext): YaklangVersionInfo[] | undefined {
    return context.globalState.get(AVAILABLE_VERSIONS_KEY_NAME);
}

// 缓存可用版本列表
export function cacheAvailableVersions(context: vscode.ExtensionContext, versions: YaklangVersionInfo[]) {
    context.globalState.update(AVAILABLE_VERSIONS_KEY_NAME, versions);
}

// 获取可用版本列表，优先从缓存读取，缓存不存在时从网络获取并缓存
export async function getAvailableYaklangVersions(context: vscode.ExtensionContext, forceRefresh: boolean = false): Promise<YaklangVersionInfo[]> {
    if (!forceRefresh) {
        const cached = getCachedAvailableVersions(context);
        if (cached && cached.length > 0) {
            return cached;
        }
    }
    
    try {
        const versions = await asyncFetchAvailableYaklangVersions();
        cacheAvailableVersions(context, versions);
        return versions;
    } catch (err) {
        // 如果获取失败，尝试返回缓存的版本
        const cached = getCachedAvailableVersions(context);
        if (cached && cached.length > 0) {
            return cached;
        }
        throw err;
    }
}