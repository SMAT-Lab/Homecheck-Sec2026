import { ArkClass, ArkMethod, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class TimezoneInterfaceCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkMethod: ArkMethod) => void;
    setTimeCheck(stmt: Stmt, clazz: ArkClass): void;
    isDefaultParameter(stmt: Stmt): boolean;
    getFieldStmt(stmt: Stmt, fieldName: string): Stmt | undefined;
    private reportIssue;
}
