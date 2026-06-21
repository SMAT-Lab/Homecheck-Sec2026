import { ArkFile } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoExAssignCheck implements BaseChecker {
    readonly CATCH_NAME = "catch";
    readonly THROW_NAME = "throw ";
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkAction;
    private traverseNodes;
    private processCatchClause;
    private extractCatchVariables;
    private checkStatement;
    private checkIsExpression;
    private checkArrayDestructuring;
    private checkArrayLiteralExpression;
    private checkObjectDestructuring;
    private checkObjectLiteralExpression;
    private addViolation;
    private addIssueReport;
}
