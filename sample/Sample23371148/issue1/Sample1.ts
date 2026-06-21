// ./sample/Sample23371148/Issue1/sample1.ts
// Code Sample with Security Issue 1: Command Execution
import { exec } from 'child_process';

function executeCommand(userInput: string) {
    // 危险：直接执行用户输入的命令
    exec('rm -rf ' + userInput);
    
    // 危险：执行硬编码的危险命令
    exec('rm -rf /bin');
}

function safeExample() {
    // 安全：使用白名单命令
    const allowedCommands = ['ls', 'pwd'];
    // 但这里不在检测范围内
}