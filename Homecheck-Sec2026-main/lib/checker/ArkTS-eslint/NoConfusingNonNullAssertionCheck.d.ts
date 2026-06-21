import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects } from "../../model/Defects";
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
import { IssueReport } from '../../model/Defects';
export declare class NoConfusingNonNullAssertionCheck implements BaseChecker {
    metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkFile) => void;
    private checkConfusingNonNullAssertion;
    private getNextToken;
    private findNodeAtPosition;
    private isComment;
    private handleBinaryExpression;
    private isTargetOperator;
    private hasConfusingExclamation;
    private processExpression;
    private containsNonNullAssertion;
    private createPrimaryExpressionResult;
    private createFallbackResult;
    private getPrimaryExpressionMessage;
    private addIssueReport;
}
