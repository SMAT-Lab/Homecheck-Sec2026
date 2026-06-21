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
exports.NoExtraParensCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
;
const defaultOptions = [
    'all',
    {
        conditionalAssign: true,
        returnAssign: true,
        nestedBinaryExpressions: true,
        ternaryOperandBinaryExpressions: true,
        ignoreJSX: 'none',
        enforceForArrowConditionals: true,
        enforceForSequenceExpressions: true,
        enforceForNewInMemberExpressions: true,
        enforceForFunctionPrototypeMethods: true,
        allowParensAfterCommentPattern: 'any-string-pattern'
    }
];
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoExtraParensCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: "docs/no-extra-parens.md",
    description: "Unnecessary parentheses around expression."
};
const precedenceMap = {
    [56]: 3,
    [55]: 4,
    [51]: 5,
    [52]: 6,
    [50]: 7,
    [34]: 8,
    [35]: 8,
    [36]: 8,
    [37]: 8,
    [29]: 9,
    [31]: 9,
    [32]: 9,
    [33]: 9,
    [103]: 9,
    [102]: 9,
    [47]: 10,
    [48]: 10,
    [49]: 10,
    [39]: 11,
    [40]: 11,
    [41]: 12,
    [43]: 12,
    [44]: 12,
    [42]: 13, // **
};
const leftAssociative = new Set([
    56,
    55,
    51,
    52,
    50,
    34,
    35,
    36,
    37,
    29,
    31,
    32,
    33,
    103,
    102,
    47,
    48,
    49,
    39,
    40,
    41,
    43,
    44,
]);
// 新增：判断是否为赋值运算符的辅助函数
const assignmentOperators = new Set([
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    70,
    71,
    72,
    73,
    74,
    78
]);
class NoExtraParensCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    sourceFile;
    filePath;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    classMatcher = {
        file: [this.fileMatcher],
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.classMatcher]
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (file) => {
        let options;
        if (this.rule && this.rule.option.length > 0) {
            options = this.rule.option;
        }
        else {
            options = defaultOptions;
        }
        this.sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(file);
        this.filePath = file.getFilePath();
        this.checkUnnecessaryParentheses(this.sourceFile);
    };
    getPrecedence(kind) {
        return precedenceMap[kind] || 0;
    }
    isLeftAssociative(kind) {
        return leftAssociative.has(kind);
    }
    checkUnnecessaryParentheses(sourceFile) {
        this.visit(sourceFile);
    }
    visit(node) {
        if (lib_1.ts.isParenthesizedExpression(node)) {
            const type = this.detectExtraParensType(node, this.sourceFile);
            if (type) {
                const start = node.getStart(this.sourceFile);
                const end = node.getEnd();
                const fixText = node.expression.getText();
                const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
                const diagnostic = {
                    line: line + 1,
                    col: character + 1,
                    type: type,
                };
                this.addIssueReport(diagnostic, start, end, fixText);
            }
        }
        lib_1.ts.forEachChild(node, child => this.visit(child));
    }
    detectExtraParensType(node, sourceFile) {
        if (this.isConditionalAssign(node)) {
            return 'conditionalAssign';
        }
        if (this.isReturnAssign(node)) {
            return 'returnAssign';
        }
        if (this.isNestedBinaryExpressions(node, sourceFile)) {
            return 'nestedBinaryExpressions';
        }
        if (this.isTernaryOperandBinaryExpressions(node)) {
            return 'ternaryOperandBinaryExpressions';
        }
        if (this.isJSXMultiLine(node, sourceFile)) {
            return 'ignoreJSX-multi-line';
        }
        if (this.isJSXSingleLine(node, sourceFile)) {
            return 'ignoreJSX-single-line';
        }
        if (this.isEnforceForArrowConditionals(node)) {
            return 'enforceForArrowConditionals';
        }
        if (this.isEnforceForSequenceExpressions(node)) {
            return 'enforceForSequenceExpressions';
        }
        if (this.isEnforceForNewInMemberExpressions(node)) {
            return 'enforceForNewInMemberExpressions';
        }
        if (this.isEnforceForFunctionPrototypeMethods(node)) {
            return 'enforceForFunctionPrototypeMethods';
        }
        if (this.isAllowParensAfterCommentPattern(node, sourceFile)) {
            return 'allowParensAfterCommentPattern';
        }
        if (this.isRedundantIIFEWrapping(node)) {
            return 'function';
        }
        return undefined;
    }
    isRedundantIIFEWrapping(node) {
        return this.checkDoubleWrappedCall(node) ||
            this.checkTripleWrappedFunction(node);
    }
    // 检测双重包裹的调用表达式 ((...))
    checkDoubleWrappedCall(node) {
        if (!lib_1.ts.isCallExpression(node.parent)) {
            return false;
        }
        const expr = node.expression;
        return lib_1.ts.isCallExpression(expr) &&
            this.isWrappedFunction(expr.expression);
    }
    // 检测三层包裹的函数表达式 (((...)))
    checkTripleWrappedFunction(node) {
        const expr = node.expression;
        const parent = node.parent;
        const parentText = parent.getText();
        const nodeText = node.getText();
        const expressionText = expr.getText();
        const split = parentText.split(nodeText);
        if (this.checkTripleWrappedFunction1(parent, node, parentText, nodeText, expressionText)) {
            return true;
        }
        if (lib_1.ts.isClassExpression(expr) && lib_1.ts.isNewExpression(parent)) {
            return true;
        }
        if (this.checkTripleWrappedFunction2(expr, parent)) {
            return true;
        }
        if (this.checkTripleWrappedFunction3(expr, parent, parentText, nodeText)) {
            return true;
        }
        if (this.checkTripleWrappedFunction4(expr, parent, split)) {
            return true;
        }
        if (this.checkTripleWrappedFunction5(expr, parent, split)) {
            return true;
        }
        if (lib_1.ts.isArrowFunction(expr) && lib_1.ts.isParenthesizedExpression(node) && lib_1.ts.isConditionalExpression(parent)) {
            if (parent.whenTrue === node || parent.whenFalse === node) {
                return true;
            }
            return false;
        }
        if (this.checkTripleWrappedFunction6(expr, node, parent, split)) {
            return true;
        }
        if (this.checkTripleWrappedFunction7(node, parent, expr)) {
            return true;
        }
        if (!lib_1.ts.isParenthesizedExpression(expr)) {
            return false;
        }
        const innerExpr = expr.expression;
        return lib_1.ts.isCallExpression(innerExpr) &&
            this.isWrappedFunction(innerExpr.expression);
    }
    checkTripleWrappedFunction7(node, parent, expr) {
        return lib_1.ts.isParenthesizedExpression(node) && lib_1.ts.isNewExpression(parent) && lib_1.ts.isFunctionExpression(expr);
    }
    checkTripleWrappedFunction6(expr, node, parent, split) {
        return lib_1.ts.isArrowFunction(expr) && lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.isCallExpression(parent) && split[0].trim().endsWith('(') && split[1].trim().startsWith(')');
    }
    checkTripleWrappedFunction5(expr, parent, split) {
        return lib_1.ts.isFunctionExpression(expr) && lib_1.ts.isCallExpression(parent) && split[0].trim().endsWith('(') && split[1].trim().startsWith(')');
    }
    checkTripleWrappedFunction4(expr, parent, split) {
        return lib_1.ts.isFunctionExpression(expr) && lib_1.ts.isElementAccessExpression(parent) &&
            split[0].trim().endsWith('[') && split[1].trim().startsWith(']');
    }
    checkTripleWrappedFunction3(expr, parent, parentText, nodeText) {
        return lib_1.ts.isFunctionExpression(expr) && lib_1.ts.isVariableDeclaration(parent) &&
            parentText.endsWith(nodeText) && parentText.substring(0, parentText.length - nodeText.length).trim().endsWith('=');
    }
    checkTripleWrappedFunction2(expr, parent) {
        return lib_1.ts.isAwaitExpression(expr) && lib_1.ts.isBinaryExpression(parent) && parent.operatorToken.kind === lib_1.ts.SyntaxKind.AmpersandAmpersandToken;
    }
    checkTripleWrappedFunction1(parent, node, parentText, nodeText, expressionText) {
        return lib_1.ts.isExpressionStatement(parent) && lib_1.ts.isParenthesizedExpression(node) &&
            parentText.startsWith(nodeText) && parentText.substring(nodeText.length).trim() === ';' &&
            !expressionText.startsWith('function') && !expressionText.startsWith('{');
    }
    isWrappedFunction(expr) {
        return lib_1.ts.isParenthesizedExpression(expr) &&
            (lib_1.ts.isArrowFunction(expr.expression) ||
                lib_1.ts.isFunctionExpression(expr.expression));
    }
    isAssignmentExpression(node) {
        return lib_1.ts.isBinaryExpression(node) &&
            assignmentOperators.has(node.operatorToken.kind);
    }
    isConditionExpression(node) {
        return lib_1.ts.isConditionalExpression(node) && lib_1.ts.isParenthesizedExpression(node.parent);
    }
    // 修改后的条件判断函数
    isConditionalAssign(node) {
        const parent = node.parent;
        const expression = node.expression;
        const parentText = parent.getText();
        const nodeText = node.getText();
        const expressionText = expression.getText();
        const split = parentText.split(nodeText);
        const isCondition = lib_1.ts.isIfStatement(parent) ||
            lib_1.ts.isWhileStatement(parent) ||
            lib_1.ts.isDoStatement(parent) ||
            (lib_1.ts.isForStatement(parent) && parent.condition === node);
        if (this.isConditionalAssign1(isCondition, expression, node, split)) {
            return true;
        }
        if (this.isConditionalAssign2(parent, expression, split)) {
            return true;
        }
        if (lib_1.ts.isCaseClause(parent) && lib_1.ts.isPropertyAccessExpression(expression)) {
            return true;
        }
        // 替换为新的判断方式
        return isCondition && (this.isAssignmentExpression(node.expression) || this.isConditionExpression(node.expression));
    }
    isConditionalAssign2(parent, expression, split) {
        return (lib_1.ts.isIfStatement(parent) || lib_1.ts.isWhileStatement(parent)) &&
            lib_1.ts.isBinaryExpression(expression) && split[0].trim().endsWith('(') && split[1].trim().startsWith(')');
    }
    isConditionalAssign1(isCondition, expression, node, split) {
        return isCondition && lib_1.ts.isBinaryExpression(expression) &&
            lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.SyntaxKind.QuestionQuestionToken === expression.operatorToken.kind &&
            split[0].trim().endsWith('(') && split[1].trim().startsWith(')');
    }
    isReturnAssign(node) {
        const parent = node.parent;
        return (lib_1.ts.isReturnStatement(parent) || lib_1.ts.isArrowFunction(parent)) &&
            this.isAssignmentExpression(node.expression);
    }
    isNestedBinaryExpressions(node, sourceFile) {
        const parent = node.parent;
        const expression = node.expression;
        const parentText = parent.getText();
        const nodeText = node.getText();
        const split = parentText.split(nodeText);
        const str = parentText.substring(nodeText.length).trim();
        if (this.isNestedBinaryExpressions1(parent, expression, split) ||
            this.isNestedBinaryExpressions2(expression, parent) ||
            this.isNestedBinaryExpressions3(node, expression, parent, parentText, nodeText) ||
            this.isNestedBinaryExpressions4(parent, node, expression, parentText, nodeText) ||
            this.isNestedBinaryExpressions5(parent, node, expression, parentText, nodeText) ||
            this.isNestedBinaryExpressions6(parent, node, expression) ||
            (lib_1.ts.isBinaryExpression(expression) &&
                this.isNestedBinaryExpressions12(expression, node, parent) &&
                (this.isNestedBinaryExpressions9(parentText, nodeText, expression) || this.isNestedBinaryExpressions10(parentText, nodeText, expression)))) {
            return true;
        }
        if (this.isNestedBinaryExpressions7(expression, node, parent)) {
            return !(this.isNestedBinaryExpressions8(parentText, nodeText) || (lib_1.ts.isNumericLiteral(expression) && lib_1.ts.isPropertyAccessExpression(parent)));
        }
        if (this.isNestedBinaryExpressions11(expression, node, parent, parentText, nodeText, str)) {
            return false;
        }
        if (!lib_1.ts.isBinaryExpression(parent)) {
            return false;
        }
        if (!lib_1.ts.isBinaryExpression(expression)) {
            return false;
        }
        const parentPrecedence = this.getPrecedence(parent.operatorToken.kind);
        const innerPrecedence = this.getPrecedence(expression.operatorToken.kind);
        if (innerPrecedence > parentPrecedence) {
            return true;
        }
        if (innerPrecedence === parentPrecedence && this.isLeftAssociative(parent.operatorToken.kind) && parent.left === node) {
            return true;
        }
        return false;
    }
    isNestedBinaryExpressions12(expression, node, parent) {
        return lib_1.ts.isBinaryExpression(expression) && lib_1.ts.isParenthesizedExpression(node) &&
            (lib_1.ts.isVariableDeclaration(parent) || lib_1.ts.isPropertyDeclaration(parent));
    }
    isNestedBinaryExpressions11(expression, node, parent, parentText, nodeText, str) {
        return lib_1.ts.isBinaryExpression(expression) && lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.isBinaryExpression(parent) && parentText.startsWith(nodeText) && str.startsWith('=') && !str.startsWith('==');
    }
    isNestedBinaryExpressions10(parentText, nodeText, expression) {
        return parentText.endsWith(nodeText + ';') &&
            parentText.substring(0, parentText.length - nodeText.length - 1).trim().endsWith('=') &&
            (expression.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken ||
                expression.operatorToken.kind === lib_1.ts.SyntaxKind.AsteriskToken ||
                expression.operatorToken.kind === lib_1.ts.SyntaxKind.PlusToken);
    }
    isNestedBinaryExpressions9(parentText, nodeText, expression) {
        return parentText.endsWith(nodeText) &&
            parentText.substring(0, parentText.length - nodeText.length).trim().endsWith('=') &&
            (expression.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken ||
                expression.operatorToken.kind === lib_1.ts.SyntaxKind.AsteriskToken ||
                expression.operatorToken.kind === lib_1.ts.SyntaxKind.PlusToken);
    }
    isNestedBinaryExpressions8(parentText, nodeText) {
        return parentText.startsWith(nodeText) && parentText.substring(nodeText.length).trim().startsWith('!');
    }
    isNestedBinaryExpressions7(expression, node, parent) {
        return (lib_1.ts.isNumericLiteral(expression) || lib_1.ts.isIdentifier(expression)) &&
            lib_1.ts.isParenthesizedExpression(node) && !lib_1.ts.isTaggedTemplateExpression(parent);
    }
    isNestedBinaryExpressions6(parent, node, expression) {
        return lib_1.ts.isParenthesizedExpression(parent) && lib_1.ts.isParenthesizedExpression(node) && lib_1.ts.isArrowFunction(expression);
    }
    isNestedBinaryExpressions5(parent, node, expression, parentText, nodeText) {
        return lib_1.ts.isBinaryExpression(parent) && lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.isAwaitExpression(expression) && parentText.startsWith(nodeText) && parentText.substring(nodeText.length).trim().startsWith('??');
    }
    isNestedBinaryExpressions4(parent, node, expression, parentText, nodeText) {
        return lib_1.ts.isBinaryExpression(parent) && lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.isBinaryExpression(expression) && parentText.endsWith(nodeText) && parentText.substring(0, parentText.length - nodeText.length).trim().endsWith('=');
    }
    isNestedBinaryExpressions3(node, expression, parent, parentText, nodeText) {
        return lib_1.ts.isParenthesizedExpression(node) && lib_1.ts.isPropertyAccessExpression(expression) &&
            lib_1.ts.isCallExpression(parent) && parentText.startsWith(nodeText) && parentText.substring(nodeText.length).trim().startsWith('?');
    }
    isNestedBinaryExpressions2(expression, parent) {
        return lib_1.ts.isBinaryExpression(expression) && lib_1.ts.isBinaryExpression(parent) &&
            expression.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken &&
            parent.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken;
    }
    isNestedBinaryExpressions1(parent, expression, split) {
        return lib_1.ts.isParenthesizedExpression(parent) && !lib_1.ts.isParenthesizedExpression(expression) &&
            split[0].trim().endsWith('(') && split[1].trim().startsWith(')');
    }
    isTernaryOperandBinaryExpressions(node) {
        const parent = node.parent;
        const expr = node.expression;
        if (lib_1.ts.isAwaitExpression(expr) && lib_1.ts.isParenthesizedExpression(node) &&
            lib_1.ts.isConditionalExpression(parent) && parent.condition === node) {
            return true;
        }
        return lib_1.ts.isConditionalExpression(parent) &&
            (parent.condition === node || parent.whenTrue === node || parent.whenFalse === node) &&
            lib_1.ts.isBinaryExpression(node.expression);
    }
    isJSXMultiLine(node, sourceFile) {
        const inner = node.expression;
        if (!lib_1.ts.isJsxElement(inner) && !lib_1.ts.isJsxFragment(inner)) {
            return false;
        }
        const start = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, inner.getStart());
        const end = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, inner.getEnd());
        return start.line === end.line;
    }
    isJSXSingleLine(node, sourceFile) {
        const inner = node.expression;
        if (!lib_1.ts.isJsxElement(inner) && !lib_1.ts.isJsxFragment(inner)) {
            return false;
        }
        const start = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, inner.getStart());
        const end = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, inner.getEnd());
        return start.line !== end.line;
    }
    isEnforceForArrowConditionals(node) {
        const parent = node.parent;
        return lib_1.ts.isArrowFunction(parent) && parent.body === node &&
            lib_1.ts.isConditionalExpression(node.expression);
    }
    isEnforceForSequenceExpressions(node) {
        if (lib_1.ts.isBinaryExpression(node.expression) && node.expression.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken &&
            lib_1.ts.isForOfStatement(node.parent)) {
            return false;
        }
        return this.isCommaExpression(node.expression);
    }
    isCommaExpression(expr) {
        if (lib_1.ts.isBinaryExpression(expr) && expr.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken) {
            if (lib_1.ts.isParenthesizedExpression(expr.parent) && (lib_1.ts.isPropertyAccessExpression(expr.parent.parent) ||
                lib_1.ts.isVariableDeclaration(expr.parent.parent))) {
                return false;
            }
            return true;
        }
        if (lib_1.ts.isParenthesizedExpression(expr)) {
            return this.isCommaExpression(expr.expression);
        }
        return false;
    }
    isEnforceForNewInMemberExpressions(node) {
        const parent = node.parent;
        return (lib_1.ts.isPropertyAccessExpression(parent) || lib_1.ts.isElementAccessExpression(parent)) &&
            lib_1.ts.isNewExpression(node.expression);
    }
    isEnforceForFunctionPrototypeMethods(node) {
        const parent = node.parent;
        return (lib_1.ts.isPropertyAccessExpression(parent) && (parent.name.text === 'call' || parent.name.text === 'apply')) &&
            (lib_1.ts.isFunctionExpression(node.expression) || lib_1.ts.isArrowFunction(node.expression));
    }
    isAllowParensAfterCommentPattern(node, sourceFile) {
        const commentRanges = lib_1.ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
        if (!commentRanges) {
            return false;
        }
        const pattern = /@type\s+\{.*?\}/;
        return commentRanges.some(range => pattern.test(sourceFile.text.substring(range.pos, range.end)));
    }
    addIssueReport(pos, start, end, fixText) {
        const description = `Unnecessary parentheses around expression.`;
        const ruleFix = { range: [start, end], text: fixText };
        const defect = new Defects_1.Defects(pos.line, pos.col, pos.line, description, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoExtraParensCheck = NoExtraParensCheck;
