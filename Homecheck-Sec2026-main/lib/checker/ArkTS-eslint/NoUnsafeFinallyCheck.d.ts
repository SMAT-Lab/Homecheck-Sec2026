import { ArkFile } from 'arkanalyzer';
import { Rule } from '../../model/Rule';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
interface Violation {
    line: number;
    character: number;
    type: MessageType;
    filePath?: string;
}
declare enum MessageType {
    return = "return",
    break = "break",
    throw = "throw",
    continue = "continue"
}
export declare class NoUnsafeFinallyCheck implements BaseChecker {
    issues: IssueReport[];
    private messages;
    rule: Rule;
    defects: Defects[];
    private sourceFile;
    private violations;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private isFunctionOrClassNode;
    private isLoopNode;
    private isSwitchNode;
    checkNoUnsafeFinally(target: ArkFile): Violation[];
    private checkNode;
    private checkLabeledStatement;
    private checkLabeledWhileStatement;
    private checkLabeledSwitchStatement;
    private checkSwitchCasesForUnsafeBreak;
    private checkSwitchCasesForBreak;
    private getCaseClauses;
    private checkCaseClauseForLabeledBreak;
    private checkNodeForLabeledBreak;
    private checkForUnsafeBreakOrContinue;
    private checkTryStatement;
    private checkFinallyBlockChild;
    private checkIfStatement;
    private checkStatementForReturns;
    private addViolation;
    private addIssueReport;
}
export {};
