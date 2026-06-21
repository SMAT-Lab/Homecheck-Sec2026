import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ColorOverlayEffectCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly gFilePath: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private traverseViewTree;
    private stackOperation;
    private childrenCheck;
    private getOrgStr;
    private attributeCheck;
    private setReportIssue;
    private addIssueReport;
    private getLineAndColumn;
}
