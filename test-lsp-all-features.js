#!/usr/bin/env node

/**
 * Yaklang LSP HTTP 全功能测试脚本
 * 测试所有 LSP 功能：completion, hover, signature, definition, references, diagnostics
 */

const axios = require('axios');

const LSP_URL = 'http://127.0.0.1:9633/lsp';

// 测试代码
const TEST_CODE = `
func add(a, b) {
    return a + b
}

result = add(1, 2)
str = "hello world"
upper = str.ToUpper()
`;

// 带语法错误的代码
const ERROR_CODE = `
func test() {
    a = 
    return b
}
`;

let testId = 1;

async function sendLSPRequest(method, params) {
    try {
        const response = await axios.post(LSP_URL, {
            jsonrpc: '2.0',
            id: testId++,
            method: method,
            params: params
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`❌ ${method} request failed:`, error.message);
        return null;
    }
}

async function testCompletion() {
    console.log('\n📝 测试 1: Completion (代码补全)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/completion', {
        textDocument: { uri: 'file:///test.yak' },
        position: { line: 6, character: 10 }  // str. 后面
    });
    
    if (result && result.result) {
        console.log(`✅ 补全成功，返回 ${result.result.length} 个项目`);
        if (result.result.length > 0) {
            console.log(`   示例: ${result.result.slice(0, 3).map(i => i.label).join(', ')}`);
        }
    } else {
        console.log('❌ 补全失败');
    }
}

async function testHover() {
    console.log('\n🔍 测试 2: Hover (悬停提示)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/hover', {
        textDocument: { uri: 'file:///test.yak' },
        position: { line: 1, character: 5 }  // add 函数名
    });
    
    if (result && result.result) {
        console.log('✅ 悬停提示成功');
        if (result.result.length > 0) {
            console.log(`   内容: ${result.result[0].label || 'N/A'}`);
        }
    } else {
        console.log('❌ 悬停提示失败或无内容');
    }
}

async function testSignature() {
    console.log('\n📋 测试 3: Signature Help (签名帮助)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/signatureHelp', {
        textDocument: { uri: 'file:///test.yak' },
        position: { line: 5, character: 14 }  // add( 后面
    });
    
    if (result && result.result) {
        console.log('✅ 签名帮助成功');
        if (result.result.length > 0) {
            console.log(`   签名: ${result.result[0].label || 'N/A'}`);
        }
    } else {
        console.log('❌ 签名帮助失败或无内容');
    }
}

async function testDefinition() {
    console.log('\n🎯 测试 4: Definition (跳转定义)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/definition', {
        textDocument: { uri: 'file:///test.yak' },
        position: { line: 5, character: 10 }  // add 调用
    });
    
    if (result && result.result) {
        console.log('✅ 跳转定义成功');
        if (result.result.uri) {
            console.log(`   URI: ${result.result.uri}`);
            if (result.result.ranges && result.result.ranges.length > 0) {
                const r = result.result.ranges[0];
                console.log(`   位置: Line ${r.startLine}, Col ${r.startColumn}`);
            }
        }
    } else {
        console.log('❌ 跳转定义失败或无内容');
    }
}

async function testReferences() {
    console.log('\n🔗 测试 5: References (查找引用)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/references', {
        textDocument: { uri: 'file:///test.yak' },
        position: { line: 1, character: 5 },  // add 函数定义
        context: { includeDeclaration: true }
    });
    
    if (result && result.result) {
        console.log('✅ 查找引用成功');
        if (result.result.ranges) {
            console.log(`   找到 ${result.result.ranges.length} 个引用`);
        }
    } else {
        console.log('❌ 查找引用失败或无内容');
    }
}

async function testDiagnostics() {
    console.log('\n🐛 测试 6: Diagnostics (语法诊断)');
    console.log('=' .repeat(60));
    
    const result = await sendLSPRequest('textDocument/diagnostics', {
        textDocument: {
            uri: 'file:///error.yak',
            languageId: 'yak',
            text: ERROR_CODE
        }
    });
    
    if (result && result.result) {
        console.log(`✅ 语法诊断成功，发现 ${result.result.length} 个问题`);
        result.result.forEach((diag, idx) => {
            console.log(`   ${idx + 1}. [${diag.severity || 'error'}] ${diag.message || diag.rawMessage}`);
            console.log(`      位置: Line ${diag.startLineNumber}, Col ${diag.startColumn}`);
        });
    } else {
        console.log('❌ 语法诊断失败');
    }
}

async function testHealthCheck() {
    console.log('\n🏥 健康检查');
    console.log('=' .repeat(60));
    
    try {
        const response = await axios.get('http://127.0.0.1:9633/health', { timeout: 2000 });
        if (response.data.status === 'ok') {
            console.log('✅ LSP HTTP 服务器运行正常');
            console.log(`   服务器: ${response.data.server || 'unknown'}`);
            return true;
        }
    } catch (error) {
        console.log('❌ LSP HTTP 服务器未运行');
        console.log('   请先启动: yak lsp --http --port 9633');
        return false;
    }
}

async function runAllTests() {
    console.log('\n🚀 Yaklang LSP HTTP 全功能测试');
    console.log('=' .repeat(60));
    
    // 健康检查
    const isHealthy = await testHealthCheck();
    if (!isHealthy) {
        process.exit(1);
    }
    
    // 运行所有测试
    await testCompletion();
    await testHover();
    await testSignature();
    await testDefinition();
    await testReferences();
    await testDiagnostics();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 所有测试完成！');
    console.log('=' .repeat(60));
}

// 运行测试
runAllTests().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});

