import { ArkFile } from "arkanalyzer";
import { BaseMetaData, BaseChecker } from "../BaseChecker";
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoLoopFuncCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkNode;
    private findUnsafeReferences;
    private isUnsafeReference;
    private isValidReference;
    private isVariableModifiedAfterLoop;
    private collectCapturedVariables;
    private collectLoopVariables;
    private processForInOfInitializer;
    private handleInitializer;
    private handleCondition;
    private handleIncrementor;
    private collectIdentifiersFromNode;
    /**
     * 检查变量是否在循环体内被修改
     * @param varName 变量名
     * @param loopNode 循环节点
     * @returns 是否在循环体内被修改
     */
    private isVariableModifiedInLoop;
    private checkNodeForModification;
    private isVariableModified;
    /**
     * 查找变量的声明节点
     * @param varName 变量名
     * @param scope 搜索范围
     * @returns 变量声明节点或null
     */
    private findVariableDeclaration;
    private reportIssue;
    private isTsFile;
}
