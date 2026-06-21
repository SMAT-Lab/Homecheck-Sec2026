import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoStateVarAccessInLoopCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private accessInLoopInCurrentClass;
    private blockProcess;
    private loopBlockStmtsProcess;
    private isStmtReadStateVar;
    private isLoopBlock;
    private isFirstBlock;
    private isLastBlock;
    private addIssueReport;
    private getLineAndColumn;
}
