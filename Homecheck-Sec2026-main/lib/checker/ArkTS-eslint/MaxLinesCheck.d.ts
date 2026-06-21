import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class MaxLinesCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defalutOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private getOption;
    check: (target: ArkFile) => void;
    private addIssueReport;
}
