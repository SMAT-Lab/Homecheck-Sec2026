import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
export declare class RequireArraySortCompareCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly SHORT_STR: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private isRegularArray;
    private addIssueReport;
    private getLineAndColumn;
}
