// Code Sample with Security Issue 1: Command Execution
import { exec, spawn } from 'child_process';

function unsafeCommandExecution() {
    // 危险：直接执行用户输入的命令
    exec('rm -rf /bin');
}

function anotherExecUsage() {
    const userInput = 'cat /etc/passwd';
    exec(userInput);
}

function spawnUsage() {
    spawn('ls', ['-la']);
}
