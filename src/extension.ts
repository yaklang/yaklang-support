/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { CompletionSchema, getCompletions } from './completionSchema';

export function activate(context: vscode.ExtensionContext) {
    const provider2 = vscode.languages.registerCompletionItemProvider(
        'yak',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {


                /**
                 * 
                 * 生成一个 snippets
                 */
                // // a completion item that inserts its text as snippet,
                // // the `insertText`-property is a `SnippetString` which will be
                // // honored by the editor.
                // const snippetCompletion = new vscode.CompletionItem('Good part of the day');
                // snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
                // snippetCompletion.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");

                // get all text until the `position` and check if it reads `console.`
                // and if so then complete if `log`, `warn`, and `error`
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                let comletionTotal = getCompletions();
                let items: vscode.CompletionItem[] = []

                comletionTotal.libCompletions.forEach(e => {
                    if (!linePrefix.endsWith(e.prefix)) {
                        return
                    }

                    items.push(...e.functions.map(i => {
                        let item = new vscode.CompletionItem(i.functionName);
                        item.detail = i.definitionStr
                        item.insertText = new vscode.SnippetString(i.functionName)
                        if (i.document) {
                            item.documentation = new vscode.MarkdownString(i.document);
                        }
                        return item
                    }))
                })

                if (items.length <= 0) {
                    return comletionTotal.libNames.map(i => new vscode.CompletionItem(i))
                }
                return [
                    ...items,
                ]
            }
        },
        '.' // triggered whenever a '.' is being typed
    );

    context.subscriptions.push(provider2);
}