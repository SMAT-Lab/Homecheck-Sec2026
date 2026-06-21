import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class NoArrayConstructorCheck implements BaseChecker {
    metaData: BaseMetaData;
    defects: Defects[];
    issues: IssueReport[];
    rule: Rule;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkArray;
    private checkNewAndCallExpression;
    private checkGlobalArray;
    private createIssue;
    private isInLocalScope;
    private addIssueReport;
}
