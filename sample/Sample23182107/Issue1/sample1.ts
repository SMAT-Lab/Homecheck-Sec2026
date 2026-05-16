// Issue1: 使用 eval 执行不可信字符串，存在任意代码执行风险
function runUserScript(payload: string): void {
    eval(payload);
}
