import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoUselessEscapeCheck implements BaseChecker {
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private filePath;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkAction;
    private traverseAst;
    private shouldCheckNode;
    private processNode;
    private addSortedWarnings;
    private checkStringLiteral;
    private checkTemplatePart;
    private checkTextForUselessEscapes;
    /**
     * 检查正则表达式字面量中是否存在不必要的转义字符
     * @param node - 正则表达式字面量节点
     * @param sourceFile - 源文件对象
     * @param target - ArkFile 对象，用于获取文件路径
     */
    private checkRegexLiteral;
    /**
     * 检查使用 new RegExp 构造函数创建的正则表达式中是否存在不必要的转义字符
     * @param node - new RegExp 调用节点
     * @param sourceFile - 源文件对象
     * @param target - ArkFile 对象，用于获取文件路径
     */
    private checkRegExpConstructor;
    private commonCheckRegex;
    private handleCharacterClass;
    private checkEscapeCharacter;
    /**
     * 判断转义字符是否为不必要的转义
     * @param inCharClass - 是否处于字符类内部
     * @param regexStr - 正则表达式模式的文本内容
     * @param index - 当前字符的索引
     * @param nextChar - 转义字符后面的字符
     * @param charClassStartIndex - 字符类的起始索引
     * @param unicode - 是否启用 Unicode 模式
     * @param unicodeSets - 是否启用 Unicode 集合模式
     * @param characterClassStack - 字符类栈
     * @param start - 正则表达式模式在源文件中的起始位置
     * @returns 是否为不必要的转义
     */
    private isUselessEscape;
    private handleInCharClassEscapes;
    private shouldKeepDashEscape;
    private shouldKeepUnicodeEscape;
    private isSpecialPunctuator;
    private handleNonUnicodeCharClass;
    private handleCharClassEscapes;
    private handleCharClassSpecialCases;
    private getValidEscapes;
    private isUnnecessaryBracketEscape;
    private isUnnecessaryDashEscape;
    private isDashInMiddleOfClass;
    private isValidUnicodeProperty;
    private isRepeatedChar;
    private isSubsequentEscape;
    private isValidDoublePunctuatorEscape;
    private isCharClassWithSpecialCombination;
    private isSurrogatePair;
    private addIssueReport;
}
