import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, MatcherCallback } from '../../Index';
import { Defects, IssueReport } from '../../model/Defects';
export declare class BanTSLintCommentCheck implements BaseChecker {
    readonly REGEX_ENABLE_DISABLE: RegExp;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private filePath;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private processCommentRanges;
    private processNodeComments;
    private processMethodComments;
    private visitNode;
    private getComments;
    private handleComment;
    private removeNewlines;
    private getAllComments;
    private checkMethodComment;
    private checkComment;
    private ruleFix;
    private addIssueReport;
}
