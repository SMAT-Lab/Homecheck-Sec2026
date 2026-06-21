import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class OptionalParametersCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMethod: ArkMethod) => void;
    private getStartColumn;
    private reportIssue;
}
