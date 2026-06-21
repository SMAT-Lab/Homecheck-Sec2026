import { ArkMethod } from "arkanalyzer";
import { BaseMetaData, BaseChecker } from "../BaseChecker";
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from "../../model/Defects";
export declare class NoLossOfPrecisionCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetMtd: ArkMethod) => void;
    private checkBinaryExpression;
    private checkIntegerstartsWithZero;
    /**
     * 检查是否是小数
     */
    private isDecimalNumber;
    private checkIntegerRange;
    private checkExponentAndMantissa;
    private checkDecimalPart;
    private getNumberValue;
    private isNumber;
    private addIssueReport;
    private getLineAndColumn;
}
