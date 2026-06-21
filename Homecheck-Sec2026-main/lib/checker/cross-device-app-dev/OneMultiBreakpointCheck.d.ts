import { ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class OneMultiBreakpointCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    private builderMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private processStmt;
    private processArg;
    private processConditionExpr;
    private getStaticFieldSignature;
    private isOp2Valid;
    private reportIssue;
}
