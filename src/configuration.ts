import * as vscode from 'vscode';
import { getDefaultConfig } from './utils/dap';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';


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



export function registerConfiguration(context: vscode.ExtensionContext){
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
}