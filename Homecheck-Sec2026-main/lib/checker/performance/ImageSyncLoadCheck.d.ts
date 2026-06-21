import { ArkMethod } from 'arkanalyzer/lib';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ImageSyncLoadCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly IMAGE: string;
    readonly SYNCLOAD: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass | ArkMethod) => void;
    private obtainClassViewTree;
    private obtainMethodViewTree;
    private traverseViewTree;
    private checkSyncLoadByVals;
    private addIssueReport;
    private getLineAndColumn;
}
