// Code Sample with XSS Vulnerability
import { webview } from '@kit.ArkWeb';

function vulnerableXss(userInput: string) {
    // XSS漏洞：直接将用户输入插入到HTML中
    const html = `<div>${userInput}</div>`;
    return html;
}

function anotherVulnerableXss(username: string) {
    // 另一个XSS漏洞示例
    const script = `<script>alert('Hello, ${username}!');</script>`;
    return script;
}