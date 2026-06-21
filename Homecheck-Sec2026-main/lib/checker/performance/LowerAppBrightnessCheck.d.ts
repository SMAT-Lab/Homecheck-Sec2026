import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class LowerAppBrightnessCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkMethod) => void;
    private processIfStmt;
    private isItExpected;
    private isAbstractFieldRef;
    private isStmtUndefined;
    private processMyArray;
    private processArkInstanceInvokeExpr;
    private addIssueReport;
}
