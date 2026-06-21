import { ArkClass } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class CustomdialogNotAssignValueCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private classMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private reportIssue;
}
