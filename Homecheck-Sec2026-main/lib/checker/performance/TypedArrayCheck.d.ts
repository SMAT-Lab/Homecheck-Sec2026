import { ArkAssignStmt, ArkMethod, Stmt, Value } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Local } from 'arkanalyzer/lib/core/base/Local';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class TypedArrayCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetmethod: ArkMethod) => void;
    private addIssueReport;
    private getLineAndColumn;
    private usedStmtProcess;
    isArray(stmt: Stmt): boolean;
    getTruelyArrDef(stmt: Stmt): Local | null;
    getArrDef(stmt: ArkAssignStmt, tempName: string): Local | null;
    private isArrInLeft;
    private isCalculatedStmt;
    private exprProcess;
    private binopProcess;
    private unopProcess;
    private noEXprProcess;
    private whereIsTepm;
    private leftTempRecursion;
    isNumberOp(op: Value): boolean;
}
