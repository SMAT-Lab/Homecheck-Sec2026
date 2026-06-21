"use strict";
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
exports.PreferStringStartsEndsWithCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferStringStartsRndsWith');
class PreferStringStartsEndsWithCheck {
    rule;
    defects = [];
    issues = [];
    filePath;
    fileSourceFile;
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/prefer-string-starts-ends-with.md',
        description: "Use 'String#startsWith' method instead.",
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    stmts = [];
    processedLocations = new Set();
    astCache = new Map();
    methodNameCache = new Map();
    stringContextCache = new Map();
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (target) => {
        this.initializeCheckContext(target);
        const [validStmts, record] = this.collectValidStatements(target);
        this.processValidStatements(validStmts, record);
    };
    initializeCheckContext(target) {
        if (target instanceof lib_1.ArkFile) {
            this.filePath = target.getFilePath();
            this.fileSourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        }
        this.processedLocations.clear();
        this.astCache.clear();
        this.methodNameCache.clear();
        this.stringContextCache.clear();
    }
    collectValidStatements(target) {
        const record = new Map();
        const validStmts = new Set();
        target.getClasses().flatMap(clazz => clazz.getMethods().flatMap(method => method?.getBody()?.getCfg().getStmts() ?? [])).filter(stmt => {
            if (stmt === undefined) {
                return false;
            }
            this.stmts.push(stmt);
            const originText = stmt.getOriginalText() ?? '';
            return this.shouldCheckStatement(originText);
        }).forEach(stmt => {
            const position = stmt.getOriginPositionInfo();
            const key = `${position.getLineNo()}:${position.getColNo()}`;
            if (!record.has(key)) {
                validStmts.add(stmt);
                record.set(key, stmt.getOriginalText() ?? '');
            }
        });
        return [validStmts, record];
    }
    processValidStatements(validStmts, record) {
        validStmts.forEach(stmt => {
            const position = stmt.getOriginPositionInfo();
            const originText = record.get(`${position.getLineNo()}:${position.getColNo()}`);
            originText && this.PreferStringStartsEndsWithCheck(originText, stmt);
        });
    }
    shouldCheckStatement(text) {
        const keywords = [
            'charAt', 'indexOf', 'lastIndexOf', 'slice',
            'substring', 'match', 'test', 'startsWith',
            'endsWith', '[0]', 'length - 1'
        ];
        return keywords.some(keyword => text.includes(keyword));
    }
    getMethodName(expression) {
        if (this.methodNameCache.has(expression)) {
            return this.methodNameCache.get(expression);
        }
        let result;
        if (expression.kind === lib_1.ts.SyntaxKind.PropertyAccessExpression) {
            const propertyAccess = expression;
            result = propertyAccess.name.getText();
        }
        else if (expression.kind === lib_1.ts.SyntaxKind.ElementAccessExpression) {
            const elementAccess = expression;
            const argument = elementAccess.argumentExpression;
            if (argument.kind === lib_1.ts.SyntaxKind.NumericLiteral) {
                result = argument.text;
            }
        }
        this.methodNameCache.set(expression, result);
        return result;
    }
    isStringContext(node, stmt, methodName) {
        if (!node) {
            return false;
        }
        const cacheKey = `${node.getText()}_${methodName}_${stmt.getOriginalText()}`;
        if (this.stringContextCache.has(cacheKey)) {
            return this.stringContextCache.get(cacheKey);
        }
        let isString = false;
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
                if (rightOp.getBase().getType().getTypeString() === ('string'))
                    isString = true;
            }
        }
        if (methodName === 'charAt' || methodName === 'indexOf' || methodName === 'lastIndexOf' ||
            methodName === 'slice' || methodName === 'substring' || methodName === 'match') {
            let retuenValue = this.getObjectExpressionType(stmt);
            isString = retuenValue === ('string') || this.isAllQuotedSegments(retuenValue);
        }
        if (stmt.getOriginalText()?.startsWith('this')) {
            if (stmt instanceof lib_1.ArkAssignStmt) {
                let leftOp = stmt.getLeftOp().getType().getTypeString();
                if (leftOp === ('string') || this.isAllQuotedSegments(leftOp)) {
                    isString = true;
                }
            }
        }
        this.stringContextCache.set(cacheKey, isString);
        return isString;
    }
    isAllQuotedSegments(input) {
        return input.split('|')
            .map(s => s.trim())
            .every(segment => {
            return (segment.startsWith('"') && segment.endsWith('"')) ||
                (segment.startsWith("'") && segment.endsWith("'"));
        });
    }
    getObjectExpressionType(stmt) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let leftOp = stmt.getLeftOp();
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof lib_1.ArkInstanceInvokeExpr) {
                let invokeExpr = rightOp.getBase();
                if (invokeExpr instanceof lib_1.Local) {
                    let type = invokeExpr.getType().getTypeString();
                    return type;
                }
            }
            else {
                return this.getType(leftOp);
            }
        }
        return 'unknown';
    }
    getType(stmt, count = 0) {
        if (count > 10 || !(stmt instanceof lib_1.Local)) {
            return 'unknown';
        }
        count++;
        const used = stmt.getUsedStmts()[0];
        if (!(used instanceof lib_1.ArkAssignStmt)) {
            return 'unknown';
        }
        // 处理右操作数中的调用表达式
        const rightOpType = this.checkRightOp(used.getRightOp());
        if (rightOpType !== 'unknown') {
            return rightOpType;
        }
        // 递归处理左操作数
        return this.getType(used.getLeftOp(), count);
    }
    checkRightOp(rightOp) {
        if (!(rightOp instanceof lib_1.ArkInstanceInvokeExpr)) {
            return 'unknown';
        }
        const base = rightOp.getBase();
        return base instanceof lib_1.Local ?
            base.getType().getTypeString() :
            'unknown';
    }
    checkLeftOp(leftOp) {
        return this.getType(leftOp);
    }
    PreferStringStartsEndsWithCheck(string, stmt) {
        if (!string || string.length === 0) {
            return [];
        }
        const sourceFile = this.getOrCreateAstSourceFile(string);
        const results = [];
        const visitedNodes = new Set();
        const visit = (node) => {
            if (visitedNodes.has(node)) {
                return;
            }
            visitedNodes.add(node);
            if (lib_1.ts.isCallExpression(node)) {
                this.processCallExpression(node, stmt);
            }
            if (lib_1.ts.isBinaryExpression(node)) {
                this.processBinaryExpression(node, stmt, sourceFile);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(sourceFile, visit);
        return results;
    }
    getOrCreateAstSourceFile(string) {
        const cacheKey = string;
        let sourceFile;
        if (this.astCache.has(cacheKey)) {
            sourceFile = this.astCache.get(cacheKey);
        }
        else {
            sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('', string);
            this.astCache.set(cacheKey, sourceFile);
            if (this.astCache.size > 1000) {
                const firstKey = Array.from(this.astCache.keys())[0];
                if (firstKey) {
                    this.astCache.delete(firstKey);
                }
            }
        }
        return sourceFile;
    }
    processCallExpression(node, stmt) {
        const expression = node.expression;
        if (this.isStartsWithOrEndsWithCall(expression)) {
            const object = this.getObjectExpression(expression);
            if (this.isStringContext(object, stmt, '')) {
                return;
            }
        }
        const methodName = this.getMethodName(expression);
        if (methodName === 'test') {
            this.processTestMethod(node, stmt);
        }
    }
    processTestMethod(node, stmt) {
        const expression = node.expression;
        const args = node.arguments;
        if (args.length === 0) {
            return;
        }
        const testCallObject = args[0].getText();
        if (!lib_1.ts.isPropertyAccessExpression(expression)) {
            return;
        }
        const propertyAccess = expression;
        if (lib_1.ts.isRegularExpressionLiteral(propertyAccess.expression)) {
            this.processRegexLiteral(node, propertyAccess.expression, stmt, testCallObject);
        }
        else if (lib_1.ts.isIdentifier(propertyAccess.expression)) {
            this.processRegexVariable(node, propertyAccess.expression, stmt, testCallObject);
        }
    }
    processRegexLiteral(node, regexLiteral, stmt, testCallObject) {
        const regexText = regexLiteral.getText().slice(1, -1);
        const isSimplePattern = this.isSimpleStartsWithOrEndsWithPattern(regexText);
        if (isSimplePattern.isStartsWith) {
            const expectedStr = regexText
                .replace(/^\^/, '')
                .replace(/\\\//g, '/')
                .replace(/\\/g, '');
            this.addResult(node, true, 'test', stmt, testCallObject, expectedStr);
        }
        else if (isSimplePattern.isEndsWith) {
            const expectedStr = regexText
                .replace(/\$$/, '')
                .replace(/\\\//g, '/')
                .replace(/\\/g, '');
            this.addResult(node, false, 'test', stmt, testCallObject, expectedStr);
        }
    }
    isSimpleStartsWithOrEndsWithPattern(pattern) {
        const isStartsWith = pattern.startsWith('^') &&
            !pattern.includes('$') &&
            !this.containsComplexRegexSyntax(pattern.slice(1));
        const isEndsWith = pattern.endsWith('$') &&
            !pattern.includes('^') &&
            !this.containsComplexRegexSyntax(pattern.slice(0, -1));
        return { isStartsWith, isEndsWith };
    }
    containsComplexRegexSyntax(pattern) {
        // 检查是否包含任何正则表达式特殊语法
        return /[\\[\]|()*+?{}.]/.test(pattern);
    }
    processRegexVariable(node, regexVar, stmt, testCallObject) {
        let currentBlock = regexVar.parent;
        while (currentBlock && !lib_1.ts.isBlock(currentBlock) && !lib_1.ts.isSourceFile(currentBlock)) {
            currentBlock = currentBlock.parent;
        }
        const resolved = this.resolveVariableInitializer(regexVar.text, currentBlock);
        if (resolved.value) {
            const regexText = resolved.value
                .replace(/^\/|\/$/g, '')
                .replace(/\\\//g, '/');
            const isSimplePattern = this.isSimpleStartsWithOrEndsWithPattern(regexText);
            if (isSimplePattern.isStartsWith) {
                const expectedStr = regexText
                    .replace(/^\^/, '')
                    .replace(/\\\//g, '/')
                    .replace(/\\/g, '');
                this.addResult(node, true, 'test', stmt, testCallObject, expectedStr);
            }
            else if (isSimplePattern.isEndsWith) {
                const expectedStr = regexText
                    .replace(/\$$/, '')
                    .replace(/\\\//g, '/')
                    .replace(/\\/g, '');
                this.addResult(node, false, 'test', stmt, testCallObject, expectedStr);
            }
        }
    }
    processBinaryExpression(node, stmt, sourceFile) {
        const left = node.left;
        const right = node.right;
        this.processElementAccessExpression(node, left, right, stmt);
        if (lib_1.ts.isCallExpression(left)) {
            this.processCallExpressionInBinary(node, left, right, stmt, sourceFile);
        }
    }
    processElementAccessExpression(node, left, right, stmt) {
        const validOperators = [
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
        ];
        if (validOperators.includes(node.operatorToken.kind) && lib_1.ts.isElementAccessExpression(left)) {
            const elementAccess = left;
            const object = this.getObjectExpression(elementAccess);
            const indexArgument = elementAccess.argumentExpression;
            if (lib_1.ts.isNumericLiteral(indexArgument) && indexArgument.text === '0') {
                if (this.isStringContext(object, stmt, 'noName')) {
                    this.addResult(node, true, 'noName', stmt, object?.getText(), right.getText());
                }
            }
            else if (lib_1.ts.isBinaryExpression(indexArgument)) {
                this.processLengthMinusOneExpression(node, indexArgument, object, stmt, right);
            }
        }
    }
    processLengthMinusOneExpression(node, indexExpr, object, stmt, right) {
        if (indexExpr.operatorToken.kind === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isPropertyAccessExpression(indexExpr.left) &&
            indexExpr.left.name.text === 'length' &&
            lib_1.ts.isIdentifier(indexExpr.left.expression) &&
            indexExpr.left.expression.text === object?.getText() &&
            lib_1.ts.isNumericLiteral(indexExpr.right) &&
            indexExpr.right.text === '1') {
            if (this.isStringContext(object, stmt, 'noName')) {
                this.addResult(node, false, 'noName', stmt, object?.getText(), right.getText());
            }
        }
    }
    processCallExpressionInBinary(node, left, right, stmt, sourceFile) {
        const callExpression = left;
        if (callExpression.arguments.length < 1) {
            return;
        }
        const expression = callExpression.expression;
        const objExpression = this.getObjectExpression(expression);
        const methodName = this.getMethodName(expression);
        switch (methodName) {
            case 'charAt':
                this.processCharAtMethod(node, callExpression, objExpression, right, stmt, sourceFile);
                break;
            case 'indexOf':
                this.processIndexOfMethod(node, callExpression, objExpression, stmt);
                break;
            case 'lastIndexOf':
                this.processLastIndexOfMethod(node, callExpression, objExpression, stmt);
                break;
            case 'slice':
                this.processSliceMethod(node, callExpression, objExpression, right, stmt);
                break;
            case 'substring':
                this.processSubstringMethod(node, callExpression, objExpression, right, stmt);
                break;
            case 'match':
                this.processMatchMethod(node, callExpression, objExpression, stmt);
                break;
        }
    }
    processCharAtMethod(node, callExpression, objExpression, right, stmt, sourceFile) {
        if (!this.isStringContext(objExpression, stmt, 'charAt')) {
            return;
        }
        const isComparison = [
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
        ].includes(node.operatorToken.kind);
        const indexArgument = callExpression.arguments[0];
        if (isComparison && indexArgument && lib_1.ts.isNumericLiteral(indexArgument) && indexArgument.text === '0') {
            this.addResult(node, true, 'charAt', stmt, objExpression?.getText(), right.getText());
        }
        else if (isComparison && indexArgument && this.isLastCharacterCheck(callExpression.expression, indexArgument, sourceFile)) {
            this.addResult(node, false, 'charAt', stmt, objExpression?.getText(), right.getText());
        }
    }
    processIndexOfMethod(node, callExpr, objExpression, stmt) {
        if (!objExpression || !this.isStringContext(objExpression, stmt, 'indexOf')) {
            return;
        }
        let artString = callExpr.arguments[0].getText();
        const parent = callExpr.parent;
        if (parent && lib_1.ts.isBinaryExpression(parent)) {
            const operatorToken = parent.operatorToken.kind;
            const validOperators = [
                lib_1.ts.SyntaxKind.EqualsEqualsToken,
                lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
                lib_1.ts.SyntaxKind.ExclamationEqualsToken,
                lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
            ];
            const isZero = lib_1.ts.isNumericLiteral(parent.right) && parent.right.text === '0';
            if (validOperators.includes(operatorToken) && isZero) {
                this.addResult(node, true, 'indexOf', stmt, objExpression?.getText(), artString);
            }
        }
    }
    processLastIndexOfMethod(node, callExpr, objExpression, stmt) {
        if (!objExpression || !this.isStringContext(objExpression, stmt, 'lastIndexOf')) {
            return;
        }
        let artString = callExpr.arguments[0].getText();
        const parent = callExpr.parent;
        if (!parent || !lib_1.ts.isBinaryExpression(parent)) {
            return;
        }
        const operatorToken = parent.operatorToken.kind;
        const validOperators = [
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
        ];
        const searchStr = callExpr.arguments[0];
        if (!searchStr) {
            return;
        }
        const { targetLength, textEExpectedStr } = this.getStringInfo(searchStr);
        if (targetLength === undefined || !textEExpectedStr) {
            return;
        }
        const isLengthComparison = lib_1.ts.isBinaryExpression(parent.right) &&
            parent.right.operatorToken.kind === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isPropertyAccessExpression(parent.right.left) &&
            parent.right.left.name.text === 'length' &&
            this.getExpressionValue(parent.right.right) === targetLength;
        if (validOperators.includes(operatorToken) && isLengthComparison) {
            this.addResult(node, false, 'lastIndexOf', stmt, objExpression?.getText(), artString);
        }
    }
    // 新增辅助方法
    getExpressionValue(node) {
        // 处理数字字面量
        if (lib_1.ts.isNumericLiteral(node)) {
            return parseInt(node.text);
        }
        // 处理字符串字面量的.length
        if (lib_1.ts.isPropertyAccessExpression(node) &&
            node.name.text === 'length') {
            // 处理 "bar".length 的情况
            if (lib_1.ts.isStringLiteral(node.expression)) {
                return node.expression.text.length;
            }
            // 处理变量.length 的情况（需要解析变量值）
            if (lib_1.ts.isIdentifier(node.expression)) {
                const resolved = this.resolveVariableInitializer(node.expression.text, node);
                if (resolved.value && typeof resolved.value === 'string') {
                    return resolved.value.length;
                }
            }
        }
        return undefined;
    }
    getStringInfo(searchStr) {
        if (lib_1.ts.isStringLiteral(searchStr)) {
            return {
                targetLength: searchStr.text.length,
                textEExpectedStr: `"${searchStr.text}"`
            };
        }
        else if (lib_1.ts.isIdentifier(searchStr)) {
            let currentBlock = searchStr.parent;
            while (currentBlock && !lib_1.ts.isBlock(currentBlock) && !lib_1.ts.isSourceFile(currentBlock)) {
                currentBlock = currentBlock.parent;
            }
            const resolved = this.resolveVariableInitializer(searchStr.text, currentBlock);
            if (resolved.value !== undefined) {
                return {
                    targetLength: resolved.value.length,
                    textEExpectedStr: searchStr.text
                };
            }
        }
        return { targetLength: undefined, textEExpectedStr: undefined };
    }
    processSliceMethod(node, callExpr, objExpression, rightExpression, stmt) {
        if (!objExpression || !this.isStringContext(objExpression, stmt, 'slice')) {
            return;
        }
        const args = callExpr.arguments;
        const parent = callExpr.parent;
        if (!lib_1.ts.isBinaryExpression(parent)) {
            return;
        }
        const operatorToken = parent.operatorToken.kind;
        const validOperators = [
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
        ];
        if (!validOperators.includes(operatorToken)) {
            return;
        }
        const { targetValue, targetExpression } = this.getTargetValueAndExpression(rightExpression);
        // 修改条件判断，允许targetValue为undefined但targetExpression存在的情况
        if (!targetExpression) {
            return;
        }
        // 添加对动态标识符的特殊处理
        const shouldProcess = targetValue ? true :
            (lib_1.ts.isIdentifier(rightExpression) &&
                callExpr.arguments.length >= 2 &&
                lib_1.ts.isPropertyAccessExpression(callExpr.arguments[1]) &&
                callExpr.arguments[1].expression.getText() === targetExpression);
        if (!shouldProcess) {
            return;
        }
        this.processSliceArguments(node, args, targetValue, targetExpression, objExpression, stmt);
    }
    getTargetValueAndExpression(rightExpression) {
        if (lib_1.ts.isStringLiteral(rightExpression)) {
            return {
                targetExpression: `"${rightExpression.text}"`,
                targetValue: rightExpression.text
            };
        }
        else if (lib_1.ts.isNoSubstitutionTemplateLiteral(rightExpression)) {
            return {
                targetExpression: `\`${rightExpression.text}\``,
                targetValue: rightExpression.text
            };
        }
        else if (lib_1.ts.isIdentifier(rightExpression)) {
            let currentBlock = rightExpression.parent;
            while (currentBlock && !lib_1.ts.isBlock(currentBlock) && !lib_1.ts.isSourceFile(currentBlock)) {
                currentBlock = currentBlock.parent;
            }
            const resolved = this.resolveVariableInitializer(rightExpression.text, currentBlock);
            if (resolved.value !== undefined) {
                return {
                    targetExpression: rightExpression.text,
                    targetValue: resolved.value
                };
            }
        }
        return { targetValue: undefined, targetExpression: undefined };
    }
    processSliceArguments(node, args, targetValue, targetExpression, objExpression, stmt) {
        if (targetValue !== undefined) {
            this.handleTargetValueDefined(node, args, targetValue, targetExpression, objExpression, stmt);
        }
        else {
            this.handleTargetValueUndefined(node, args, targetExpression, objExpression, stmt);
        }
    }
    handleTargetValueDefined(node, args, targetValue, targetExpression, objExpression, stmt) {
        if (this.isValidSliceStartAndLength(args, targetValue)) {
            this.addResult(node, true, 'slice', stmt, objExpression?.getText(), targetExpression);
        }
        if (this.isValidNegativeSliceLength(args, targetValue)) {
            this.addResult(node, false, 'slice', stmt, objExpression?.getText(), targetExpression);
        }
    }
    isValidSliceStartAndLength(args, targetValue) {
        return args.length >= 2 &&
            lib_1.ts.isNumericLiteral(args[0]) &&
            args[0].text === '0' &&
            lib_1.ts.isNumericLiteral(args[1]) &&
            parseInt(args[1].text) === targetValue.length;
    }
    isValidNegativeSliceLength(args, targetValue) {
        return args.length === 1 &&
            lib_1.ts.isPrefixUnaryExpression(args[0]) &&
            args[0].operator === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isNumericLiteral(args[0].operand) &&
            parseInt(args[0].operand.text) === targetValue.length;
    }
    handleTargetValueUndefined(node, args, targetExpression, objExpression, stmt) {
        if (this.isValidSliceStartAndLengthProperty(args, targetExpression)) {
            this.addResult(node, true, 'slice', stmt, objExpression?.getText(), targetExpression);
        }
    }
    isValidSliceStartAndLengthProperty(args, targetExpression) {
        return args.length >= 2 &&
            lib_1.ts.isNumericLiteral(args[0]) &&
            args[0].text === '0' &&
            lib_1.ts.isPropertyAccessExpression(args[1]) &&
            args[1].name.text === 'length' &&
            lib_1.ts.isIdentifier(args[1].expression) &&
            args[1].expression.text === targetExpression;
    }
    processSubstringMethod(node, callExpr, objExpression, rightExpression, stmt) {
        if (!objExpression || !this.isStringContext(objExpression, stmt, 'substring')) {
            return;
        }
        const args = callExpr.arguments;
        const parent = callExpr.parent;
        if (!lib_1.ts.isBinaryExpression(parent)) {
            return;
        }
        const operatorToken = parent.operatorToken.kind;
        const validOperators = [
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken
        ];
        if (!validOperators.includes(operatorToken)) {
            return;
        }
        const { targetValue, targetExpression } = this.getTargetValueAndExpression(rightExpression);
        if (!targetValue || !targetExpression) {
            return;
        }
        this.processSubstringArguments(node, args, targetValue, targetExpression, objExpression, stmt);
    }
    processSubstringArguments(node, args, targetValue, targetExpression, objExpression, stmt) {
        if (this.isValidStartAndLength(args, targetValue)) {
            this.addResult(node, true, 'substring', stmt, objExpression?.getText(), targetExpression);
        }
        if (this.isValidNegativeLengthBinary(args, targetValue, objExpression)) {
            this.addResult(node, false, 'substring', stmt, objExpression?.getText(), targetExpression);
        }
        if (this.isValidNegativeLengthUnary(args, targetValue)) {
            this.addResult(node, false, 'substring', stmt, objExpression?.getText(), targetExpression);
        }
    }
    isValidStartAndLength(args, targetValue) {
        return args.length >= 2 &&
            lib_1.ts.isNumericLiteral(args[0]) &&
            args[0].text === '0' &&
            lib_1.ts.isNumericLiteral(args[1]) &&
            parseInt(args[1].text) === targetValue.length;
    }
    isValidNegativeLengthBinary(args, targetValue, objExpression) {
        return args.length === 1 &&
            lib_1.ts.isBinaryExpression(args[0]) &&
            args[0].operatorToken.kind === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isPropertyAccessExpression(args[0].left) &&
            args[0].left.name.text === 'length' &&
            lib_1.ts.isIdentifier(args[0].left.expression) &&
            args[0].left.expression.text === objExpression.getText() &&
            lib_1.ts.isNumericLiteral(args[0].right) &&
            parseInt(args[0].right.text) === targetValue.length;
    }
    isValidNegativeLengthUnary(args, targetValue) {
        return args.length === 1 &&
            lib_1.ts.isPrefixUnaryExpression(args[0]) &&
            args[0].operator === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isNumericLiteral(args[0].operand) &&
            parseInt(args[0].operand.text) === targetValue.length;
    }
    processMatchMethod(node, callExpr, objExpression, stmt) {
        const methodExpr = callExpr.expression;
        if (!lib_1.ts.isPropertyAccessExpression(methodExpr)) {
            return;
        }
        if (callExpr.arguments.length === 0) {
            return;
        }
        if (!objExpression || !this.isStringContext(objExpression, stmt, 'match')) {
            return;
        }
        const [regexArg] = callExpr.arguments;
        const regexText = this.getRegexText(regexArg);
        if (!regexText) {
            return;
        }
        this.processMatchRegex(node, callExpr, regexText, objExpression, stmt);
    }
    getRegexText(regexArg) {
        if (lib_1.ts.isIdentifier(regexArg)) {
            let currentBlock = regexArg.parent;
            while (currentBlock && !lib_1.ts.isBlock(currentBlock) && !lib_1.ts.isSourceFile(currentBlock)) {
                currentBlock = currentBlock.parent;
            }
            const resolved = this.resolveVariableInitializer(regexArg.text, currentBlock);
            if (resolved.value) {
                return resolved.value;
            }
        }
        else if (lib_1.ts.isRegularExpressionLiteral(regexArg)) {
            return regexArg.getText();
        }
        return undefined;
    }
    processMatchRegex(node, callExpr, regexText, objExpression, stmt) {
        const isRegexLiteral = regexText.startsWith('/') && regexText.endsWith('/');
        const pattern = isRegexLiteral ?
            regexText.slice(1, -1).replace(/\\\//g, '/') :
            regexText;
        const parent = callExpr.parent;
        if (!lib_1.ts.isBinaryExpression(parent)) {
            return;
        }
        // 扩展null/undefined比较检测
        const isNullComparison = [
            lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken,
            lib_1.ts.SyntaxKind.EqualsEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsToken,
            lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken
        ].includes(parent.operatorToken.kind) && (parent.right.kind === lib_1.ts.SyntaxKind.NullKeyword ||
            (lib_1.ts.isIdentifier(parent.right) && parent.right.text === 'undefined'));
        if (isNullComparison) {
            const isStartsWithPattern = pattern.startsWith('^') &&
                !pattern.includes('$') &&
                !this.containsComplexRegexSyntax(pattern.slice(1));
            const isEndsWithPattern = pattern.endsWith('$') &&
                !pattern.includes('^') &&
                !this.containsComplexRegexSyntax(pattern.slice(0, -1));
            if (isStartsWithPattern) {
                const expectedStr = pattern.substring(1).replace(/\\/g, '');
                this.addResult(node, true, 'match', stmt, objExpression.getText(), expectedStr);
            }
            else if (isEndsWithPattern) {
                const expectedStr = pattern.slice(0, -1).replace(/\\/g, '');
                this.addResult(node, false, 'match', stmt, objExpression.getText(), expectedStr);
            }
        }
    }
    isStartsWithOrEndsWithCall(expression) {
        const methodName = this.getMethodName(expression);
        return methodName === 'startsWith' || methodName === 'endsWith';
    }
    getObjectExpression(expression) {
        if (lib_1.ts.isPropertyAccessExpression(expression)) {
            const propertyAccess = expression;
            return propertyAccess.expression;
        }
        else if (lib_1.ts.isElementAccessExpression(expression)) {
            const elementAccess = expression;
            return elementAccess.expression;
        }
        else if (lib_1.ts.isCallExpression(expression)) {
            return this.getObjectExpression(expression.expression);
        }
        return undefined;
    }
    resolveVariableInitializer(varName, block, depth = 0) {
        if (depth > 8) {
            return {};
        }
        const declaration = this.findVariableDeclarationInBlock(varName, block);
        if (declaration === undefined) {
            let rightStmtValue = this.getRightStmt(varName);
            let leftStmtValue = this.getArkName(varName);
            if (rightStmtValue !== undefined) {
                return rightStmtValue;
            }
            if (leftStmtValue !== undefined) {
                return leftStmtValue;
            }
        }
        if (!declaration?.initializer) {
            return {};
        }
        const initializer = declaration.initializer;
        if (lib_1.ts.isStringLiteral(initializer)) {
            return { value: initializer.text };
        }
        else if (lib_1.ts.isNoSubstitutionTemplateLiteral(initializer)) {
            return { value: initializer.text };
        } // 新增正则表达式字面量处理
        else if (lib_1.ts.isRegularExpressionLiteral(initializer)) {
            return { value: initializer.getText() };
        }
        else if (lib_1.ts.isIdentifier(initializer)) {
            return this.resolveVariableInitializer(initializer.text, block, depth + 1);
        }
        return {};
    }
    getRightStmt(varName) {
        for (const stmt of this.stmts) {
            if (!(stmt instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            const leftOp = stmt.getLeftOp();
            if (!(leftOp instanceof lib_1.Local && leftOp.getName() === varName)) {
                continue;
            }
            const decl = leftOp.getDeclaringStmt();
            if (!(decl instanceof lib_1.ArkAssignStmt)) {
                continue;
            }
            const rightOp = decl.getRightOp();
            if (rightOp instanceof lib_1.Constant) {
                return { value: rightOp.getValue() };
            }
        }
        return undefined;
    }
    getArkName(varName) {
        let returnValue = undefined;
        this.stmts.forEach(stmt => {
            if (stmt instanceof lib_1.ArkAssignStmt) {
                stmt?.getCfg()?.getDeclaringMethod()?.getBody()?.getLocals()?.forEach(local => {
                    if (local?.getName() === varName) {
                        // 修改后的代码片段
                        returnValue = this.checkLeftOpUsage(stmt.getLeftOp());
                    }
                });
            }
        });
        return returnValue;
    }
    // 新增方法
    checkLeftOpUsage(leftOp) {
        if (!(leftOp instanceof lib_1.Local)) {
            return undefined;
        }
        for (const item of leftOp.getUsedStmts()) {
            if (!(item instanceof lib_1.ArkInvokeStmt)) {
                continue;
            }
            const invokeExpr = item.getInvokeExpr();
            if (!(invokeExpr instanceof lib_1.ArkInstanceInvokeExpr)) {
                continue;
            }
            const [firstArg] = invokeExpr.getArgs();
            if (firstArg instanceof Constant_1.StringConstant) {
                return { value: firstArg.getValue() };
            }
        }
        return undefined;
    }
    findVariableDeclarationInBlock(varName, block) {
        let result;
        const visit = (node) => {
            if (lib_1.ts.isVariableStatement(node)) {
                node.declarationList.declarations.forEach(decl => {
                    if (lib_1.ts.isIdentifier(decl.name) && decl.name.text === varName) {
                        result = decl;
                    }
                });
            }
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(block, visit);
        return result;
    }
    isLastCharacterCheck(expression, indexArg, sourceFile) {
        if (!lib_1.ts.isPropertyAccessExpression(expression))
            return false;
        if (lib_1.ts.isBinaryExpression(indexArg) &&
            lib_1.ts.isPropertyAccessExpression(indexArg.left) &&
            lib_1.ts.isIdentifier(indexArg.left.expression) &&
            indexArg.left.name.text === 'length' &&
            indexArg.operatorToken.kind === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isNumericLiteral(indexArg.right) &&
            indexArg.right.text === '1') {
            return true;
        }
        return false;
    }
    ruleFix(sourceFile, loc) {
        const startPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol - 1);
        const endPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.endCol - 1);
        return this.handleTestFix(loc, startPosition, endPosition) ||
            this.handleNoNameFix(loc, startPosition, endPosition) ||
            this.handleCharAtFix(loc, startPosition, endPosition) ||
            this.handleMatchFix(loc, startPosition, endPosition) ||
            this.handleSliceFix(loc, startPosition, endPosition) ||
            this.handleSubstringFix(loc, startPosition, endPosition) ||
            this.handleIndexOfFix(loc, startPosition, endPosition) ||
            { range: [0, 0], text: "" };
    }
    handleTestFix(loc, start, end) {
        if (loc.methodName !== 'test') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        const quote = loc.isStartWith ? '"' : '"';
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${quote}${loc.textEExpectedStr}${quote})`
        };
    }
    handleNoNameFix(loc, start, end) {
        if (loc.methodName !== 'noName') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${loc.textEExpectedStr})`
        };
    }
    handleCharAtFix(loc, start, end) {
        if (loc.methodName !== 'charAt') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${loc.textEExpectedStr})`
        };
    }
    handleMatchFix(loc, start, end) {
        if (loc.methodName !== 'match') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        const quote = loc.isStartWith ? '"' : '"';
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${quote}${loc.textEExpectedStr}${quote})`
        };
    }
    handleSliceFix(loc, start, end) {
        if (loc.methodName !== 'slice') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        let textEExpectedStr = '';
        if (loc.textEExpectedStr) {
            textEExpectedStr = this.changeDoubleQuotesToSingleQuotes(loc.textEExpectedStr);
        }
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${textEExpectedStr})`
        };
    }
    changeDoubleQuotesToSingleQuotes(str) {
        if (str.startsWith('"') && str.endsWith('"')) {
            return `'${str.slice(1, -1)}'`;
        }
        return str;
    }
    handleSubstringFix(loc, start, end) {
        if (loc.methodName !== 'substring') {
            return null;
        }
        const method = loc.isStartWith ? 'startsWith' : 'endsWith';
        let textEExpectedStr = '';
        if (loc.textEExpectedStr) {
            textEExpectedStr = this.changeDoubleQuotesToSingleQuotes(loc.textEExpectedStr);
        }
        return {
            range: [start, end],
            text: `${loc.testObjectText}.${method}(${textEExpectedStr})`
        };
    }
    handleIndexOfFix(loc, start, end) {
        let fixText = '';
        if (loc.methodName === 'indexOf') {
            fixText = `${loc.testObjectText}.startsWith(${loc.textEExpectedStr})`;
        }
        else if (loc.methodName === 'lastIndexOf') {
            fixText = `${loc.testObjectText}.endsWith(${loc.textEExpectedStr})`;
        }
        return {
            range: [start, end],
            text: fixText
        };
    }
    addIssueReportNodeFix(loc) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let message = '';
        if (loc.isStartWith) {
            message = `Use 'String#startsWith' method instead.`;
        }
        else {
            message = `Use the 'String#endsWith' method instead.`;
        }
        const defect = new Defects_1.Defects(loc.line, loc.character, loc.endCol, message, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(this.fileSourceFile, loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndCharacterInfo(node, stmt) {
        let checkText = node.getText();
        const text = stmt.getOriginalText();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!arkFile || !text || text.length === 0) {
            return { line: -1, character: 0, startCol: -1, endCol: -1 };
        }
        let lineCount = -1;
        let startColum = -1;
        let originalPosition = stmt.getOriginPositionInfo();
        const sparse = originalPosition.getColNo();
        const originalTexts = text.split('\n');
        for (let originalText of originalTexts) {
            lineCount++;
            if (originalText.includes(checkText)) {
                if (lineCount === 0) {
                    startColum = originalText.indexOf(checkText) + sparse;
                }
                else {
                    startColum = originalText.indexOf(checkText) + 1;
                }
                break;
            }
        }
        if (startColum === -1) {
            return { line: -1, character: 0, startCol: -1, endCol: -1 };
        }
        let lineNo = originalPosition.getLineNo() + lineCount;
        const startCol = startColum;
        const endCol = startColum + checkText.length;
        const filePath = arkFile.getFilePath();
        return { line: lineNo, character: startCol, startCol: startCol, endCol: endCol };
    }
    createLocationInfo(node, isStartWith, methodName, stmt, testObjectText, textEExpectedStr) {
        const { line, character, startCol, endCol } = this.getLineAndCharacterInfo(node, stmt);
        return {
            line,
            character,
            startCol,
            endCol,
            isStartWith,
            methodName,
            testObjectText,
            textEExpectedStr
        };
    }
    addResult(node, isStartWith, methodName, stmt, testObjectText, textEExpectedStr) {
        const loc = stmt.getOriginPositionInfo();
        const locationKey = `${loc.getLineNo()}:${loc.getColNo()}`;
        if (this.processedLocations.has(locationKey)) {
            return;
        }
        this.processedLocations.add(locationKey);
        const locationInfo = this.createLocationInfo(node, isStartWith, methodName, stmt, testObjectText, textEExpectedStr);
        this.addIssueReportNodeFix(locationInfo);
    }
}
exports.PreferStringStartsEndsWithCheck = PreferStringStartsEndsWithCheck;
