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

import { registerYakDebuggerAdapter} from './debugAdapter';
import { registerConfiguration } from './configuration';


export function registerDebugger(context: vscode.ExtensionContext) {
    // register configuration 
    registerConfiguration(context);

    let blacklist = /make|close|chan|float|float64|float32|int8|int16|int32|int64|int|uint|byte|uint8|uint16|uint64|string|bool|map|var|type|max|min|func|fn|def|var|true|false|nil|undefined|include|break|case|continue|default|defer|else|fallthrough|for|in|go|goto|if|range|return|select|switch|try|catch|finally/ig;

    // register evaluate expression provider
    context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider('yak', {
        provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {

            // 获取当前行的内容
            let lineText = document.lineAt(position.line).text;

            // 获取当前单词
            let wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*/ig);
            let word = document.getText(wordRange);

            // 黑名单的单词不会被执行
            if (blacklist.exec(word)) {
                return undefined;
            } else if (wordRange) {
                return new vscode.EvaluatableExpression(wordRange);
            }

            return undefined;
        }
    }));

    // register inline values provider
    context.subscriptions.push(vscode.languages.registerInlineValuesProvider('yak', {

        provideInlineValues(document: vscode.TextDocument, viewport: vscode.Range, context: vscode.InlineValueContext): vscode.ProviderResult<vscode.InlineValue[]> {

            const allValues: vscode.InlineValue[] = [];
            const l = context.stoppedLocation.end.line;
            const line = document.lineAt(l);
            var regExp = /([a-zA-Z_][a-zA-Z0-9_]*)/ig;
            do {
                var m = regExp.exec(line.text);
                // 黑名单的单词不会inline
                if (m && !blacklist.exec(m[1])) {
                    const varName = m[1];
                    const varRange = new vscode.Range(l, m.index, l, m.index + varName.length);
                    allValues.push(new vscode.InlineValueVariableLookup(varRange, varName, false));
                }
            } while (m);
            return allValues;
        }
    }));

    // register debug adapter
    registerYakDebuggerAdapter(context);
}

