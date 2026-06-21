import { ArkMethod, Stmt } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class CameraInputOpenCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkMethod: ArkMethod) => void;
    private processStmt;
    private processUsedStmt;
    reportIssue(stmt: Stmt, keyword: string): void;
}
