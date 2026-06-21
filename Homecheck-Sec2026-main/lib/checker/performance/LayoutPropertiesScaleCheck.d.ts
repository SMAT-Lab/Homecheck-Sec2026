import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class LayoutPropertiesScaleCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMethod: ArkMethod) => void;
    private parameterComper;
    private stmtComper;
    private isInViewTree;
    private checkChildren;
    private checkVal;
    private isStateVariable;
    private reportIssue;
}
