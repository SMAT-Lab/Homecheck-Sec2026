import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { MatcherCallback } from "../../Index";
export declare class NoExtraNonNullAssertionCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueMap;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private visitNodes;
    private checkNestedNonNullExpression;
    private checkParenthesizedNonNullExpression;
    private checkOptionalChainingWithNonNull;
    private reportSortedIssues;
    private addIssueReport;
}
