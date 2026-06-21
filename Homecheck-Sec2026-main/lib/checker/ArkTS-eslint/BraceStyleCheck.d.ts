import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
type MessageInfo = {
    nextLineIsOpen: string;
    sameLineIsOpen: string;
    blockIsSameLine: string;
    nextLineIsClose: string;
    singleLineIsClose: string;
    sameLineIsClose: string;
};
interface NodeInfo {
    node: ts.Node;
    openingCurlyToken: ts.Node;
    closingCurlyToken: ts.Node;
    tokenBeforeOpeningCurly: ts.Node | null;
    tokenAfterOpeningCurly: ts.Node | null;
    tokenBeforeClosingCurly: ts.Node | null;
    tokenAfterClosingCurly: ts.Node | null;
}
export declare class BraceStyleCheck implements BaseChecker {
    rule: Rule;
    private defaultOptions;
    defects: Defects[];
    issues: IssueReport[];
    private filePath;
    private readonly specialBlockKinds;
    private readonly lineCache;
    metaData: BaseMetaData;
    messages: MessageInfo;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private getDefaultOption;
    check: (target: ArkFile) => void;
    /**
     * AST 节点遍历函数，通过剪枝策略减少不必要的节点遍历
     * @param sourceFile 源文件
     * @param callback 遍历每个节点时执行的回调函数
     */
    private traverseAST;
    private findBraceTokens;
    checkAllBlocks(sourceFile: ts.SourceFile): void;
    checkBraceExits(node: ts.Node, sourceFile: ts.SourceFile): void;
    private nodeKindIsSpecialBlock;
    private isTokenOnSameLine;
    private validateCurlyPair;
    private validateClassBraces;
    private shouldSkipClassValidation;
    private validateClassOpeningBrace;
    private handleAllmanOpeningBrace;
    private handleOtherStyleOpeningBrace;
    private skipSpecialBlockCheck;
    private validateClassClosingBrace;
    private validateOpeningBrace;
    validateAllManOpeningBrace(nodeInfo: NodeInfo, allowSingleLine: boolean, isSingleLine: boolean, sourceFile: ts.SourceFile): void;
    private validateNoAllManOpeningBrace;
    private validateBlockStatements;
    private validateClosingBrace;
    private validateClosingBraceSameLine;
    private validateClosingBraceAfterToken;
    /**
     * 获取左花括号前的token
     */
    private findTokenBeforeOpeningCurly;
    private traverseNodeForClosingCurly;
    private findTokenBeforeClosingCurly;
    /**
     * 处理特殊节点
     * @param node 当前节点
     * @param prevToken 前一个token
     * @param child 遍历到的token节点
     * @returns
     */
    private handleSpecialNode;
    /**
     * 获取左花括号后的token
     */
    private findTokenAfterOpeningCurly;
    private getParentIfStatement;
    private handleIfStatement;
    private getParentTryStatement;
    private handleTryStatement;
    /**
     * 获取右花括号后的token
     */
    private findTokenAfterClosingCurly;
    private handleNextLineOpen;
    private handleNextLineClose;
    private handleSameLineOpen;
    private handleSingleLineClose;
    private handleSameLineClose;
    private handleBlockSameLine;
    private ruleFix;
    private addBraceStyleIssue;
    private addIssueReport;
}
export {};
