import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
import { Defects, IssueReport } from "../../model/Defects";
export declare class PreferTsExpectErrorCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private getFileExtension;
    private extractComments;
    private isTsIgnoreComment;
    private ruleFix;
    private addIssueReportNodeFix;
}
