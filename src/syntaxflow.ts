

import { log } from 'console';
import * as vscode from 'vscode';

const SyntaxflowSelector = "syntaxflow";

const syntaxflow_native_call_name = [
    "getReturns",
    "getFormalParams",
    "getFunc",
    "getCall",
    "getCaller",
    "searchFunc",
    "getObject",
    "getMembers",
    "getSiblings",
    "typeName",
    "fullTypeName",
    "name",
    "string",
    "include",
    "eval",
    "fuzztag",
    "show",
    "slice",
    "regexp",
    "strlower",
    "strupper",
    "var",
    "mybatisSink",
    "freeMarkerSink",
    "opcodes",
    "sourceCode",
    "scanPrevious",
    "scanNext",
    "delete",
    "forbid",
    "self",
    "dataflow",
    "const",
    "versionIn",
    "isSanitizeName",
]


const syntaxflow_library_name = [
    "java-alibaba-druid-httpclientutil", 
    "java-apache-commons-httpclient", 
    "java-apache-http-request-url", 
    "java-http-fluent-request", 
    "java-http-sink", 
    "java-image-io-read-url", 
    "java-net-url-connect", 
    "java-spring-rest-template-use", 
    "command-exec-sink", 
    "java-spring-param", 
    "jdbc-prepared-execute-sink", 
    "jdbc-raw-execute-sink", 
    "process-builder-sink", 
    "runtime-exec-sink", 
    "java-js-sink", 
    "java-servlet-param", 
    "write-filename-sink", 
    "php-filter-function", 
    "php-param", 
    "php-os-exec", 
    "php-file-read", 
    "php-file-unlink", 
    "php-file-write", 
    "php-tp-all-extern-variable-param-source", 
]

const syntaxflow_completion_provider = vscode.languages.registerCompletionItemProvider(
    SyntaxflowSelector,
    {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const linePrefix = document.lineAt(position).text
            console.log("lineprefix: ", linePrefix);

            if (linePrefix.startsWith("<include(")) {
                return syntaxflow_library_name.map(name => {
                    let item = new vscode.CompletionItem(name);
                    item.insertText = new vscode.SnippetString(`"${name}"`);
                    item.documentation = new vscode.MarkdownString(`include library ${name}`);
                    return item 
                })
            }


            // native call  
            if (linePrefix.startsWith("<")) {
                return syntaxflow_native_call_name.map(name => {
                    let item = new vscode.CompletionItem(name);
                    item.insertText = new vscode.SnippetString(`${name}` + "(${1:v1})>");
                    item.documentation = new vscode.MarkdownString(`native call ${name}`);
                    return item 
                })
            }
        },
    },
    '<',
)
// function syntaxflow_completion_provider() {

// }

// export function 
export function registerSyntaxflow(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        syntaxflow_completion_provider,
    )
}