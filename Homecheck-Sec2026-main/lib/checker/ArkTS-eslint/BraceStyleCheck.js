"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BraceStyleCheck = void 0;
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'BraceStyleCheck');
var BraceStyle;
(function (BraceStyle) {
    BraceStyle["TBS1"] = "1tbs";
    BraceStyle["STROUSTRUP"] = "stroustrup";
    BraceStyle["ALLMAN"] = "allman";
})(BraceStyle || (BraceStyle = {}));
;
class BraceStyleCheck {
    rule;
    defaultOptions = [BraceStyle.TBS1, { allowSingleLine: false }];
    defects = [];
    issues = [];
    filePath = '';
    // 缓存常用的 SyntaxKind 判断结果
    specialBlockKinds = new Set([
        arkanalyzer_1.ts.SyntaxKind.ElseKeyword,
        arkanalyzer_1.ts.SyntaxKind.CatchKeyword,
        arkanalyzer_1.ts.SyntaxKind.FinallyKeyword
    ]);
    // 使用 WeakMap 缓存节点的行号信息，避免重复计算
    lineCache = new WeakMap();
    metaData = {
        severity: 1,
        ruleDocPath: 'docs/brace-style.md',
        description: 'Enforce consistent brace style for blocks.',
    };
    messages = {
        nextLineIsOpen: 'Opening curly brace does not appear on the same line as controlling statement.',
        sameLineIsOpen: 'Opening curly brace appears on the same line as controlling statement.',
        blockIsSameLine: 'Statement inside of curly braces should be on next line.',
        nextLineIsClose: 'Closing curly brace does not appear on the same line as the subsequent block.',
        singleLineIsClose: 'Closing curly brace should be on the same line as opening curly brace or on the line after the previous block.',
        sameLineIsClose: 'Closing curly brace appears on the same line as the subsequent block.'
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcherCb];
    }
    ;
    getDefaultOption() {
        if (this.rule && this.rule.option && this.rule.option.length > 0) {
            if (this.rule.option.length === 1) {
                this.rule.option.push({ allowSingleLine: false });
            }
            return this.rule.option;
        }
        return [BraceStyle.TBS1, { allowSingleLine: false }];
    }
    ;
    check = (target) => {
        try {
            this.defaultOptions = this.getDefaultOption();
            let code = target.getCode();
            if (!code) {
                return;
            }
            ;
            this.filePath = target.getFilePath();
            if (this.filePath.endsWith('.ets')) {
                //   如果是ets文件需要将'struct ' 关键字替换为 ' class '在进行检查
                code = code.replace('struct ', ' class ');
            }
            ;
            const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(target.getName(), code);
            this.checkAllBlocks(sourceFile);
        }
        catch (error) {
            logger.error(`Error occurred while checking file: ${target.getFilePath()}, Error: ${error}`);
        }
        ;
    };
    /**
     * AST 节点遍历函数，通过剪枝策略减少不必要的节点遍历
     * @param sourceFile 源文件
     * @param callback 遍历每个节点时执行的回调函数
     */
    traverseAST(sourceFile, callback) {
        const nodesToCheck = new Set([
            arkanalyzer_1.ts.SyntaxKind.Block,
            arkanalyzer_1.ts.SyntaxKind.SourceFile,
            arkanalyzer_1.ts.SyntaxKind.CaseClause,
            arkanalyzer_1.ts.SyntaxKind.DefaultClause,
            arkanalyzer_1.ts.SyntaxKind.ClassDeclaration,
            arkanalyzer_1.ts.SyntaxKind.ClassExpression,
            arkanalyzer_1.ts.SyntaxKind.InterfaceDeclaration,
            arkanalyzer_1.ts.SyntaxKind.EnumDeclaration,
            arkanalyzer_1.ts.SyntaxKind.ModuleDeclaration,
            arkanalyzer_1.ts.SyntaxKind.NamespaceExportDeclaration,
            arkanalyzer_1.ts.SyntaxKind.ModuleBlock,
            arkanalyzer_1.ts.SyntaxKind.CaseBlock,
            arkanalyzer_1.ts.SyntaxKind.SwitchStatement
        ]);
        const traverse = (node) => {
            if (nodesToCheck.has(node.kind)) {
                callback(node);
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, traverse);
        };
        traverse(sourceFile);
    }
    ;
    findBraceTokens(node, sourceFile) {
        let openBrace = null;
        let closeBrace = null;
        // 遍历所有子token
        const tokens = node.getChildren(sourceFile);
        for (const token of tokens) {
            if (token.kind === arkanalyzer_1.ts.SyntaxKind.OpenBraceToken) {
                openBrace = token;
            }
            ;
            if (token.kind === arkanalyzer_1.ts.SyntaxKind.CloseBraceToken) {
                closeBrace = token;
            }
            ;
        }
        ;
        return [openBrace, closeBrace];
    }
    ;
    // 检查所有花括号的位置
    checkAllBlocks(sourceFile) {
        this.traverseAST(sourceFile, (node) => {
            if (arkanalyzer_1.ts.isBlock(node)) {
                const parent = node.parent;
                // 如果父节点不存在，或者父节点是源文件，说明这是一个独立代码块
                if (!parent ||
                    arkanalyzer_1.ts.isSourceFile(parent) ||
                    arkanalyzer_1.ts.isCaseClause(parent) ||
                    arkanalyzer_1.ts.isDefaultClause(parent) ||
                    arkanalyzer_1.ts.isBlock(parent)) {
                    return;
                }
                ;
            }
            ;
            if (arkanalyzer_1.ts.isBlock(node) ||
                arkanalyzer_1.ts.isClassDeclaration(node) ||
                arkanalyzer_1.ts.isClassExpression(node) ||
                arkanalyzer_1.ts.isInterfaceDeclaration(node) ||
                arkanalyzer_1.ts.isEnumDeclaration(node) ||
                arkanalyzer_1.ts.isModuleDeclaration(node) ||
                arkanalyzer_1.ts.isNamespaceExportDeclaration(node) ||
                arkanalyzer_1.ts.isModuleBlock(node) ||
                arkanalyzer_1.ts.isCaseBlock(node) ||
                arkanalyzer_1.ts.isSwitchStatement(node)) {
                // 获取左右花括号位置
                this.checkBraceExits(node, sourceFile);
            }
            ;
        });
    }
    ;
    checkBraceExits(node, sourceFile) {
        try {
            const [openBrace, closeBrace] = this.findBraceTokens(node, sourceFile);
            if (openBrace && closeBrace) {
                let nodeInfo = {
                    node,
                    openingCurlyToken: openBrace,
                    closingCurlyToken: closeBrace,
                    tokenBeforeOpeningCurly: null,
                    tokenAfterOpeningCurly: null,
                    tokenBeforeClosingCurly: null,
                    tokenAfterClosingCurly: null,
                };
                this.validateCurlyPair(nodeInfo, sourceFile);
            }
        }
        catch (error) {
            logger.error(`Error checking block at position ${node.getStart()}:`, error);
        }
        ;
    }
    ;
    // 节点类型判断
    nodeKindIsSpecialBlock(node) {
        return this.specialBlockKinds.has(node.kind);
    }
    ;
    // 同行判断，使用缓存
    isTokenOnSameLine(left, right) {
        if (!left || !right) {
            logger.error(`Token node is null, please check.`);
            return false;
        }
        ;
        const getLineNumber = (node) => {
            let line = this.lineCache.get(node);
            if (line === undefined) {
                line = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line;
                this.lineCache.set(node, line);
            }
            ;
            return line;
        };
        return getLineNumber(left) === getLineNumber(right);
    }
    ;
    validateCurlyPair(nodeInfo, sourceFile) {
        // 确保所有token都有效
        if (!nodeInfo.openingCurlyToken || !nodeInfo.closingCurlyToken) {
            return;
        }
        ;
        const style = this.defaultOptions[0];
        const allowSingleLine = this.defaultOptions[1].allowSingleLine;
        const isSingleLine = this.isTokenOnSameLine(nodeInfo.openingCurlyToken, nodeInfo.closingCurlyToken);
        // 获取左花括号前的token 
        nodeInfo.tokenBeforeOpeningCurly = this.findTokenBeforeOpeningCurly(nodeInfo.openingCurlyToken, sourceFile);
        // 获取右花括号前的token 
        nodeInfo.tokenBeforeClosingCurly = this.findTokenBeforeClosingCurly(nodeInfo.closingCurlyToken, sourceFile);
        // 获取左花括号后的token 
        nodeInfo.tokenAfterOpeningCurly = this.findTokenAfterOpeningCurly(nodeInfo.openingCurlyToken, sourceFile);
        // 获取右花括号后的token 
        nodeInfo.tokenAfterClosingCurly = this.findTokenAfterClosingCurly(nodeInfo.closingCurlyToken, sourceFile);
        // 检查是否是特殊块（else 或 catch 或 finally）
        const isSpecialBlock = nodeInfo.tokenAfterClosingCurly && this.nodeKindIsSpecialBlock(nodeInfo.tokenAfterClosingCurly);
        // 检查是否是完全单行的情况
        const isCompletelyOneLine = allowSingleLine &&
            ((style === BraceStyle.TBS1 && (!isSpecialBlock || this.isTokenOnSameLine(nodeInfo.closingCurlyToken, nodeInfo.tokenAfterClosingCurly))) ||
                (style === BraceStyle.STROUSTRUP && !isSpecialBlock)) &&
            isSingleLine && nodeInfo.tokenBeforeOpeningCurly && this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken);
        // 如果是允许的单行情况，跳过检查
        if (isCompletelyOneLine) {
            return;
        }
        ;
        // 检查类声明和静态块
        if (arkanalyzer_1.ts.isClassDeclaration(nodeInfo.node) || arkanalyzer_1.ts.isClassStaticBlockDeclaration(nodeInfo.node)) {
            this.validateClassBraces(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile);
            return;
        }
        ;
        // 检查左花括号位置
        this.validateOpeningBrace(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile);
        // 检查块内语句
        this.validateBlockStatements(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile);
        // 检查右花括号
        this.validateClosingBrace(nodeInfo, style, allowSingleLine, isSingleLine, isSpecialBlock, sourceFile);
    }
    ;
    validateClassBraces(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile) {
        // 如果是允许单行且确实是单行的情况，跳过检查
        if (nodeInfo.tokenBeforeOpeningCurly &&
            this.shouldSkipClassValidation(allowSingleLine, isSingleLine, nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken)) {
            return;
        }
        // 检查开始花括号位置
        this.validateClassOpeningBrace(style, nodeInfo, sourceFile, isSingleLine, allowSingleLine);
        // 检查结束花括号位置
        this.validateClassClosingBrace(allowSingleLine, nodeInfo, sourceFile);
    }
    ;
    shouldSkipClassValidation(allowSingleLine, isSingleLine, tokenBeforeOpeningCurly, openingCurlyToken) {
        return allowSingleLine && isSingleLine && this.isTokenOnSameLine(tokenBeforeOpeningCurly, openingCurlyToken);
    }
    ;
    validateClassOpeningBrace(style, nodeInfo, sourceFile, isSingleLine, allowSingleLine) {
        if (style === BraceStyle.ALLMAN) {
            this.handleAllmanOpeningBrace(nodeInfo, sourceFile, isSingleLine, allowSingleLine);
        }
        else {
            this.handleOtherStyleOpeningBrace(nodeInfo, sourceFile, isSingleLine, allowSingleLine);
        }
    }
    handleAllmanOpeningBrace(nodeInfo, sourceFile, isSingleLine, allowSingleLine) {
        if (nodeInfo.tokenBeforeOpeningCurly && this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken)) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.sameLineIsOpen, sourceFile, nodeInfo.node);
        }
        if (this.skipSpecialBlockCheck(nodeInfo, allowSingleLine, isSingleLine)) {
            return;
        }
        if (nodeInfo.tokenAfterOpeningCurly && this.isTokenOnSameLine(nodeInfo.tokenAfterOpeningCurly, nodeInfo.openingCurlyToken)) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.blockIsSameLine, sourceFile, nodeInfo.node);
        }
    }
    handleOtherStyleOpeningBrace(nodeInfo, sourceFile, isSingleLine, allowSingleLine) {
        if (nodeInfo.tokenBeforeOpeningCurly && !this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken)) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.nextLineIsOpen, sourceFile, nodeInfo.node);
        }
        if (this.skipSpecialBlockCheck(nodeInfo, allowSingleLine, isSingleLine)) {
            return;
        }
        if (nodeInfo.tokenAfterOpeningCurly && this.isTokenOnSameLine(nodeInfo.tokenAfterOpeningCurly, nodeInfo.openingCurlyToken)) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.blockIsSameLine, sourceFile, nodeInfo.node);
        }
    }
    skipSpecialBlockCheck(nodeInfo, allowSingleLine, isSingleLine) {
        return (isSingleLine && allowSingleLine) && !this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken);
    }
    validateClassClosingBrace(allowSingleLine, nodeInfo, sourceFile) {
        if (!allowSingleLine || !this.isTokenOnSameLine(nodeInfo.openingCurlyToken, nodeInfo.closingCurlyToken)) {
            if (nodeInfo.tokenBeforeClosingCurly && this.isTokenOnSameLine(nodeInfo.tokenBeforeClosingCurly, nodeInfo.closingCurlyToken) &&
                nodeInfo.openingCurlyToken.end !== nodeInfo.closingCurlyToken.pos) {
                this.addBraceStyleIssue(nodeInfo.closingCurlyToken, this.messages.singleLineIsClose, sourceFile, nodeInfo.node);
            }
        }
    }
    validateOpeningBrace(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile) {
        if (style === BraceStyle.ALLMAN) {
            this.validateAllManOpeningBrace(nodeInfo, allowSingleLine, isSingleLine, sourceFile);
        }
        else {
            this.validateNoAllManOpeningBrace(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile);
        }
        ;
    }
    ;
    validateAllManOpeningBrace(nodeInfo, allowSingleLine, isSingleLine, sourceFile) {
        const flag = nodeInfo.tokenBeforeOpeningCurly && this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken);
        if (flag && nodeInfo.tokenBeforeOpeningCurly === nodeInfo.openingCurlyToken) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.sameLineIsOpen, sourceFile, nodeInfo.node);
        }
        ;
        // allman 风格：所有花括号都应该在新行，除非是允许的单行情况
        if (!allowSingleLine || !isSingleLine) {
            if (flag && nodeInfo.tokenBeforeOpeningCurly !== nodeInfo.openingCurlyToken) {
                this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.sameLineIsOpen, sourceFile, nodeInfo.node);
            }
            ;
        }
        ;
    }
    validateNoAllManOpeningBrace(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile) {
        // 1tbs和stroustrup风格的处理
        const isBlockWithParent = arkanalyzer_1.ts.isBlock(nodeInfo.node) &&
            (arkanalyzer_1.ts.isClassStaticBlockDeclaration(nodeInfo.node.parent) || arkanalyzer_1.ts.isIfStatement(nodeInfo.node.parent) ||
                arkanalyzer_1.ts.isFunctionDeclaration(nodeInfo.node.parent) || arkanalyzer_1.ts.isArrowFunction(nodeInfo.node.parent) ||
                arkanalyzer_1.ts.isMethodDeclaration(nodeInfo.node.parent));
        const needsNewLine = !allowSingleLine || !isSingleLine || (isBlockWithParent &&
            nodeInfo.tokenBeforeOpeningCurly && !this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken));
        const isStroustrupException = style === BraceStyle.STROUSTRUP &&
            nodeInfo.tokenBeforeOpeningCurly?.kind === arkanalyzer_1.ts.SyntaxKind.CloseBraceToken;
        if (needsNewLine && !isStroustrupException && nodeInfo.tokenBeforeOpeningCurly &&
            (!this.isTokenOnSameLine(nodeInfo.tokenBeforeOpeningCurly, nodeInfo.openingCurlyToken) ||
                nodeInfo.tokenBeforeOpeningCurly === nodeInfo.openingCurlyToken)) {
            this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.nextLineIsOpen, sourceFile, nodeInfo.node);
        }
    }
    validateBlockStatements(nodeInfo, style, allowSingleLine, isSingleLine, sourceFile) {
        // allman 风格需要特殊处理
        if (style === BraceStyle.ALLMAN && (!allowSingleLine || !isSingleLine)) {
            if (nodeInfo.tokenAfterOpeningCurly &&
                this.isTokenOnSameLine(nodeInfo.tokenAfterOpeningCurly, nodeInfo.openingCurlyToken)) {
                this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.blockIsSameLine, sourceFile, nodeInfo.node);
            }
            ;
        }
        else if (style === BraceStyle.TBS1 && (!allowSingleLine || !isSingleLine)) {
            // 1tbs 风格：在不允许单行或是特殊块时检查
            if (nodeInfo.tokenAfterOpeningCurly &&
                this.isTokenOnSameLine(nodeInfo.tokenAfterOpeningCurly, nodeInfo.openingCurlyToken)) {
                this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.blockIsSameLine, sourceFile, nodeInfo.node);
            }
            ;
        }
        else if (style === BraceStyle.STROUSTRUP && (!allowSingleLine || !isSingleLine)) {
            // stroustrup 风格且不允许单行时，检查块内语句位置
            if (nodeInfo.tokenAfterOpeningCurly &&
                this.isTokenOnSameLine(nodeInfo.tokenAfterOpeningCurly, nodeInfo.openingCurlyToken)) {
                this.addBraceStyleIssue(nodeInfo.openingCurlyToken, this.messages.blockIsSameLine, sourceFile, nodeInfo.node);
            }
            ;
        }
        ;
    }
    ;
    // 检查右花括号
    validateClosingBrace(nodeInfo, style, allowSingleLine, isSingleLine, isSpecialBlock, sourceFile) {
        // 检查右花括号与前一个token的关系
        this.validateClosingBraceSameLine(nodeInfo, allowSingleLine, sourceFile);
        // 检查右花括号与后续块的关系
        if (nodeInfo.tokenAfterClosingCurly && (!allowSingleLine || !isSingleLine || isSpecialBlock)) {
            this.validateClosingBraceAfterToken(style, isSpecialBlock, nodeInfo, sourceFile);
        }
        ;
    }
    ;
    validateClosingBraceSameLine(nodeInfo, allowSingleLine, sourceFile) {
        const isAllmanWithSingleLine = allowSingleLine &&
            this.isTokenOnSameLine(nodeInfo.openingCurlyToken, nodeInfo.closingCurlyToken);
        if (nodeInfo.tokenBeforeClosingCurly &&
            (nodeInfo.tokenBeforeClosingCurly !== nodeInfo.openingCurlyToken) &&
            !isAllmanWithSingleLine &&
            this.isTokenOnSameLine(nodeInfo.tokenBeforeClosingCurly, nodeInfo.closingCurlyToken) &&
            nodeInfo.openingCurlyToken.end !== nodeInfo.closingCurlyToken.pos) {
            this.addBraceStyleIssue(nodeInfo.closingCurlyToken, this.messages.singleLineIsClose, sourceFile, nodeInfo.node);
        }
    }
    validateClosingBraceAfterToken(style, isSpecialBlock, nodeInfo, sourceFile) {
        if (style === BraceStyle.ALLMAN && isSpecialBlock &&
            this.isTokenOnSameLine(nodeInfo.closingCurlyToken, nodeInfo.tokenAfterClosingCurly)) {
            this.addBraceStyleIssue(nodeInfo.closingCurlyToken, this.messages.sameLineIsClose, sourceFile, nodeInfo.tokenAfterClosingCurly);
        }
        else if (style === BraceStyle.TBS1 && isSpecialBlock !== this.isTokenOnSameLine(nodeInfo.closingCurlyToken, nodeInfo.tokenAfterClosingCurly)) {
            this.addBraceStyleIssue(nodeInfo.closingCurlyToken, this.messages.nextLineIsClose, sourceFile, nodeInfo.tokenAfterClosingCurly);
        }
        else if (style === BraceStyle.STROUSTRUP && this.isTokenOnSameLine(nodeInfo.closingCurlyToken, nodeInfo.tokenAfterClosingCurly)) {
            this.addBraceStyleIssue(nodeInfo.closingCurlyToken, this.messages.sameLineIsClose, sourceFile, nodeInfo.tokenAfterClosingCurly);
        }
    }
    /**
     * 获取左花括号前的token
     */
    findTokenBeforeOpeningCurly(openingCurly, sourceFile) {
        // 获取父节点的所有子节点
        const siblings = openingCurly.parent.getChildren(sourceFile);
        // 找到左花括号的位置
        let curlyIndex = siblings.findIndex(node => node === openingCurly);
        if (!curlyIndex) {
            // 获取父节点的父节点的所有子节点
            const parentSiblings = openingCurly.parent.parent?.getChildren(sourceFile);
            if (parentSiblings) {
                // 在父层级中查找包含左花括号的节点
                curlyIndex = parentSiblings.findIndex(node => node.getChildren(sourceFile).some(child => child === openingCurly));
                if (curlyIndex > 0) {
                    return parentSiblings[curlyIndex - 1];
                }
                ;
            }
            ;
            return openingCurly;
        }
        ;
        // 返回左花括号前的节点
        return siblings[curlyIndex - 1];
    }
    ;
    // 遍历节点，找到右花括号前的token
    traverseNodeForClosingCurly(node, state) {
        if (node === state.closingCurly) {
            return;
        }
        const lastToken = node.getLastToken(state.sourceFile);
        if (!lastToken && (arkanalyzer_1.ts.isCaseClause(node) || arkanalyzer_1.ts.isDefaultClause(node))) {
            const colonToken = node.getChildren(state.sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.ColonToken);
            if (colonToken &&
                colonToken.end < state.closingCurly.getStart() &&
                (!state.prevToken || colonToken.end > state.prevToken.end)) {
                state.prevToken = colonToken;
                return;
            }
        }
        const tokens = node.getChildren(state.sourceFile);
        for (const child of tokens) {
            if (child === state.closingCurly) {
                continue;
            }
            if (child.end < state.closingCurly.getStart() &&
                (!state.prevToken || child.end >= state.prevToken.end - 1)) {
                state.prevToken = child;
                // 处理 块中有且只有 ; 的情况
                state.prevToken = this.handleSpecialNode(node, state.prevToken);
            }
        }
        // 递归遍历子节点
        arkanalyzer_1.ts.forEachChild(node, child => this.traverseNodeForClosingCurly(child, state));
    }
    // 优化后的 findTokenBeforeClosingCurly 方法
    findTokenBeforeClosingCurly(closingCurly, sourceFile) {
        const startNode = closingCurly.parent;
        if (!startNode) {
            return null;
        }
        const state = {
            prevToken: null,
            closingCurly,
            sourceFile
        };
        this.traverseNodeForClosingCurly(startNode, state);
        return state.prevToken;
    }
    /**
     * 处理特殊节点
     * @param node 当前节点
     * @param prevToken 前一个token
     * @param child 遍历到的token节点
     * @returns
     */
    handleSpecialNode(node, prevToken) {
        if (arkanalyzer_1.ts.isBlock(node) && node.statements.length === 1 &&
            node.statements[0].kind === arkanalyzer_1.ts.SyntaxKind.EmptyStatement &&
            node.statements[0].getText() === ';') {
            return node.statements[0];
        }
        ;
        return prevToken;
    }
    /**
     * 获取左花括号后的token
     */
    findTokenAfterOpeningCurly(openingCurly, sourceFile) {
        const parent = openingCurly.parent;
        if (!parent) {
            return null;
        }
        // 直接遍历父节点的子节点，避免使用 findIndex
        const children = parent.getChildren(sourceFile);
        for (let i = 0; i < children.length; i++) {
            if (children[i] === openingCurly) {
                // 如果找到左花括号且不是最后一个节点
                if (i < children.length - 1) {
                    // 获取下一个节点的第一个有效token
                    const nextNode = children[i + 1];
                    return nextNode?.getFirstToken(sourceFile) || null;
                }
                break;
            }
        }
        return null;
    }
    ;
    // 获取父级if语句
    getParentIfStatement(node) {
        let current = node.parent;
        while (current) {
            if (arkanalyzer_1.ts.isIfStatement(current)) {
                return current;
            }
            ;
            current = current.parent;
        }
        ;
        return null;
    }
    ;
    handleIfStatement(ifStmt, closingCurlyParent, sourceFile) {
        // 如果当前块是if的then块
        if (ifStmt.thenStatement && closingCurlyParent === ifStmt.thenStatement) {
            // 检查是否有else或else if
            if (ifStmt.elseStatement) {
                // 查找else关键字
                const elseToken = ifStmt.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.ElseKeyword);
                return elseToken || null;
            }
            ;
        }
        // 如果当前块是else if的then块
        else if (ifStmt.elseStatement && arkanalyzer_1.ts.isIfStatement(ifStmt.elseStatement) &&
            closingCurlyParent === ifStmt.elseStatement.thenStatement) {
            // 检查后续是否还有else或else if
            if (ifStmt.elseStatement.elseStatement) {
                const elseToken = ifStmt.elseStatement.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.ElseKeyword);
                return elseToken || null;
            }
            ;
        }
        ;
        return null;
    }
    ;
    getParentTryStatement(node) {
        let current = node.parent;
        while (current) {
            if (arkanalyzer_1.ts.isTryStatement(current)) {
                return current;
            }
            ;
            current = current.parent;
        }
        ;
        return null;
    }
    ;
    handleTryStatement(tryStmt, closingCurlyParent, sourceFile) {
        // 如果当前块是try块
        if (closingCurlyParent === tryStmt.tryBlock) {
            if (tryStmt.catchClause) {
                const token = tryStmt.catchClause.getFirstToken(sourceFile);
                return token || null;
            }
            else if (tryStmt.finallyBlock) {
                const finallyToken = tryStmt.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.FinallyKeyword);
                return finallyToken || null;
            }
            ;
        }
        // 如果当前块是catch块
        else if (tryStmt.catchClause && closingCurlyParent === tryStmt.catchClause.block) {
            if (tryStmt.finallyBlock) {
                const finallyToken = tryStmt.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.FinallyKeyword);
                return finallyToken || null;
            }
            ;
        }
        ;
        return null;
    }
    ;
    /**
     * 获取右花括号后的token
     */
    findTokenAfterClosingCurly(closingCurly, sourceFile) {
        // 缓存父节点，避免重复访问
        const parent = closingCurly.parent;
        if (!parent) {
            return null;
        }
        // 优先处理常见情况，避免不必要的复杂逻辑调用
        const siblings = parent.getChildren(sourceFile);
        const curlyIndex = siblings.findIndex(node => node === closingCurly);
        if (curlyIndex < siblings.length - 1) {
            return siblings[curlyIndex + 1];
        }
        // 特殊情况处理，减少不必要的递归调用
        const parentIfStmt = this.getParentIfStatement(closingCurly);
        if (parentIfStmt) {
            const nextNode = this.handleIfStatement(parentIfStmt, parent, sourceFile);
            if (nextNode) {
                return nextNode;
            }
        }
        const parentTryStmt = this.getParentTryStatement(closingCurly);
        if (parentTryStmt) {
            const nextNode = this.handleTryStatement(parentTryStmt, parent, sourceFile);
            if (nextNode) {
                return nextNode;
            }
        }
        return null;
    }
    ;
    handleNextLineOpen(pos, end, braceStyle, baseIndent, sourceFile) {
        if (braceStyle === BraceStyle.TBS1 || braceStyle === BraceStyle.STROUSTRUP) {
            const prevTokenEnd = sourceFile.text.lastIndexOf('\n', pos);
            // 左花括号应该和控制语句在同一行
            // 需要删除从上一行末尾到当前花括号位置的所有内容（包括换行和空白）
            return {
                range: [prevTokenEnd, end],
                text: ' {'
            };
        }
        ;
        return {
            range: [pos, end],
            // 对于类声明，保持与类名对齐
            text: baseIndent + '{'
        };
    }
    ;
    handleNextLineClose(pos, end, braceStyle, baseIndent, afterToken) {
        if (braceStyle === BraceStyle.TBS1 && afterToken && this.nodeKindIsSpecialBlock(afterToken)) {
            return { range: [end, afterToken.getStart()], text: ' ' };
        }
        ;
        return {
            range: [pos, end],
            text: '\n' + baseIndent + '}'
        };
    }
    ;
    handleSameLineOpen(pos, end, braceStyle) {
        if (braceStyle === BraceStyle.TBS1 || braceStyle === BraceStyle.STROUSTRUP) {
            return { range: [pos, end], text: ' {' };
        }
        ;
        return { range: [pos, pos], text: '\n' };
    }
    ;
    handleSingleLineClose(pos, end, braceStyle, afterToken) {
        // 处理块内容与右花括号在同一行的情况
        if (braceStyle === BraceStyle.STROUSTRUP && afterToken && this.nodeKindIsSpecialBlock(afterToken)) {
            return {
                range: [pos, pos],
                text: '\n'
            };
        }
        ;
        return { range: [pos, end], text: '\n' + '}' };
    }
    ;
    handleSameLineClose(pos, end, braceStyle, baseIndent, newLineIndent, afterToken) {
        // 处理右花括号与后续语句在同一行的情况
        if (braceStyle === BraceStyle.STROUSTRUP && afterToken && this.nodeKindIsSpecialBlock(afterToken)) {
            return {
                range: [end, end],
                text: '\n' + baseIndent
            };
        }
        ;
        return {
            range: [pos, end],
            text: baseIndent + '}\n' + newLineIndent
        };
    }
    ;
    handleBlockSameLine(pos, end, braceStyle) {
        // 处理左花括号与语句在同一行的情况
        if (braceStyle === BraceStyle.ALLMAN) {
            return { range: [pos, pos], text: '\n' };
        }
        ;
        return {
            range: [end, end],
            text: '\n'
        };
    }
    ;
    ruleFix(pos, end, message, sourceFile, tokenNode, afterToken) {
        const braceStyle = this.defaultOptions[0];
        // 基础缩进
        const baseIndent = '';
        // 换行后的缩进
        const newLineIndent = '  ';
        switch (message) {
            case this.messages.nextLineIsOpen:
                return this.handleNextLineOpen(pos, end, braceStyle, baseIndent, sourceFile);
            case this.messages.nextLineIsClose:
                return this.handleNextLineClose(pos, end, braceStyle, baseIndent, afterToken);
            case this.messages.sameLineIsOpen:
                return this.handleSameLineOpen(pos, end, braceStyle);
            case this.messages.singleLineIsClose:
                return this.handleSingleLineClose(pos, end, braceStyle, afterToken);
            case this.messages.sameLineIsClose:
                return this.handleSameLineClose(pos, end, braceStyle, baseIndent, newLineIndent, afterToken);
            case this.messages.blockIsSameLine:
                return this.handleBlockSameLine(pos, end, braceStyle);
            default:
                return { range: [-1, -1], text: '' };
        }
        ;
    }
    ;
    addBraceStyleIssue(tokenNode, message, sourceFile, afterToken) {
        let pos = tokenNode.getStart();
        let end = tokenNode.getEnd();
        const position = sourceFile.getLineAndCharacterOfPosition(pos);
        const startCol = position.character + 1;
        let defect = this.addIssueReport({
            line: position.line + 1,
            startCol: startCol,
            endCol: startCol,
            message,
        });
        let fix = this.ruleFix(pos, end, message, sourceFile, tokenNode, afterToken);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    addIssueReport(warnInfo) {
        this.metaData.description = warnInfo.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        // 创建缺陷报告
        let defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, true);
        return defect;
    }
    ;
}
exports.BraceStyleCheck = BraceStyleCheck;
