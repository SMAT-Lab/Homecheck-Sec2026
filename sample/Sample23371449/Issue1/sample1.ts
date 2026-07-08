// Code Sample with Command Injection Vulnerability
import { exec } from 'child_process';

function vulnerableFunction(userInput: string) {
    // 命令注入漏洞：直接拼接用户输入到命令中
    exec('ls ' + userInput, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

function anotherVulnerableFunction(filename: string) {
    // 另一个命令注入漏洞示例
    exec(`cat ${filename}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}