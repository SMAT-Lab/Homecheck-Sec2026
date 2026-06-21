import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export type Option = [
    {
        reportUnusedFallthroughComment?: boolean;
        allowEmptyCase?: boolean;
        commentPattern?: string;
    }
];
export declare class NoFallthroughCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    rule: Rule;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private defaultOptions;
    private sourceFile;
    check: (target: ArkFile) => void;
    private checkAction;
    private checkSwitchStatements;
    private validateSwitchStatement;
    private checkAllPathsTerminate;
    private checkFallthroughComment;
    private checkFallthroughCommentBetweenCases;
    private hasTerminatorStatement;
    private isEmptyCase;
    private isMergedCase;
    private validateCase;
    private validateUnusedFallthroughComment;
    private checkBlockScopedFallthroughComment;
    private checkHasComment;
    private addIssueReport;
    private hasOnlyRegularComments;
    private hasOnlyEmptyStatements;
}
