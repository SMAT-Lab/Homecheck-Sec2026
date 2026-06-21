import { ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ForeachIndexCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly FOREACH_STR: string;
    readonly CREAER_STR: string;
    readonly supportFileType: string[];
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    private builderMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private checkIndexArg;
    private checkIndexUsedInBody;
    private isUsedIndexInLocal;
    private isUsedIndexInInvokeExpr;
    private isUsedIndexInBinop;
    private isVarDefInScope;
    private addIssueReport;
    private getLineAndColumn;
}
