import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects } from "../../model/Defects";
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
import { IssueReport } from "../../model/Defects";
export declare class AdjacentOverloadSignaturesCheck implements BaseChecker {
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkBodyForOverloadMethods;
    private visit;
    private getMemberMethod;
    private isSameMethod;
    private getNodeMembers;
    private addIssueReport;
}
