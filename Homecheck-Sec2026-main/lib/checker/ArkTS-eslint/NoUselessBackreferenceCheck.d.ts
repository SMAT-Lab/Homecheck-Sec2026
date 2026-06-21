import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, MatcherCallback } from '../../Index';
import { Defects, IssueReport } from '../../model/Defects';
export declare class NoUselessBackreferenceCheck implements BaseChecker {
    private readonly cache;
    private messageId;
    private backReferenceInfo;
    private get messages();
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private filePath;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    /**
     *
     * 在 JavaScript 中，使用斜杠 / 定义正则表达式时，反向引用直接用 \n 表示；
     * 使用 RegExp 构造函数时，由于字符串中的反斜杠需要转义，所以要写成 \\n。
     * 在替换字符串中，使用 $n 来引用捕获组。
     */
    check: (target: ArkFile) => void;
    private visitNode;
    /**
 * 检查是否为全局 RegExp 对象
 */
    private isGlobalRegExp;
    /**
     * 验证是否为全局 RegExp
     */
    private validateGlobalRegExp;
    /**
     * 检查是否为块级作用域
     */
    private isBlockScope;
    /**
     * 检查是否为函数作用域
     */
    private isFunctionScope;
    /**
     * 检查块级作用域中是否有局部 RegExp 声明
     */
    private hasLocalRegExpDeclaration;
    /**
     * 检查语句列表中是否包含 RegExp 声明
     */
    private checkStatements;
    /**
     * 检查变量声明列表中是否包含 RegExp 声明
     */
    private checkVariableDeclarations;
    /**
     * 检查函数参数中是否包含 RegExp
     */
    private hasRegExpParameter;
    /**
     * 检查 RegExp 别名
     */
    private checkRegExpAlias;
    /**
     * 检查全局作用域中的别名声明
     */
    private checkGlobalAliasDeclaration;
    /**
     * 查找别名声明
     */
    private findAliasDeclaration;
    /**
     * 检查初始化器是否为 RegExp
     */
    private isRegExpAliasInitializer;
    private extractRegExpPattern;
    /**
     * 获取标识符的值
     * @param node 标识符节点
     * @returns 标识符的字符串值，如果无法确定则返回 null
     */
    private getIdentifierValue;
    /**
     * 在源文件中查找标识符的值
     */
    private findIdentifierValueInSourceFile;
    /**
     * 查找变量声明
     */
    private findVariableDeclaration;
    /**
     * 检查是否为目标变量声明
     */
    private isTargetVariableDeclaration;
    /**
     * 从声明中提取值
     */
    private extractDeclarationValue;
    /**
     * 评估模板表达式
     */
    private evaluateTemplateExpression;
    /**
     * 评估模板表达式片段
     */
    private evaluateTemplateSpan;
    /**
     * 处理字符串拼接表达式
     */
    private evaluateStringConcatenation;
    /**
     * 评估字符串操作数
     */
    private evaluateStringOperand;
    private findCaptureGroups;
    private computeCaptureGroups;
    /**
     * 检查是否为开括号
     */
    private isOpenParenthesis;
    /**
     * 检查是否为闭括号
     */
    private isCloseParenthesis;
    /**
     * 处理开括号
     */
    private processOpenParenthesis;
    /**
     * 检查是否是命名捕获组
     */
    private isNamedCaptureGroup;
    /**
     * 检查是否是非捕获组或环视
     */
    private isNonCapturingOrLookaround;
    /**
     * 处理闭括号
     */
    private processCloseParenthesis;
    /**
     * 提取组内容
     */
    private extractGroupContent;
    /**
     * 提取组名
     */
    private extractGroupName;
    private findClosingParenthesis;
    private isParenthesis;
    private findBackReferences;
    private computeBackReferences;
    private shouldSkipCharacter;
    private isCharClassBoundary;
    private extractBackReference;
    private isEscaped;
    /**
     * 检查是否为前向引用
     */
    private isForwardReference;
    /**
     * 检查先行断言中的前向引用
     */
    private isForwardReferenceInLookahead;
    /**
     * 查找下一个先行断言
     */
    private findNextLookahead;
    /**
     * 检查引用是否在先行断言范围内
     */
    private isReferenceInLookahead;
    /**
     * 检查非先行断言中的前向引用
     */
    private isForwardReferenceOutsideLookahead;
    /**
     * 查找包含指定位置的非捕获组
     */
    private findEnclosingNonCapturingGroup;
    private isInLookbehind;
    private isInAnyLookbehind;
    /**
 * 检查是否为后行断言中的后向引用
 */
    private isBackwardReferenceInLookbehind;
    /**
     * 查找所有后行断言
     */
    private findAllLookbehinds;
    /**
     * 检查是否为无效的后向引用
     */
    private isInvalidBackwardReference;
    /**
     * 检查组和引用的位置关系
     */
    private checkGroupReferenceRelation;
    /**
     * 检查同一后行断言内的引用是否无效
     */
    private isInvalidReferenceInSameLookbehind;
    private isInSameLookahead;
    private hasRegExpSyntaxError;
    /**
 * 获取正则表达式的标志位
 */
    private getRegExpFlags;
    /**
     * 检查节点是否为正则表达式节点
     */
    private isRegExpNode;
    /**
     * 获取第二个参数
     */
    private getSecondArgument;
    /**
     * 从参数中提取标志位
     */
    private extractFlagsFromArgument;
    /**
     * 从标识符中获取标志位
     */
    private getFlagsFromIdentifier;
    private analyzeRegexPattern;
    private findReferencedGroup;
    private validateBackReference;
    private isReferenceInGroup;
    private isCircularReference;
    private performReferenceChecks;
    private reportViolation;
    private isPositionInRange;
    private isElementInLookaround;
    private calculateRelativeIndex;
    private isInSameLookaround;
    private findAllLookarounds;
    private getLookaroundType;
    private isNegativeLookaround;
    private checkLookaroundContainment;
    private areElementsInSameLookaround;
    private checkNestedLookarounds;
    private checkNestedLookaroundPattern;
    private adjustGroupPositionForNested;
    private isInRange;
    private isGroupInRange;
    private isInDifferentAlternative;
    private collectAlternatives;
    private addAlternative;
    private hasConflictInAlternatives;
    private hasConflictInNestedAlternatives;
    private adjustGroupPosition;
    private isInDifferentOther;
    private collectTopLevelAlternatives;
    private checkNestedGroupsAndBranches;
    private analyzeNestedGroups;
    private checkAlternativesForConflicts;
    private findElementLocations;
    private isOpeningParenthesis;
    private isClosingParenthesis;
    private isTopLevelAlternative;
    private isAlternativeBoundary;
    private handleOpeningParenthesis;
    private handleClosingParenthesis;
    private handleAlternativeBoundary;
    private hasConflictingLocations;
    private isInNegativeLookaround;
    private checkNestedNegativeLookarounds;
    private findNextLookAround;
    private isInvalidNegativeLookaround;
    private originalNegativeLookaroundCheck;
    private hasNestedNegativeLookaround;
    private reportIssue;
    private addIssueReport;
}
