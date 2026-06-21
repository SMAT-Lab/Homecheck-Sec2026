import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
import { RuleFix } from '../../model/Fix';
interface Issue {
    ruleFix: RuleFix;
    line: number;
    column: number;
    message: string;
    filePath: string;
}
export declare class PromiseFunctionAsyncCheck implements BaseChecker {
    private traversedNodes;
    private issueMap;
    private options;
    private defaultOptions;
    private readonly funcAsyncInstantRegex;
    private readonly arrowFuncReturnPromiseRegex;
    private readonly awaitFuncRegex;
    private readonly promiseTypeRegex;
    private readonly promiseReturnRegex;
    private readonly exportArrowFuncRegex;
    private readonly commonArrowFuncRegex;
    private readonly paramArrowFuncDefineRegex;
    private readonly exportRegex;
    private readonly functionRegex;
    private readonly constRegex;
    private readonly spaceRegex;
    private reportedPromiseFunctions;
    rule: Rule;
    issues: IssueReport[];
    constructor();
    registerMatchers(): MatcherCallback[];
    metaData: BaseMetaData;
    private fileMatcher;
    check(arkFile: ArkFile): Issue[];
    /**
     * 主要程序入口方法，分析代码中的Promise函数
     */
    private checkPromiseFuncAsync;
    private checkFunctionNode;
    /**
     * 检查函数是否在高阶函数内部
     */
    private isInsideHigherOrderFunction;
    /**
     * 检查函数是否在父函数的return语句中
     */
    private isInReturnStatement;
    /**
     * 检查节点是否在代码块的返回语句中
     */
    private isNodeInReturnStatements;
    /**
     * 在表达式中查找特定节点
     */
    private findNodeInExpression;
    /**
     * 计算函数声明的列位置
     */
    private calculateColumnPosition;
    /**
     * 获取箭头函数的列位置
     */
    private getArrowFunctionColumnPosition;
    /**
     * 获取函数声明的列位置
     */
    private getFunctionDeclarationColumnPosition;
    /**
     * 获取方法声明的列位置
     */
    private getMethodDeclarationColumnPosition;
    /**
     * 获取函数表达式的列位置
     */
    private getFunctionExpressionColumnPosition;
    /**
  * 检查节点是否应该跳过检查
  */
    private shouldSkipNode;
    /**
     * 检查是否是返回普通函数的高阶函数
     */
    private isHigherOrderFunction;
    /**
     * 检查函数声明是否有非Promise的函数返回类型
     */
    private hasNonPromiseFunctionReturnType;
    /**
     * 检查函数体是否只返回函数
     */
    private hasOnlyFunctionReturns;
    /**
     * 分析代码块中的返回语句
     */
    private analyzeReturnStatements;
    /**
     * 检查函数是否返回另一个函数(处理多层高阶函数)
     */
    private isFunctionReturningFunction;
    /**
     * 检查代码块中是否包含返回函数的语句
     */
    private hasReturnedFunction;
    /**
     * 判断函数是否应该检查
     */
    private shouldCheckFunction;
    /**
     * 检查函数体中是否包含Promise创建语句
     */
    private containsPromiseCreation;
    /**
     * 检查表达式是否是Promise创建
     */
    private isPromiseCreationExpression;
    /**
     * 通过文本分析判断是否是Promise类型
     */
    private isPromiseTypeByText;
    private addIssueReport;
    private shouldSkipReportForUnionReturnFunction;
    /**
     * 检查是否是Promise函数
     */
    private isPromiseFunction;
    /**
     * 检查代码块中是否有Promise返回语句
     */
    private hasPromiseReturnInBlock;
    private isInPromiseChain;
    /**
     * 移除重复的问题报告
     */
    private removeDuplicateIssues;
}
export {};
