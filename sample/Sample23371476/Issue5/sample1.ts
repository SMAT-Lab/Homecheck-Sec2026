// Unsafe eval sample
function runUserCode(userCode: string) {
    // unsafe dynamic execution
    eval(userCode);
}

export { runUserCode };
