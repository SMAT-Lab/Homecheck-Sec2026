import { ArkClass } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { MatcherCallback } from '../../matcher/Matchers';
export declare class RemoveContainerWithoutPropertyCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private traverseViewTree;
    private reportIssue;
}
