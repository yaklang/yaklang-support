import * as vscode from 'vscode';

const SyntaxflowSelector = "syntaxflow";

const syntaxflow_native_call_name = [
    "opcodes", "mybatisSink", "strupper", "getUsers", "self", "forbid", "scanPrevious", "sourceCode", "getReturns", "show", "eval", "fuzztag", "include", "fullTypeName", "slice", "freeMarkerSink", "strlower", "getInterfaceBlueprint", "getBluePrint", "foreach_function_inst", "isSanitizeName", "scanInstruction", "name", "getObject", "getParentsBlueprint", "regexp", "var", "typeName", "getFormalParams", "getCallee", "root", "getFunc", "getMemberByKey", "getMembers", "getRootParentBlueprint", "getActualParams", "versionIn", "const", "getSiblings", "string", "searchFunc", "len", "getCurrentBlueprint", "getFullFileName", "dataflow", "scanNext", "getCall", "extendsBy", "getPredecessors", "FilenameByContent", "javaUnescapeOutput", "delete"
]


const syntaxflow_library_name = [
    "golang-file-path", "golang-fmt-print", "golang-ftp-sink", "golang-gin-context", "golang-ldap-sink", "golang-os-exec", "golang-os-sink", "golang-template-html", "golang-template-text", "golang-user-input", "golang-xml-sink", "golang-http-gin", "golang-http-net", "golang-http-sink", "golang-http-source", "golang-file-read-bufio", "golang-file-read-path-ioutil", "golang-file-read-os", "golang-file-read-path-bufio", "golang-file-read-path-os", "golang-file-read-path-sink", "golang-file-read-sink", "golang-database-gorm", "golang-database-pop", "golang-database-reform", "golang-database-sink", "golang-database-sql", "golang-database-sqlx", "golang-file-write-path-bufio", "golang-file-write-path-ioutil", "golang-file-write-path-os", "golang-file-write-sink", "java-groovy-lang-shell-sink", "java-js-sink", "java-command-exec-sink", "java-process-builder-sink", "java-runtime-exec-sink", "java-delete-filename-sink", "java-read-filename-sink", "java-write-filename-sink", "java-common-filter", "java-escape-method", "is-contain-sanitizer", "java-filter-hostname-prefix", "java-alibaba-druid-httpclientutil", "java-apache-commons-httpclient", "java-apache-http-request-url", "java-http-fluent-request", "java-http-sink", "java-image-io-read-url", "java-net-url-connect", "java-okhttpclient-request-execute", "java-log-record", "java-net-socket-read", "java-spring-multipartfile-transferTo-target", "java-spring-rest-template-request-params", "java-jdbc-prepared-execute-sink", "java-jdbc-raw-execute-sink", "java-servlet-param", "java-spring-mvc-param", "php-filter-function", "php-param", "php-xss-method", "php-os-exec", "php-file-read", "php-file-unlink", "php-file-write", "php-tp-all-extern-variable-param-source",
]

const syntaxflow_completion_provider = vscode.languages.registerCompletionItemProvider(
    SyntaxflowSelector,
    {
        provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const linePrefix = document.lineAt(position).text
            // console.log("lineprefix: ", linePrefix);

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
                    item.insertText = new vscode.SnippetString(`${name}` + "(${1:})>");
                    item.documentation = new vscode.MarkdownString(`native call ${name}`);
                    return item
                })
            }
        },
    },
    '<',
)


export function registerSyntaxflow(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        syntaxflow_completion_provider,
    )
}