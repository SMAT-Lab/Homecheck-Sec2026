import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects, IssueReport } from "../../model/Defects";
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
export declare class RequireAwaitCheck implements BaseChecker {
    private symbolTable;
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkNode;
    /**
     * 处理异步函数
     */
    private processAsyncFunction;
    /**
     * 检查是否应该报告缺少await的问题
     */
    private shouldReportMissingAwait;
    /**
     * 检查异步生成器函数中是否有特殊的yield表达式
     * 包括：yield* source, yield Promise, yield asyncFunction
     */
    private hasSpecialYieldExpressions;
    private hasYieldPromise;
    private hasYieldStarSource;
    private isPromiseCall;
    private hasPromiseInVarDecl;
    private isValidSourceIdentifier;
    /**
     * 检查参数是否为自定义类型
     */
    private isCustomTypeParameter;
    /**
     * 查找函数参数
     */
    private findParameter;
    /**
     * 检查参数类型是否为AsyncIterable
     */
    private isAsyncIterableParameter;
    /**
     * 检查是否为异步函数
     */
    private isAsyncFunction;
    /**
     * 检查是否为生成器函数
     */
    private isGeneratorFunction;
    private getFunctionBody;
    private isEmptyFunction;
    /**
     * 检查函数体中是否包含await表达式
     */
    private hasAwaitExpression;
    /**
     * 检查表达式是否是Promise相关表达式
     */
    private isPromiseExpression;
    /**
     * 检查函数返回类型是否为Promise
     */
    private returnsPromiseType;
    /**
     * 递归检查节点中是否包含await表达式
     */
    private containsAwait;
    /**
     * 检查节点是否为函数
     */
    private isFunction;
    /**
     * 检查函数是否返回Promise
     */
    private checkFunctionReturnsPromise;
    /**
     * 检查块中是否包含返回Promise的语句
     */
    private containsExplicitPromiseReturn;
    /**
     * 检查Return语句是否返回Promise
     */
    private isReturnWithPromise;
    /**
     * 检查函数调用是否返回Promise
     */
    private isPromiseFunctionCall;
    private buildSymbolTable;
    private getFunctionPosition;
    private getFunctionName;
    private generateErrorMessage;
    private reportDefect;
}
