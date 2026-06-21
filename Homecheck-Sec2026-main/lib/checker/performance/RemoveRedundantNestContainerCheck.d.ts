import { ArkClass } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class RemoveRedundantNestContainerCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private getViewTreeDepth;
    private reportIssue;
}
