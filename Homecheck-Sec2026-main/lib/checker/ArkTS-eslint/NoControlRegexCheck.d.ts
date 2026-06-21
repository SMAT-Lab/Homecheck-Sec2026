import { ArkMethod } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoControlRegexCheck implements BaseChecker {
    readonly REG_EXP = "RegExp";
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkMethod) => void;
    private getCheck;
    private checkCode;
    private addIssueReport;
    private getLineAndColumn;
}
