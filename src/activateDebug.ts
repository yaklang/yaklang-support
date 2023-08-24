/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/*
 * activateMockDebug.ts containes the shared extension code that can be executed both in node.js and the browser.
 */

'use strict';
import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { getDefaultConfig } from './utils/dap';

import { YakDebugAdapterExecutableFactory as YakDebugAdapterFactory } from './debugAdapter';


export function registerDebugger(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.yak-debug.runEditorContents', (resource: vscode.Uri) => {
            let targetResource = resource;
            if (!targetResource && vscode.window.activeTextEditor) {
                targetResource = vscode.window.activeTextEditor.document.uri;
            }
            if (targetResource) {
                vscode.debug.startDebugging(undefined, {
                    type: 'yak',
                    name: 'Run File',
                    request: 'launch',
                    program: targetResource.fsPath
                },
                    { noDebug: true }
                );
            }
        }),
        vscode.commands.registerCommand('extension.yak-debug.debugEditorContents', (resource: vscode.Uri) => {
            let targetResource = resource;
            if (!targetResource && vscode.window.activeTextEditor) {
                targetResource = vscode.window.activeTextEditor.document.uri;
            }
            if (targetResource) {
                vscode.debug.startDebugging(undefined, {
                    type: 'yak',
                    name: 'Debug File',
                    request: 'launch',
                    program: targetResource.fsPath,
                    stopOnEntry: true
                });
            }
        }),
    );

    // register a configuration provider for 'yak' debug type
    const provider = new YakConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('yak', provider));

    // register a dynamic configuration provider for 'yak' debug type
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('yak', {
        provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
            return [
                {
                    name: "Launch",
                    request: "launch",
                    type: "yak",
                    program: "${file}"
                },
            ];
        }
    }, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('yak', new YakDebugAdapterFactory()));
}

class YakConfigurationProvider implements vscode.DebugConfigurationProvider {

    /**
     * Massage a debug configuration just before a debug session is being launched,
     * e.g. add all missing attributes to the debug configuration.
     */
    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'yak') {
                config = getDefaultConfig();
            }
        }

        if (!config.program) {
            return vscode.window.showErrorMessage("Cannot find a program to debug").then(_ => {
                return undefined;	// abort launch
            });
        }

        return config;
    }
}
