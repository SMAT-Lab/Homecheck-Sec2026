import { Stmt, ArkClass, AbstractInvokeExpr } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class NoUselessConstructorCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly constructor_ = "constructor";
    readonly super_ = "super";
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetArkClass: ArkClass) => void;
    private arkClassProcess;
    private srgUsedModifiers;
    private checkAccessibilityConstructor;
    modifyArrayStmts(arr: Stmt[], countToRemove: number): Stmt[];
    getInvokeExprFromStmt(stmt: Stmt): AbstractInvokeExpr | null;
    private addIssueReport;
    private addIssueReport_01;
    private getLineAndColumn;
    private getLineAndColumnMethod;
    private getStartStmtNumber;
}
