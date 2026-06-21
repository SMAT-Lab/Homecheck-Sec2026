import { ArkField } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class PreferEnumInitializwersCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkField) => void;
    private addIssueReport;
    private getLineAndColumn;
}
