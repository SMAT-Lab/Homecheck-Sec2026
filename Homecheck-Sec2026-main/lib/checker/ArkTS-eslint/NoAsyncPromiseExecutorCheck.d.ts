import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class NoAsyncPromiseExecutorCheck implements BaseChecker {
    metaData: BaseMetaData;
    readonly PROMISE_NAME: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private addIssueReport;
    private getLineAndColumn;
    private findSpecialStatement;
}
