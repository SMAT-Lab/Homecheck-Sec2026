import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class UseAttributeUpdaterControlRefreshScopeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetCla: ArkClass) => void;
    private traverseViewTree;
    private isCustomNodeInParentNodes;
    private getNearParentName;
    private reportReuseComponentAndContinueTraverse;
    private classProcess;
    private attributeCheck;
    private viewTreeProcess;
    private setIssueReport;
    private aboutToReuseMethod;
    private isInAboutToReuse;
    private isHasViewtree;
    private isReuseableComponent;
    private reportIssue;
}
