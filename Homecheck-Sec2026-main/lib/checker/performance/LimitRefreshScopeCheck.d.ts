import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class LimitRefreshScopeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly IF: string;
    readonly CREATE: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private traverseViewTree;
    private checkParentNode;
    private getWarnInfoByVals;
    private addIssueReport;
    private getLineAndColumn;
}
