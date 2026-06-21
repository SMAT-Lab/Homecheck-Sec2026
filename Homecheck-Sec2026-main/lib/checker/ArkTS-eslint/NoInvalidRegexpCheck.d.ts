import { ArkMethod } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export type Option = [
    {
        allowConstructorFlags?: Array<string>;
    }
];
export declare class NoInvalidRegexpCheck implements BaseChecker {
    readonly REG_EXP = "RegExp";
    readonly RULE_ID = "no-invalid-regexp";
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    private defaultOptions;
    check: (target: ArkMethod) => void;
    private getFlags;
    private getPattern;
    private unescapeString;
    private isValidRegExp;
    private removeOptions;
    private getLineAndColumn;
    private addIssueReport;
    /**
     * 格式化正则表达式错误消息
     */
    private formatRegExpErrorMessage;
}
