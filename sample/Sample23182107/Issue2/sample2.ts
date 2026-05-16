// Issue2: Function 构造函数与 eval 类似，可组装执行动态代码
function compileExpression(expr: string): () => number {
    return new Function('return (' + expr + ')') as () => number;
}
