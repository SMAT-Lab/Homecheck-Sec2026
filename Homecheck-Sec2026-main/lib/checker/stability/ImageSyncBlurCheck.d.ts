import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ImageSyncBlurCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private traverseViewTree;
    private checkSyncBlurByVals;
    private traversalLocals;
    private traversalDefaultClass;
    private checkFieldsForAdaptiveColor;
    private reportIssue;
}
