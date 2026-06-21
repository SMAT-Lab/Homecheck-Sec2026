import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class MaxDepthCheck implements BaseChecker {
    metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defaultOptions;
    private fileMatcher;
    private functionStack;
    private maxDepth;
    private arkFile;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private initializeOptions;
    private checkDepth;
    private handleNodeEntry;
    private handleNodeExit;
    private isElseIfClause;
    private incrementDepth;
    private reportIssue;
    private addIssueReport;
}
