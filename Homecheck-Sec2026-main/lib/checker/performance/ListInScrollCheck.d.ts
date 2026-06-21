import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ListInScrollCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetCla: ArkClass) => void;
    private recursionCheck;
    private hasWidthAndHeight;
    private reportIssue;
}
