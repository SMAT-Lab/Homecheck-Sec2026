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
exports.NoUselessBackreferenceCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUselessBackreferenceCheck');
class NoUselessBackreferenceCheck {
    cache = CacheManager.getInstance();
    messageId = 'nested';
    backReferenceInfo = {
        backReference: '',
        groupContent: '',
    };
    get messages() {
        return {
            nested: `Backreference '${this.backReferenceInfo.backReference}' will be ignored. It references group '(${this.backReferenceInfo.groupContent})' from within that group`,
            forward: `Backreference '${this.backReferenceInfo.backReference}' will be ignored. It references group '(${this.backReferenceInfo.groupContent})' which appears later in the pattern`,
            backward: `Backreference '${this.backReferenceInfo.backReference}' will be ignored. It references group '(${this.backReferenceInfo.groupContent})' which appears before in the same lookbehind`,
            disjunctive: `Backreference '${this.backReferenceInfo.backReference}' will be ignored. It references group '(${this.backReferenceInfo.groupContent})' which is in another alternative`,
            intoNegativeLookaround: `Backreference '${this.backReferenceInfo.backReference}' will be ignored. It references group '(${this.backReferenceInfo.groupContent})' which is in a negative lookaround`,
        };
    }
    ;
    rule;
    defects = [];
    issues = [];
    filePath = '';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-useless-backreference.md',
        description: 'Disallow useless backreferences in regular expressions.',
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
    /**
     *
     * 在 JavaScript 中，使用斜杠 / 定义正则表达式时，反向引用直接用 \n 表示；
     * 使用 RegExp 构造函数时，由于字符串中的反斜杠需要转义，所以要写成 \\n。
     * 在替换字符串中，使用 $n 来引用捕获组。
     */
    check = (target) => {
        try {
            this.filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 遍历 AST
            this.visitNode(sourceFile, sourceFile);
        }
        catch (error) {
            logger.error(`Error occurred while checking file: ${target.getFilePath()}, Error: ${error}`);
        }
        finally {
            // 检查完成后清理缓存
            this.cache.clear('regex');
        }
        ;
    };
    visitNode(node, sourceFile) {
        // 检查正则字面量
        if (arkanalyzer_1.ts.isRegularExpressionLiteral(node)) {
            this.analyzeRegexPattern(node.text, node, sourceFile);
            return;
        }
        ;
        // 统一处理 RegExp 构造函数调用和 new 表达式
        if ((arkanalyzer_1.ts.isNewExpression(node) || arkanalyzer_1.ts.isCallExpression(node)) && node.arguments && node.arguments?.length > 0) {
            // 首先检查是否是全局 RegExp
            if (this.isGlobalRegExp(node.expression)) {
                // 获取第一个参数
                const pattern = this.extractRegExpPattern(node.arguments[0]);
                if (pattern) {
                    this.analyzeRegexPattern(pattern, node, sourceFile);
                }
                ;
            }
            ;
        }
        ;
        // 递归遍历子节点
        arkanalyzer_1.ts.forEachChild(node, child => this.visitNode(child, sourceFile));
    }
    ;
    /**
 * 检查是否为全局 RegExp 对象
 */
    isGlobalRegExp(expression) {
        if (!arkanalyzer_1.ts.isIdentifier(expression)) {
            return false;
        }
        ;
        if (expression.text !== 'RegExp') {
            return this.checkRegExpAlias(expression);
        }
        ;
        return this.validateGlobalRegExp(expression);
    }
    ;
    /**
     * 验证是否为全局 RegExp
     */
    validateGlobalRegExp(expression) {
        let current = expression;
        let foundBlock = false;
        while (current) {
            if (this.isBlockScope(current)) {
                foundBlock = true;
                if (this.hasLocalRegExpDeclaration(current)) {
                    return false;
                }
                ;
            }
            ;
            if (this.isFunctionScope(current)) {
                if (this.hasRegExpParameter(current)) {
                    return false;
                }
                ;
            }
            ;
            current = current.parent;
        }
        ;
        return foundBlock;
    }
    ;
    /**
     * 检查是否为块级作用域
     */
    isBlockScope(node) {
        return arkanalyzer_1.ts.isBlock(node) || arkanalyzer_1.ts.isSourceFile(node);
    }
    ;
    /**
     * 检查是否为函数作用域
     */
    isFunctionScope(node) {
        return arkanalyzer_1.ts.isFunctionDeclaration(node) ||
            arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isArrowFunction(node);
    }
    ;
    /**
     * 检查块级作用域中是否有局部 RegExp 声明
     */
    hasLocalRegExpDeclaration(node) {
        return this.checkStatements(node.statements);
    }
    ;
    /**
     * 检查语句列表中是否包含 RegExp 声明
     */
    checkStatements(statements) {
        return statements.some(stmt => {
            if (!arkanalyzer_1.ts.isVariableStatement(stmt)) {
                return false;
            }
            ;
            return this.checkVariableDeclarations(stmt.declarationList.declarations);
        });
    }
    ;
    /**
     * 检查变量声明列表中是否包含 RegExp 声明
     */
    checkVariableDeclarations(declarations) {
        return declarations.some(decl => arkanalyzer_1.ts.isIdentifier(decl.name) &&
            decl.name.text === 'RegExp');
    }
    ;
    /**
     * 检查函数参数中是否包含 RegExp
     */
    hasRegExpParameter(node) {
        return node.parameters.some(param => arkanalyzer_1.ts.isIdentifier(param.name) &&
            param.name.text === 'RegExp');
    }
    ;
    /**
     * 检查 RegExp 别名
     */
    checkRegExpAlias(expression) {
        const sourceFile = expression.getSourceFile();
        let currentNode = expression;
        while (currentNode) {
            if (arkanalyzer_1.ts.isSourceFile(currentNode)) {
                return this.checkGlobalAliasDeclaration(sourceFile, expression.text);
            }
            ;
            currentNode = currentNode.parent;
        }
        ;
        return false;
    }
    ;
    /**
     * 检查全局作用域中的别名声明
     */
    checkGlobalAliasDeclaration(sourceFile, aliasName) {
        for (const statement of sourceFile.statements) {
            if (!arkanalyzer_1.ts.isVariableStatement(statement)) {
                continue;
            }
            ;
            const aliasDeclaration = this.findAliasDeclaration(statement.declarationList.declarations, aliasName);
            if (aliasDeclaration && this.isRegExpAliasInitializer(aliasDeclaration)) {
                return this.isGlobalRegExp(aliasDeclaration.initializer);
            }
            ;
        }
        ;
        return false;
    }
    ;
    /**
     * 查找别名声明
     */
    findAliasDeclaration(declarations, aliasName) {
        return declarations.find(decl => arkanalyzer_1.ts.isIdentifier(decl.name) &&
            decl.name.text === aliasName &&
            decl.initializer &&
            arkanalyzer_1.ts.isIdentifier(decl.initializer));
    }
    ;
    /**
     * 检查初始化器是否为 RegExp
     */
    isRegExpAliasInitializer(declaration) {
        if (!declaration.initializer) {
            return false;
        }
        ;
        return arkanalyzer_1.ts.isIdentifier(declaration.initializer) &&
            declaration.initializer.text === 'RegExp';
    }
    ;
    extractRegExpPattern(arg) {
        // 直接的字符串字面量
        if (arkanalyzer_1.ts.isStringLiteral(arg)) {
            return arg.text;
        }
        ;
        // 字符串拼接
        if (arkanalyzer_1.ts.isBinaryExpression(arg) && arg.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusToken) {
            return this.evaluateStringConcatenation(arg);
        }
        ;
        return null;
    }
    ;
    /**
     * 获取标识符的值
     * @param node 标识符节点
     * @returns 标识符的字符串值，如果无法确定则返回 null
     */
    getIdentifierValue(node) {
        try {
            const symbol = node.getText();
            const sourceFile = node.getSourceFile();
            return this.findIdentifierValueInSourceFile(sourceFile, symbol);
        }
        catch (error) {
            logger.debug(`Error getting identifier value: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
        ;
    }
    ;
    /**
     * 在源文件中查找标识符的值
     */
    findIdentifierValueInSourceFile(sourceFile, symbol) {
        const declaration = this.findVariableDeclaration(sourceFile, symbol);
        if (!declaration) {
            return null;
        }
        ;
        return this.extractDeclarationValue(declaration);
    }
    ;
    /**
     * 查找变量声明
     */
    findVariableDeclaration(sourceFile, symbol) {
        let result = null;
        const visitNode = (node) => {
            if (this.isTargetVariableDeclaration(node, symbol)) {
                result = node;
                return;
            }
            ;
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitNode);
        return result;
    }
    ;
    /**
     * 检查是否为目标变量声明
     */
    isTargetVariableDeclaration(node, symbol) {
        if (!arkanalyzer_1.ts.isVariableDeclaration(node)) {
            return false;
        }
        ;
        return arkanalyzer_1.ts.isIdentifier(node.name) &&
            node.name.text === symbol &&
            node.initializer !== undefined;
    }
    ;
    /**
     * 从声明中提取值
     */
    extractDeclarationValue(declaration) {
        const initializer = declaration.initializer;
        if (!initializer) {
            return null;
        }
        ;
        if (arkanalyzer_1.ts.isStringLiteral(initializer)) {
            return initializer.text;
        }
        ;
        if (arkanalyzer_1.ts.isTemplateExpression(initializer)) {
            return this.evaluateTemplateExpression(initializer);
        }
        ;
        if (arkanalyzer_1.ts.isBinaryExpression(initializer)) {
            return this.evaluateStringConcatenation(initializer);
        }
        ;
        return null;
    }
    ;
    /**
     * 评估模板表达式
     */
    evaluateTemplateExpression(template) {
        try {
            let result = template.head.text;
            for (const span of template.templateSpans) {
                const spanValue = this.evaluateTemplateSpan(span);
                if (spanValue === null) {
                    return null;
                }
                ;
                result += spanValue + span.literal.text;
            }
            ;
            return result;
        }
        catch (error) {
            logger.debug(`Error evaluating template expression: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
        ;
    }
    ;
    /**
     * 评估模板表达式片段
     */
    evaluateTemplateSpan(span) {
        const expression = span.expression;
        if (arkanalyzer_1.ts.isStringLiteral(expression)) {
            return expression.text;
        }
        ;
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            return this.getIdentifierValue(expression);
        }
        ;
        if (arkanalyzer_1.ts.isBinaryExpression(expression)) {
            return this.evaluateStringConcatenation(expression);
        }
        ;
        return null;
    }
    ;
    /**
     * 处理字符串拼接表达式
     */
    evaluateStringConcatenation(node) {
        try {
            if (node.operatorToken.kind !== arkanalyzer_1.ts.SyntaxKind.PlusToken) {
                return null;
            }
            ;
            const leftValue = this.evaluateStringOperand(node.left);
            const rightValue = this.evaluateStringOperand(node.right);
            if (leftValue === null || rightValue === null) {
                return null;
            }
            ;
            return leftValue + rightValue;
        }
        catch (error) {
            logger.debug(`Error evaluating string concatenation: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
        ;
    }
    ;
    /**
     * 评估字符串操作数
     */
    evaluateStringOperand(node) {
        if (arkanalyzer_1.ts.isStringLiteral(node)) {
            return node.text;
        }
        ;
        if (arkanalyzer_1.ts.isIdentifier(node)) {
            return this.getIdentifierValue(node);
        }
        ;
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            return this.evaluateStringConcatenation(node);
        }
        ;
        if (arkanalyzer_1.ts.isTemplateExpression(node)) {
            return this.evaluateTemplateExpression(node);
        }
        ;
        return null;
    }
    ;
    // 查找正则表达式中的所有捕获组  使用缓存优化的方法
    findCaptureGroups(pattern) {
        const cacheKey = `captureGroups:${pattern}`;
        const cached = this.cache.get('regex', cacheKey);
        if (cached) {
            return cached;
        }
        ;
        const groups = this.computeCaptureGroups(pattern);
        this.cache.set('regex', cacheKey, groups);
        return groups;
    }
    ;
    computeCaptureGroups(pattern) {
        const groups = [];
        let groupNumber = 1;
        const stack = [];
        for (let i = 0; i < pattern.length; i++) {
            if (this.isOpenParenthesis(pattern, i)) {
                const groupMatch = this.processOpenParenthesis(pattern, i);
                if (groupMatch) {
                    stack.push(groupMatch.startIndex);
                    i = groupMatch.skipTo;
                }
                ;
                continue;
            }
            ;
            if (this.isCloseParenthesis(pattern, i)) {
                const group = this.processCloseParenthesis(pattern, i, stack, groupNumber);
                if (group) {
                    groups.push(group);
                    groupNumber++;
                }
                ;
            }
            ;
        }
        ;
        return groups;
    }
    ;
    /**
     * 检查是否为开括号
     */
    isOpenParenthesis(pattern, index) {
        return pattern[index] === '(' && !this.isEscaped(pattern, index);
    }
    ;
    /**
     * 检查是否为闭括号
     */
    isCloseParenthesis(pattern, index) {
        return pattern[index] === ')' && !this.isEscaped(pattern, index);
    }
    ;
    /**
     * 处理开括号
     */
    processOpenParenthesis(pattern, index) {
        // 检查是否是命名捕获组
        if (this.isNamedCaptureGroup(pattern, index)) {
            const endNameIndex = pattern.indexOf('>', index + 3);
            if (endNameIndex !== -1) {
                return { startIndex: index, skipTo: endNameIndex };
            }
            ;
        }
        ;
        // 检查是否是非捕获组或环视
        if (this.isNonCapturingOrLookaround(pattern, index)) {
            return null;
        }
        ;
        // 普通捕获组
        return { startIndex: index, skipTo: index };
    }
    ;
    /**
     * 检查是否是命名捕获组
     */
    isNamedCaptureGroup(pattern, index) {
        return index + 2 < pattern.length &&
            pattern[index + 1] === '?' &&
            pattern[index + 2] === '<' &&
            pattern[index + 3] !== '=' &&
            pattern[index + 3] !== '!';
    }
    ;
    /**
     * 检查是否是非捕获组或环视
     */
    isNonCapturingOrLookaround(pattern, index) {
        if (index + 2 >= pattern.length) {
            return false;
        }
        ;
        if (pattern[index + 1] !== '?') {
            return false;
        }
        ;
        const nextChar = pattern[index + 2];
        return [':', '=', '!', '<'].includes(nextChar);
    }
    ;
    /**
     * 处理闭括号
     */
    processCloseParenthesis(pattern, index, stack, groupNumber) {
        if (stack.length === 0) {
            return null;
        }
        ;
        const startIndex = stack.pop();
        const content = this.extractGroupContent(pattern, startIndex, index);
        const fullMatch = pattern.slice(startIndex, index + 1);
        const name = this.extractGroupName(pattern, startIndex);
        return {
            startIndex,
            endIndex: index + 1,
            content,
            fullMatch,
            name,
            number: groupNumber
        };
    }
    ;
    /**
     * 提取组内容
     */
    extractGroupContent(pattern, start, end) {
        return pattern.slice(start + 1, end);
    }
    ;
    /**
     * 提取组名
     */
    extractGroupName(pattern, startIndex) {
        const namedGroupMatch = pattern.slice(startIndex).match(/^\(\?<([^>]+)>/);
        return namedGroupMatch ? namedGroupMatch[1] : undefined;
    }
    ;
    findClosingParenthesis(pattern, start) {
        let count = 1;
        let i = start + 1;
        while (count > 0 && i < pattern.length) {
            if (this.isParenthesis(pattern, pattern[i], '(', i)) {
                count++;
            }
            else if (this.isParenthesis(pattern, pattern[i], ')', i)) {
                count--;
            }
            ;
            i++;
        }
        ;
        return {
            endIndex: i,
            content: pattern.slice(start + 1, i - 1)
        };
    }
    ;
    isParenthesis(pattern, char, type, index) {
        return char === type && !this.isEscaped(pattern, index);
    }
    ;
    findBackReferences(pattern) {
        const cacheKey = `backRefs:${pattern}`;
        const cached = this.cache.get('regex', cacheKey);
        if (cached) {
            return cached;
        }
        ;
        const result = this.computeBackReferences(pattern);
        this.cache.set('regex', cacheKey, result);
        return result;
    }
    ;
    computeBackReferences(pattern) {
        const result = [];
        let inCharClass = false;
        for (let i = 0; i < pattern.length; i++) {
            if (this.shouldSkipCharacter(pattern[i], pattern, i, inCharClass)) {
                continue;
            }
            ;
            if (this.isCharClassBoundary(pattern[i], pattern, i)) {
                inCharClass = !inCharClass;
                continue;
            }
            ;
            if (!inCharClass && pattern[i] === '\\' && !this.isEscaped(pattern, i)) {
                const backRef = this.extractBackReference(pattern, i);
                if (backRef) {
                    result.push(backRef);
                    i += backRef.value.length - 1;
                }
                ;
            }
            ;
        }
        ;
        return result;
    }
    ;
    shouldSkipCharacter(char, pattern, index, inCharClass) {
        return inCharClass || (char === '\\' && this.isEscaped(pattern, index));
    }
    ;
    isCharClassBoundary(char, pattern, index) {
        return (char === '[' || char === ']') && !this.isEscaped(pattern, index);
    }
    ;
    extractBackReference(pattern, index) {
        const next = pattern[index + 1];
        if (next === 'k') {
            const match = pattern.slice(index).match(/^\\k<([^>]+)>/);
            if (match) {
                return {
                    index,
                    value: match[0],
                    isNamed: true
                };
            }
            ;
        }
        else if (/\d/.test(next)) {
            const match = pattern.slice(index).match(/^\\(\d+)/);
            if (match) {
                return {
                    index,
                    value: match[0],
                    isNamed: false
                };
            }
            ;
        }
        ;
        return null;
    }
    ;
    isEscaped(str, index) {
        let count = 0;
        let i = index - 1;
        while (i >= 0 && str[i] === '\\') {
            count++;
            i--;
        }
        ;
        return count % 2 === 1;
    }
    ;
    /**
     * 检查是否为前向引用
     */
    isForwardReference(group, refIndex, pattern) {
        // 1. 检查先行断言中的前向引用
        if (this.isForwardReferenceInLookahead(group, refIndex, pattern)) {
            return true;
        }
        ;
        // 2. 检查非先行断言中的前向引用
        return this.isForwardReferenceOutsideLookahead(group, refIndex, pattern);
    }
    ;
    /**
     * 检查先行断言中的前向引用
     */
    isForwardReferenceInLookahead(group, refIndex, pattern) {
        let currentIndex = 0;
        while (currentIndex < pattern.length) {
            const lookaheadMatch = this.findNextLookahead(pattern, currentIndex);
            if (!lookaheadMatch) {
                break;
            }
            ;
            const { startIndex, endIndex } = lookaheadMatch;
            if (this.isReferenceInLookahead(refIndex, group, startIndex, endIndex)) {
                // 如果在先行断言内且不在后行断言内，则可能是前向引用
                return !this.isInLookbehind(startIndex, pattern);
            }
            ;
            currentIndex = startIndex + 1;
        }
        ;
        return false;
    }
    ;
    /**
     * 查找下一个先行断言
     */
    findNextLookahead(pattern, startFrom) {
        const lookaheadIndex = pattern.indexOf('(?', startFrom);
        if (lookaheadIndex === -1) {
            return null;
        }
        ;
        // 检查是否是先行断言（正向或负向）
        if (pattern[lookaheadIndex + 2] === '=' || pattern[lookaheadIndex + 2] === '!') {
            const { endIndex } = this.findClosingParenthesis(pattern, lookaheadIndex);
            return { startIndex: lookaheadIndex, endIndex };
        }
        ;
        return null;
    }
    ;
    /**
     * 检查引用是否在先行断言范围内
     */
    isReferenceInLookahead(refIndex, group, lookaheadStart, lookaheadEnd) {
        const isRefInLookahead = refIndex > lookaheadStart && refIndex < lookaheadEnd;
        const isGroupInLookahead = group.startIndex > lookaheadStart && group.endIndex < lookaheadEnd;
        if (isRefInLookahead && isGroupInLookahead) {
            // 计算相对位置
            const relativeRefIndex = refIndex - lookaheadStart;
            const relativeGroupStart = group.startIndex - lookaheadStart;
            return relativeRefIndex < relativeGroupStart;
        }
        ;
        return false;
    }
    ;
    /**
     * 检查非先行断言中的前向引用
     */
    isForwardReferenceOutsideLookahead(group, refIndex, pattern) {
        // 如果引用在组之前，且不在后行断言内
        if (refIndex < group.startIndex && !this.isInAnyLookbehind(refIndex, pattern)) {
            // 检查是否在非捕获组中
            const nonCapturingGroupStart = this.findEnclosingNonCapturingGroup(refIndex, pattern);
            if (nonCapturingGroupStart !== -1) {
                // 如果组也在同一个非捕获组内，使用相对位置判断
                return group.startIndex > nonCapturingGroupStart;
            }
            ;
            // 不在非捕获组内，使用全局位置判断
            return true;
        }
        ;
        return false;
    }
    ;
    /**
     * 查找包含指定位置的非捕获组
     */
    findEnclosingNonCapturingGroup(index, pattern) {
        let currentIndex = 0;
        while (currentIndex < index) {
            const groupIndex = pattern.indexOf('(?:', currentIndex);
            if (groupIndex === -1 || groupIndex > index)
                break;
            const { endIndex } = this.findClosingParenthesis(pattern, groupIndex);
            if (index > groupIndex && index < endIndex) {
                return groupIndex;
            }
            ;
            currentIndex = groupIndex + 1;
        }
        ;
        return -1;
    }
    ;
    isInLookbehind(index, pattern) {
        let currentIndex = 0;
        while (currentIndex < index) {
            const lookbehindIndex = pattern.indexOf('(?<', currentIndex);
            if (lookbehindIndex === -1 || lookbehindIndex > index)
                break;
            if (pattern[lookbehindIndex + 3] === '=' || pattern[lookbehindIndex + 3] === '!') {
                const { endIndex } = this.findClosingParenthesis(pattern, lookbehindIndex);
                if (index > lookbehindIndex && index < endIndex) {
                    return true;
                }
                ;
            }
            ;
            currentIndex = lookbehindIndex + 1;
        }
        ;
        return false;
    }
    ;
    isInAnyLookbehind(index, pattern) {
        return this.isInLookbehind(index, pattern);
    }
    ;
    /**
 * 检查是否为后行断言中的后向引用
 */
    isBackwardReferenceInLookbehind(group, refIndex, pattern) {
        const lookbehinds = this.findAllLookbehinds(pattern);
        for (const lookbehind of lookbehinds) {
            if (this.isInvalidBackwardReference(group, refIndex, lookbehind, pattern)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    /**
     * 查找所有后行断言
     */
    findAllLookbehinds(pattern) {
        const lookbehinds = [];
        const matches = Array.from(pattern.matchAll(/\(\?<[=!]/g));
        for (const match of matches) {
            const startIndex = match.index;
            const { endIndex } = this.findClosingParenthesis(pattern, startIndex);
            lookbehinds.push({ startIndex, endIndex });
        }
        ;
        return lookbehinds;
    }
    ;
    /**
     * 检查是否为无效的后向引用
     */
    isInvalidBackwardReference(group, refIndex, lookbehind, pattern) {
        const { startIndex: lookbehindStart, endIndex: lookbehindEnd } = lookbehind;
        // 如果引用不在当前后行断言内，跳过
        if (!this.isPositionInRange(refIndex, lookbehindStart, lookbehindEnd)) {
            return false;
        }
        ;
        // 检查组和引用的位置关系
        return this.checkGroupReferenceRelation(group, refIndex, lookbehindStart, lookbehindEnd, pattern);
    }
    ;
    /**
     * 检查组和引用的位置关系
     */
    checkGroupReferenceRelation(group, refIndex, lookbehindStart, lookbehindEnd, pattern) {
        // 情况1：组和引用都在同一个后行断言内
        if (this.isGroupInRange(group, { start: lookbehindStart, end: lookbehindEnd })) {
            return this.isInvalidReferenceInSameLookbehind(group, refIndex, lookbehindStart, pattern);
        }
        ;
        // 情况2：组在后行断言外
        return refIndex < group.startIndex;
    }
    ;
    /**
     * 检查同一后行断言内的引用是否无效
     */
    isInvalidReferenceInSameLookbehind(group, refIndex, lookbehindStart, pattern) {
        // 如果引用在组之后且不在同一个先行断言内
        return refIndex > group.startIndex &&
            !this.isInSameLookahead(group, refIndex, pattern.slice(lookbehindStart));
    }
    ;
    // 检查是否在同一个先行断言内
    isInSameLookahead(group, refIndex, pattern) {
        const lookAheads = Array.from(pattern.matchAll(/\(\?=/g));
        for (const lookAhead of lookAheads) {
            const start = lookAhead.index;
            const { endIndex } = this.findClosingParenthesis(pattern, start);
            // 如果组和引用都在这个先行断言内
            if (group.startIndex >= start && group.endIndex <= endIndex &&
                refIndex >= start && refIndex <= endIndex) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    hasRegExpSyntaxError(pattern, flags) {
        try {
            // 尝试创建正则表达式对象
            if (flags) {
                new RegExp(pattern, flags);
            }
            else {
                new RegExp(pattern);
            }
            ;
            return false;
        }
        catch (e) {
            return true;
        }
        ;
    }
    ;
    /**
 * 获取正则表达式的标志位
 */
    getRegExpFlags(node) {
        if (!this.isRegExpNode(node)) {
            return '';
        }
        ;
        const flagsArg = this.getSecondArgument(node);
        if (!flagsArg) {
            return '';
        }
        ;
        return this.extractFlagsFromArgument(flagsArg);
    }
    ;
    /**
     * 检查节点是否为正则表达式节点
     */
    isRegExpNode(node) {
        return arkanalyzer_1.ts.isNewExpression(node) || arkanalyzer_1.ts.isCallExpression(node);
    }
    ;
    /**
     * 获取第二个参数
     */
    getSecondArgument(node) {
        if (!node.arguments || node.arguments.length < 2) {
            return undefined;
        }
        ;
        return node.arguments[1];
    }
    ;
    /**
     * 从参数中提取标志位
     */
    extractFlagsFromArgument(flagsArg) {
        if (arkanalyzer_1.ts.isStringLiteral(flagsArg)) {
            return flagsArg.text;
        }
        ;
        if (arkanalyzer_1.ts.isIdentifier(flagsArg)) {
            return this.getFlagsFromIdentifier(flagsArg);
        }
        ;
        return '';
    }
    ;
    /**
     * 从标识符中获取标志位
     */
    getFlagsFromIdentifier(identifier) {
        const flagsName = identifier.getText();
        // 简单处理一些常见的标志组合
        if (flagsName === 'flags' || flagsName.includes('u')) {
            // 保守处理，假设包含 'u' 标志
            return 'u';
        }
        ;
        return '';
    }
    ;
    analyzeRegexPattern(pattern, node, sourceFile) {
        if (this.hasRegExpSyntaxError(pattern, this.getRegExpFlags(node))) {
            return;
        }
        ;
        const captureGroups = this.findCaptureGroups(pattern);
        const backReferences = this.findBackReferences(pattern);
        for (const backRef of backReferences) {
            const { index, value, isNamed } = backRef;
            const refNumber = isNamed ? -1 : parseInt(value.slice(1));
            const refName = isNamed ? value.slice(3, -1) : '';
            const referencedGroup = this.findReferencedGroup(captureGroups, isNamed, refNumber, refName);
            if (!referencedGroup) {
                continue;
            }
            ;
            this.validateBackReference(referencedGroup, index, value, pattern, node, sourceFile);
        }
        ;
    }
    ;
    findReferencedGroup(captureGroups, isNamed, refNumber, refName) {
        return isNamed
            ? captureGroups.find(g => g.name === refName)
            : captureGroups[refNumber - 1];
    }
    ;
    validateBackReference(group, refIndex, refValue, pattern, node, sourceFile) {
        // 检查是否在组内
        const isInGroup = this.isReferenceInGroup(refIndex, group);
        // 检查循环引用
        if (isInGroup && this.isCircularReference(group, refIndex, pattern)) {
            this.reportViolation(node, sourceFile, group, refValue, 'nested');
            return;
        }
        ;
        // 执行所有其他检查
        this.performReferenceChecks(group, refIndex, refValue, pattern, node, sourceFile);
    }
    ;
    isReferenceInGroup(refIndex, group) {
        return refIndex > group.startIndex && refIndex <= group.endIndex;
    }
    ;
    isCircularReference(group, refIndex, pattern) {
        const subPattern = pattern.slice(group.startIndex, refIndex);
        const groupsBeforeRef = this.findCaptureGroups(subPattern);
        return groupsBeforeRef.length === 0;
    }
    ;
    performReferenceChecks(group, refIndex, refValue, pattern, node, sourceFile) {
        const checks = [
            {
                messageId: 'backward',
                check: (g, i, p) => this.isBackwardReferenceInLookbehind(g, i, p)
            },
            {
                messageId: 'forward',
                check: (g, i, p) => this.isForwardReference(g, i, p)
            },
            {
                messageId: 'disjunctive',
                check: (g, i, p) => this.isInDifferentAlternative(g, i, p) ||
                    this.isInDifferentOther(g, i, p)
            }
        ];
        // 检查负向环视
        if (!this.isInSameLookaround(group, refIndex, pattern) &&
            this.isInNegativeLookaround(group, refIndex, pattern)) {
            this.reportViolation(node, sourceFile, group, refValue, 'intoNegativeLookaround');
            return;
        }
        ;
        // 执行其他检查
        for (const { messageId, check } of checks) {
            if (check(group, refIndex, pattern)) {
                this.reportViolation(node, sourceFile, group, refValue, messageId);
                return;
            }
            ;
        }
        ;
    }
    ;
    reportViolation(node, sourceFile, group, refValue, messageId) {
        this.messageId = messageId;
        this.backReferenceInfo = {
            backReference: refValue,
            groupContent: group.content
        };
        this.reportIssue(node, sourceFile, group, refValue);
    }
    ;
    // 检查位置是否在范围内
    isPositionInRange(position, start, end) {
        return position > start && position < end;
    }
    ;
    // 检查元素是否在环视范围内
    isElementInLookaround(elementStart, elementEnd, lookaroundStart, lookaroundEnd) {
        return elementStart > lookaroundStart && elementEnd < lookaroundEnd;
    }
    ;
    // 计算相对索引 
    calculateRelativeIndex(position, referencePoint) {
        return position - referencePoint;
    }
    ;
    // 检查是否在同一个环视结构内（包括肯定/否定的前/后行断言）
    isInSameLookaround(group, refIndex, pattern) {
        const lookarounds = this.findAllLookarounds(pattern);
        return this.checkLookaroundContainment(group, refIndex, lookarounds) ||
            this.checkNestedLookarounds(group, refIndex, pattern, lookarounds);
    }
    ;
    findAllLookarounds(pattern) {
        const lookarounds = [];
        const lookaroundMatches = Array.from(pattern.matchAll(/\(\?(?:[<])?[=!]/g));
        for (const match of lookaroundMatches) {
            const start = match.index;
            const { endIndex } = this.findClosingParenthesis(pattern, start);
            const matchText = match[0];
            lookarounds.push({
                start,
                end: endIndex,
                type: this.getLookaroundType(matchText),
                isNegative: this.isNegativeLookaround(matchText)
            });
        }
        return lookarounds;
    }
    ;
    // 获取lookaround类型
    getLookaroundType(matchText) {
        return matchText.includes('<') ? 'lookbehind' : 'lookahead';
    }
    ;
    isNegativeLookaround(matchText) {
        return matchText.endsWith('!');
    }
    // 检查捕获组是否在环视范围内
    checkLookaroundContainment(group, refIndex, lookarounds) {
        return lookarounds.some(lookaround => this.areElementsInSameLookaround(group, refIndex, lookaround));
    }
    // 检查元素是否在环视范围内
    areElementsInSameLookaround(group, refIndex, lookaround) {
        const isGroupInLookaround = this.isElementInLookaround(group.startIndex, group.endIndex, lookaround.start, lookaround.end);
        const isRefInLookaround = this.isPositionInRange(refIndex, lookaround.start, lookaround.end);
        return isGroupInLookaround && isRefInLookaround;
    }
    ;
    // 检查嵌套的环视结构
    checkNestedLookarounds(group, refIndex, pattern, parentLookarounds) {
        for (const parent of parentLookarounds) {
            const subPattern = pattern.slice(parent.start, parent.end);
            const nestedResult = this.checkNestedLookaroundPattern(group, refIndex, subPattern, parent.start);
            if (nestedResult) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkNestedLookaroundPattern(group, refIndex, subPattern, parentStart) {
        const nestedLookarounds = this.findAllLookarounds(subPattern);
        for (const nested of nestedLookarounds) {
            // 跳过父级环视本身
            if (nested.start === 0) {
                continue;
            }
            ;
            const adjustedGroup = this.adjustGroupPositionForNested(group, parentStart);
            const adjustedRefIndex = this.calculateRelativeIndex(refIndex, parentStart);
            if (this.areElementsInSameLookaround(adjustedGroup, adjustedRefIndex, nested)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    adjustGroupPositionForNested(group, parentStart) {
        return {
            ...group,
            startIndex: this.calculateRelativeIndex(group.startIndex, parentStart),
            endIndex: this.calculateRelativeIndex(group.endIndex, parentStart)
        };
    }
    ;
    // 检查位置是否在范围内
    isInRange(position, range) {
        return this.isPositionInRange(position, range.start, range.end);
    }
    // 检查捕获组是否在范围内
    isGroupInRange(group, range) {
        return this.isInRange(group.startIndex, range) && this.isInRange(group.endIndex, range);
    }
    ;
    isInDifferentAlternative(group, refIndex, pattern) {
        const { topLevel, nested } = this.collectAlternatives(pattern);
        // 检查顶层分支
        if (this.hasConflictInAlternatives(group, refIndex, topLevel)) {
            return true;
        }
        ;
        // 检查嵌套分支
        return this.hasConflictInNestedAlternatives(pattern, group, refIndex, nested);
    }
    ;
    collectAlternatives(pattern) {
        const topLevel = [];
        const nested = [];
        let depth = 0;
        let alternativeStart = 0;
        for (let i = 0; i < pattern.length; i++) {
            if (this.isParenthesis(pattern, pattern[i], '(', i)) {
                if (depth === 0) {
                    alternativeStart = i + 1;
                }
                ;
                depth++;
            }
            else if (this.isParenthesis(pattern, pattern[i], ')', i)) {
                depth--;
                if (depth === 0) {
                    this.addAlternative(nested, alternativeStart, i);
                }
                ;
            }
            else if (pattern[i] === '|' && !this.isEscaped(pattern, i)) {
                if (depth === 0) {
                    this.addAlternative(topLevel, alternativeStart, i);
                    alternativeStart = i + 1;
                }
                ;
            }
            ;
        }
        ;
        // 添加最后一个分支
        if (alternativeStart < pattern.length) {
            this.addAlternative(depth === 0 ? topLevel : nested, alternativeStart, pattern.length);
        }
        ;
        return { topLevel, nested };
    }
    ;
    addAlternative(alternatives, start, end) {
        if (start < end) {
            alternatives.push({ start, end });
        }
        ;
    }
    ;
    hasConflictInAlternatives(group, refIndex, alternatives) {
        if (alternatives.length <= 1) {
            return false;
        }
        ;
        const groupAlt = alternatives.find(alt => this.isGroupInRange(group, alt));
        const refAlt = alternatives.find(alt => this.isInRange(refIndex, alt));
        return Boolean(groupAlt && refAlt && groupAlt !== refAlt);
    }
    ;
    hasConflictInNestedAlternatives(pattern, group, refIndex, nested) {
        for (const range of nested) {
            const subPattern = pattern.slice(range.start, range.end);
            const subAlternatives = this.collectAlternatives(subPattern).topLevel;
            // 调整相对位置
            const relativeGroup = this.adjustGroupPosition(group, range.start);
            const relativeRefIndex = refIndex - range.start;
            if (this.hasConflictInAlternatives(relativeGroup, relativeRefIndex, subAlternatives)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    adjustGroupPosition(group, offset) {
        return {
            ...group,
            startIndex: group.startIndex - offset,
            endIndex: group.endIndex - offset
        };
    }
    ;
    isInDifferentOther(group, refIndex, pattern) {
        const topLevelAlternatives = this.collectTopLevelAlternatives(pattern);
        return this.checkNestedGroupsAndBranches(group, refIndex, pattern, topLevelAlternatives);
    }
    ;
    collectTopLevelAlternatives(pattern) {
        const alternatives = [];
        let depth = 0;
        let alternativeStart = 0;
        for (let i = 0; i < pattern.length; i++) {
            if (this.isOpeningParenthesis(pattern, i)) {
                depth++;
            }
            else if (this.isClosingParenthesis(pattern, i)) {
                depth--;
            }
            else if (this.isTopLevelAlternative(pattern, i, depth)) {
                alternatives.push({
                    start: alternativeStart,
                    end: i
                });
                alternativeStart = i + 1;
            }
            ;
        }
        ;
        // 添加最后一个分支
        alternatives.push({
            start: alternativeStart,
            end: pattern.length
        });
        return alternatives;
    }
    ;
    checkNestedGroupsAndBranches(group, refIndex, pattern, topLevelAlternatives) {
        const currentGroup = this.analyzeNestedGroups(pattern);
        if (!currentGroup) {
            return false;
        }
        ;
        return this.checkAlternativesForConflicts(currentGroup, group, refIndex);
    }
    ;
    analyzeNestedGroups(pattern) {
        let depth = 0;
        let alternativeStart = -1;
        const currentGroup = {
            start: -1,
            end: -1,
            alternatives: []
        };
        for (let i = 0; i < pattern.length; i++) {
            if (this.isOpeningParenthesis(pattern, i)) {
                if (this.handleOpeningParenthesis(depth, alternativeStart, currentGroup, i)) {
                    alternativeStart = i + 1;
                }
                ;
                depth++;
            }
            else if (this.isClosingParenthesis(pattern, i)) {
                if (this.handleClosingParenthesis(depth, currentGroup, alternativeStart, i)) {
                    return currentGroup;
                }
                ;
                depth--;
            }
            else if (this.isAlternativeBoundary(pattern, i, currentGroup)) {
                this.handleAlternativeBoundary(currentGroup, alternativeStart, i);
                alternativeStart = i + 1;
            }
            ;
        }
        ;
        return null;
    }
    ;
    checkAlternativesForConflicts(currentGroup, group, refIndex) {
        if (currentGroup.alternatives.length === 0) {
            return false;
        }
        ;
        const { refAltIndex, captureAltIndex } = this.findElementLocations(currentGroup.alternatives, group, refIndex);
        return this.hasConflictingLocations(refAltIndex, captureAltIndex);
    }
    ;
    findElementLocations(alternatives, group, refIndex) {
        let refAltIndex = -1;
        let captureAltIndex = -1;
        alternatives.forEach((alt, index) => {
            if (refIndex >= alt.start && refIndex <= alt.end) {
                refAltIndex = index;
            }
            ;
            if (group.startIndex >= alt.start && group.endIndex <= alt.end) {
                captureAltIndex = index;
            }
            ;
        });
        return { refAltIndex, captureAltIndex };
    }
    ;
    isOpeningParenthesis(pattern, index) {
        return pattern[index] === '(' && !this.isEscaped(pattern, index);
    }
    ;
    isClosingParenthesis(pattern, index) {
        return pattern[index] === ')' && !this.isEscaped(pattern, index);
    }
    ;
    isTopLevelAlternative(pattern, index, depth) {
        return pattern[index] === '|' && !this.isEscaped(pattern, index) && depth === 0;
    }
    ;
    isAlternativeBoundary(pattern, index, currentGroup) {
        return pattern[index] === '|' &&
            !this.isEscaped(pattern, index) &&
            currentGroup.start !== -1;
    }
    ;
    handleOpeningParenthesis(depth, alternativeStart, currentGroup, index) {
        if (alternativeStart === -1) {
            currentGroup.start = index;
            return true;
        }
        ;
        return false;
    }
    ;
    handleClosingParenthesis(depth, currentGroup, alternativeStart, index) {
        if (depth === 1) {
            currentGroup.end = index;
            if (alternativeStart !== -1) {
                currentGroup.alternatives.push({
                    start: alternativeStart,
                    end: index
                });
            }
            ;
            return true;
        }
        ;
        return false;
    }
    ;
    handleAlternativeBoundary(currentGroup, alternativeStart, index) {
        currentGroup.alternatives.push({
            start: alternativeStart,
            end: index
        });
    }
    ;
    hasConflictingLocations(refAltIndex, captureAltIndex) {
        return refAltIndex !== -1 &&
            captureAltIndex !== -1 &&
            refAltIndex !== captureAltIndex;
    }
    ;
    isInNegativeLookaround(group, refIndex, pattern) {
        if (this.originalNegativeLookaroundCheck(group, refIndex, pattern)) {
            return true;
        }
        return this.checkNestedNegativeLookarounds(group, refIndex, pattern);
    }
    ;
    checkNestedNegativeLookarounds(group, refIndex, pattern) {
        let currentIndex = 0;
        const maxIndex = Math.max(refIndex, group.startIndex);
        while (currentIndex < maxIndex) {
            const lookAroundInfo = this.findNextLookAround(pattern, currentIndex);
            if (!lookAroundInfo) {
                break;
            }
            ;
            const { start, isNegative, endIndex } = lookAroundInfo;
            if (isNegative && this.isInvalidNegativeLookaround(group, refIndex, start, endIndex)) {
                return true;
            }
            ;
            currentIndex = start + 1;
        }
        ;
        return false;
    }
    ;
    findNextLookAround(pattern, startIndex) {
        const lookAroundStart = pattern.indexOf('(?', startIndex);
        if (lookAroundStart === -1) {
            return null;
        }
        ;
        const isNegativeLookbehind = pattern.slice(lookAroundStart, lookAroundStart + 4) === '(?<!';
        const isNegativeLookahead = pattern.slice(lookAroundStart, lookAroundStart + 3) === '(?!';
        if (!isNegativeLookahead && !isNegativeLookbehind) {
            return null;
        }
        ;
        const { endIndex } = this.findClosingParenthesis(pattern, lookAroundStart);
        return {
            start: lookAroundStart,
            isNegative: true,
            endIndex
        };
    }
    ;
    isInvalidNegativeLookaround(group, refIndex, start, end) {
        const groupInLookaround = group.startIndex > start && group.endIndex < end;
        const refInLookaround = refIndex > start && refIndex < end;
        // 组在负向环视内部，引用在外部
        if (groupInLookaround && refIndex >= end) {
            return true;
        }
        ;
        // 引用在负向环视内部，组在外部或其他负向环视内
        if (refInLookaround && (group.startIndex < start || group.startIndex > end)) {
            return true;
        }
        ;
        return false;
    }
    ;
    originalNegativeLookaroundCheck(group, refIndex, pattern) {
        // 匹配所有的负向环视（包括前瞻和后顾）
        const negativeLookarounds = Array.from(pattern.matchAll(/\(\?[<]?!/g));
        for (const lookaround of negativeLookarounds) {
            const start = lookaround.index;
            const { endIndex } = this.findClosingParenthesis(pattern, start);
            // 情况1：组在负向环视内，引用在外部
            if (group.startIndex > start && group.endIndex < endIndex) {
                // 如果引用在负向环视外部
                if (refIndex >= endIndex) {
                    return true;
                }
                ;
            }
            ;
            // 情况2：引用在负向环视内，但引用了外部的组
            if (refIndex > start && refIndex < endIndex) {
                if (!(group.startIndex > start && group.endIndex < endIndex)) {
                    return true;
                }
                ;
            }
            ;
            // 情况3：检查嵌套的负向环视
            const subPattern = pattern.slice(start, endIndex);
            if (this.hasNestedNegativeLookaround(subPattern, group, refIndex - start)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    hasNestedNegativeLookaround(pattern, group, relativeRefIndex) {
        const nestedNegative = Array.from(pattern.matchAll(/\(\?[<]?!/g));
        for (const nested of nestedNegative) {
            if (nested.index === 0) {
                continue;
            }
            ; // 跳过当前环视本身
            const nestedStart = nested.index;
            const { endIndex: nestedEnd } = this.findClosingParenthesis(pattern, nestedStart);
            // 检查组是否在嵌套的负向环视内
            const relativeGroupStart = group.startIndex - (group.startIndex > nestedStart ? nestedStart : 0);
            const relativeGroupEnd = group.endIndex - (group.endIndex > nestedStart ? nestedStart : 0);
            if (relativeGroupStart > nestedStart && relativeGroupEnd < nestedEnd) {
                // 如果引用在嵌套的负向环视外部
                if (relativeRefIndex < nestedStart || relativeRefIndex >= nestedEnd) {
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    reportIssue(node, sourceFile, group, backRef) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const startCol = character + 1;
        const warnInfo = {
            line: line + 1,
            startCol: startCol,
            endCol: startCol + node.getWidth(),
            message: this.messages[this.messageId],
        };
        // 使用唯一键来避免重复报告
        const defect = this.addIssueReport(warnInfo);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    addIssueReport(warnInfo) {
        this.metaData.description = warnInfo.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, false);
        return defect;
    }
    ;
}
exports.NoUselessBackreferenceCheck = NoUselessBackreferenceCheck;
;
;
;
;
;
;
;
;
;
;
// 缓存管理类
class CacheManager {
    static instance;
    caches;
    MAX_CACHE_SIZE = 1000;
    constructor() {
        this.caches = new Map();
    }
    ;
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    ;
    get(namespace, key) {
        const cache = this.caches.get(namespace);
        return cache?.get(key);
    }
    ;
    set(namespace, key, value) {
        if (!this.caches.has(namespace)) {
            this.caches.set(namespace, new Map());
        }
        const cache = this.caches.get(namespace);
        if (cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            if (firstKey) {
                cache.delete(firstKey);
            }
            ;
        }
        ;
        cache.set(key, value);
    }
    ;
    clear(namespace) {
        if (namespace) {
            this.caches.delete(namespace);
        }
        else {
            this.caches.clear();
        }
        ;
    }
    ;
}
