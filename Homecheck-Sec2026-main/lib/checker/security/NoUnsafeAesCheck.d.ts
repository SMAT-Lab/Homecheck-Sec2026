import { ArkFile, Stmt } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoUnsafeAesCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private processStmt;
    reportIssue(arkFile: ArkFile, stmt: Stmt, methodName: string): void;
}
