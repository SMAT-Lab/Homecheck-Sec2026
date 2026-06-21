import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class UseGridLayoutOptionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly GRID_COMPONENT: string;
    readonly FOREACH_COMPONENT: string;
    readonly GRID_ITEM: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private traverseViewTree;
    private isCustomNodeInParentNodes;
    private hasGridItemChange;
    private getNearParentNode;
    private hasGridSetLayoutOptions;
    private addIssueReport;
    private getLineAndColumn;
}
