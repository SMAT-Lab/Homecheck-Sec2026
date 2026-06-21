import { ArkField } from 'arkanalyzer/lib';
import { BaseMetaData, BaseChecker } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class PreferLiteralEnumMemberCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkField) => void;
    /**
     * 检查字符串是否是纯字符串、纯数字或以斜杠开头和结尾。
     * 纯字符串：必须被单引号或双引号包围。
     * 纯数字：仅包含数字字符。
     * 以斜杠开头和结尾：字符串以斜杠开头和结尾(符合正则格式)。
     * @param input 要检查的字符串
     * @returns 如果字符串符合任一条件，则返回 true；否则返回 false
     */
    private isPureStringOrNumberOrStartsEndsWithSlash;
    /**
     * 检查字符串是否符合按位运算符的格式，并且操作数必须是数字类型（整数或浮点数）。
     * 按位运算符包括：&、|、^、~、<<、>>、>>>。
     * @param input 要检查的字符串
     * @returns 如果字符串符合按位运算符的格式，并且操作数是数字类型，则返回 true；否则返回 false
     */
    private isBitwiseOperationWithNumbers;
    private addIssueReport;
    private getLineAndColumn;
    private getFileExtension;
    private process;
}
