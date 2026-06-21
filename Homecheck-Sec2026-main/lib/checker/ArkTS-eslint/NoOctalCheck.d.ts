import { ArkMethod } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoOctalCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly FOREACH_STR: string;
    readonly CREAER_STR: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private addIssueReport;
    private getLineAndColumn;
    private checkCode;
}
