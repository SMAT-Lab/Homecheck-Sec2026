import { ArkClass } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class AvoidMemoryLeakInAnimator implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private getCreateStmt;
    private getFinishOrCancelStmt;
    private getEmptyStmt;
    private reportIssue;
}
