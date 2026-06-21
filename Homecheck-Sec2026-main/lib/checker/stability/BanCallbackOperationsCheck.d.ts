import { ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class BanCallbackOperationsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    issues: IssueReport[];
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkMethod) => void;
    private processStmts;
    private reportIssue;
}
