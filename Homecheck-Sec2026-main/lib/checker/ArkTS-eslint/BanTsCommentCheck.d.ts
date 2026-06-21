import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { IssueReport } from '../../model/Defects';
export declare class BanTsCommentCheck implements BaseChecker {
    private defaultOptions;
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    descriptionLength: number;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private extractComments;
    private checkComments;
    private checkExpectError;
    private checkOption;
    private checkDescriptionFormat;
    private addIssueReportNode;
}
