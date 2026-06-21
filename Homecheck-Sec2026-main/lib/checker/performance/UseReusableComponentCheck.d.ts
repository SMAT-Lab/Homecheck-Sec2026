import { ArkFile, ViewTreeNode } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class UseReusableComponentCheck implements BaseChecker {
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
    private isReuseableComponent;
    reportIssue(arkFile: ArkFile, reportNode: ViewTreeNode): void;
}
