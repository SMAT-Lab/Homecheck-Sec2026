import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoRegexSpacesCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    rule: Rule;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkAction;
    private checkRegexLiteral;
    private hasInvalidMultipleSpaces;
    private handleCharClass;
    private handleLookahead;
    private handleQuantifier;
    private handleEscapedCharacter;
    private isInvalidSpace;
    private checkRegExpConstructor;
    private fixRegExpString;
    private fixMultipleSpaces;
    private saveSpecialParts;
    private fixLookaheads;
    private spacesRegex;
    private fixQuantifiers;
    private fixRegularSpaces;
    private restoreSavedParts;
    private countConsecutiveSpaces;
    /**
     * 处理转义字符
     */
    private handleEscapeCharacter;
    /**
     * 处理字符类
     */
    private handleCharacterClass;
    /**
     * 处理非空格字符
     */
    private handleNonSpaceCharacter;
    /**
     * 检查字符是否为量词
     */
    private isQuantifier;
    /**
     * 更新最大空格计数
     */
    private updateMaxSpaceCount;
    private isSpecialRegexPattern;
    private getFirstSpaceSequenceLength;
    private createFix;
    private addIssueReport;
    private findClosingBracket;
}
