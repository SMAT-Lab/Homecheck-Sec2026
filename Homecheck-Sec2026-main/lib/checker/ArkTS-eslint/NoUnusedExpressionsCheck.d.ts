import { Stmt, Value } from 'arkanalyzer/lib';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../../checker/BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
declare enum ExpType {
    Tag = "tag",
    func = "function",
    allowShortCircuit = "allowShortCircuit",
    allowTernary = "allowTernary",
    allowTaggedTemplates = "allowTaggedTemplates"
}
type NoUsedExpression = {
    stmt: Stmt;
    originalText: string;
    exptype?: ExpType;
    posion?: [lineNo: number, lineCol: number];
};
type AllowOptionEntries = {
    allowShortCircuit?: boolean;
    allowTaggedTemplates?: boolean;
    allowTernary?: boolean;
};
interface Options {
    allow: AllowOptionEntries;
}
export declare class NoUnusedExpressionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    textTernary: string;
    textTernaryBefor: string;
    textCircuit: string;
    textCircuitBefor: string;
    TernaryErrorCount: number;
    CircuitErrorCount: number;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private arkFieldExpressionsProcess;
    expressionsProcess(stmts: Stmt[], mergedOptions: Options, noUsedExpression: NoUsedExpression[], exportLineNo: number): void;
    private checkExpression;
    private isNoExpression;
    isrightOpExpr(rightOp: Value, originalText: string): boolean;
    isCircuit(rightOp: Value): boolean;
    allowShortCircuitExpressions(rightOp: Value): Boolean;
    allowTernaryExpressions(Op: any): Boolean;
    isValidTernary(expression: string): boolean;
    isValidExpression(expression: string): boolean;
    isPressfunc(expression: string): boolean;
    isTaggedString(expression: string): boolean;
    private filterUnuseds;
    isAssignDefaultStatement(text: string): boolean;
    private isAssignText;
    private addIssueReport;
    private getLineAndColumn;
    private processExpress;
    private funcInTernary;
    private execPress;
    private execPressV;
    private execText;
    private execEnd;
    private execInvoke;
    private execAsignStmt;
    private isFirstStringNoAsgin;
    private removeSemicolonAndCheckExclamation;
    private isFunctionCall;
    private isKeyWord;
}
export {};
