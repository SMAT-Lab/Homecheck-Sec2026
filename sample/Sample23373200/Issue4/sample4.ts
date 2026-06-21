function executeUserInput(input: string) {
    let result = eval(input);         // 危险！
    return result;
}

function createHandler(code: string) {
    let fn = new Function('return ' + code);  // 危险！
    return fn();
}
