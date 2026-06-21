import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from "../../matcher/Matchers";
import { ArkFile } from "arkanalyzer";
import { Defects } from "../../Index";
import { IssueReport } from "../../model/Defects";
export declare class NoTrailingSpacesCheck implements BaseChecker {
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    private defaultOptions;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkTrailingSpaces;
    private getTemplateStringRanges;
    private createFix;
}
