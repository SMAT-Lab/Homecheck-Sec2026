import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class InitDeclarationsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defaultOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkInitDeclarations;
    private specialTreatment;
    private checkAlwaysExpression;
    private checkNeverExpressionModule;
    private checkNeverExpression;
    /**
     * 检查节点是否为循环语句
     * @param node 要检查的节点
     * @returns 是否为循环语句
     */
    private isForLoop;
    private checkIsForLoop;
    private checkIsForOfInStatement;
    private checkIsForStatement;
    private hasModifiers;
    private isDeclare;
    private addIssueReportNode;
}
