import { ArkFile, ArkMethod, Stmt } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoHighLoadedFrameRateRangeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkMethod: ArkMethod) => void;
    private getFieldNum;
    private traversalLocals;
    private traversalDefaultClass;
    private getReasonableFieldValues;
    private processScope;
    reportIssue(arkFile: ArkFile, stmt: Stmt, methodName: string): void;
}
