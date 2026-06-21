import { ArkFile } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoInvalidThisCheck implements BaseChecker {
    codeFix?(arkFile: ArkFile, fixKey: string): boolean;
    issues: IssueReport[];
    defects: Defects[];
    readonly metaData: BaseMetaData;
    rule: Rule;
    private defaultOption;
    private option;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    /**
     * this关键字是否在有效的上下文中
     * @param node
     * @returns
     */
    private isThisValid;
    private isNodeInTryCatchInTopLevel;
    private isNodeInTopLevel;
    private isNodeInClassFieldInitializer;
    private isNodeInClassStaticBlock;
    private isValidFunctionContext;
    private checkCallApplyBindContext;
    private checkArrayMethodContext;
    private checkJsDocThisTag;
    private isNullOrUndefinedArg;
    private checkNonStandardThisTag;
    /**
     * 判断 ts.Node 是否在对象的方法中
     * @param {ts.Node} node - 要检查的节点
     * @returns {boolean} 如果 node 在对象的方法中，则返回 true；否则返回 false
     */
    private isNodeInObjectMethod;
    private isNodeType;
    /**
     * 判断 this 关键字是否在函数中，且函数的参数中有 this 参数
     * @param node
     * @returns
     */
    private isThisInFunctionWithThisParam;
    /**
     * 是否构造函数声明
     * @param node
     * @returns
     */
    private isConstructorFunction;
    private nodeContainsThisKeyword;
    private addIssueReport;
    private getLineAndColumn;
}
