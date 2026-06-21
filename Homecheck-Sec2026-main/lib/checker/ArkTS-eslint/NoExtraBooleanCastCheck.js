"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoExtraBooleanCastCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
;
;
class NoExtraBooleanCastCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-extra-boolean-cast.md',
        description: 'Redundant Boolean call'
    };
    rule;
    defects = [];
    issues = [];
    defaultOptions = [{ 'enforceForLogicalOperands': false }];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    sourceFile;
    arkFile;
    enforceForLogicalOperands;
    static binaryExpressionTypes = [
        lib_1.ts.SyntaxKind.AmpersandAmpersandToken,
        lib_1.ts.SyntaxKind.BarBarToken,
        lib_1.ts.SyntaxKind.QuestionQuestionToken
    ];
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        this.defaultOptions = (this.rule && this.rule.option[0]) ? this.rule.option : this.defaultOptions;
        if (target instanceof lib_1.ArkFile) {
            this.checkExtraBooleanCast(target, this.defaultOptions[0].enforceForLogicalOperands);
        }
        ;
    };
    getUnwrappedExpression = (node) => {
        while (node.kind === lib_1.ts.SyntaxKind.ParenthesizedExpression) {
            node = node.expression;
        }
        ;
        return node;
    };
    // 检查是否存在多余的布尔转换
    hasRedundantBooleanCast = (node) => {
        const unwrapped = this.getUnwrappedExpression(node);
        if (lib_1.ts.isBinaryExpression(unwrapped) && unwrapped.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken) {
            // 递归检查逗号表达式的右操作数（即最后一个表达式）
            return this.hasRedundantBooleanCast(unwrapped.right);
        }
        ;
        if (node.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression) {
            return this.hasCheckPrefixUnaryExp(node);
        }
        else if (node.kind === lib_1.ts.SyntaxKind.CallExpression) {
            const callExpr = node;
            if (callExpr.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                callExpr.expression.text === 'Boolean') {
                const arg = callExpr.arguments[0];
                const unwrappedArg = this.getUnwrappedExpression(arg);
                if (unwrappedArg.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression ||
                    unwrappedArg.kind === lib_1.ts.SyntaxKind.CallExpression) {
                    return this.hasRedundantBooleanCast(unwrappedArg);
                }
            }
            ;
        }
        ;
        return false;
    };
    hasCheckPrefixUnaryExp(unaryExpr) {
        if (unaryExpr.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
            const operand = this.getUnwrappedExpression(unaryExpr.operand);
            if (operand.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression) {
                const innerUnaryExpr = operand;
                if (innerUnaryExpr.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
                    return true;
                }
                ;
            }
            else if (operand.kind === lib_1.ts.SyntaxKind.CallExpression) {
                const callExpr = operand;
                if (callExpr.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                    callExpr.expression.text === 'Boolean') {
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    //Node是否处于布尔上下文中。布尔上下文是指那些期望表达式返回布尔值的语法结构，例如条件语句、逻辑运算符、布尔转换函数等
    isInBooleanContext = (node, enforceForLogicalOperands) => {
        let current = node.parent;
        let currentNode = node;
        while (current) {
            if (current.kind === lib_1.ts.SyntaxKind.IfStatement) {
                return current.expression === currentNode;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.WhileStatement) {
                return current.expression === currentNode;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.DoStatement) {
                return current.expression === currentNode;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.ConditionalExpression) {
                return current.condition === currentNode;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.ForStatement) {
                return current.condition === currentNode;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
                current.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
                return true;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.BinaryExpression &&
                NoExtraBooleanCastCheck.binaryExpressionTypes.includes(current.operatorToken.kind)) {
                return enforceForLogicalOperands;
            }
            else if (current.kind === lib_1.ts.SyntaxKind.CallExpression &&
                current.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                current.expression.text === 'Boolean') {
                return true;
            }
            ;
            currentNode = current;
            current = current.parent;
        }
        ;
        return false;
    };
    //判断node的父节点是否是一个逻辑表达式(如 && || ??)
    isParentLogicalExpression = (node) => {
        const parent = node.parent;
        return parent?.kind === lib_1.ts.SyntaxKind.BinaryExpression && [
            lib_1.ts.SyntaxKind.AmpersandAmpersandToken,
            lib_1.ts.SyntaxKind.BarBarToken,
            lib_1.ts.SyntaxKind.QuestionQuestionToken
        ].includes(parent.operatorToken.kind);
    };
    addIssue = (node, message, fix, methodAst, arkFile) => {
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(methodAst, node.getStart());
        const issue = {
            line: line + 1,
            column: character + 1,
            columnEnd: character + 1 + (node.getText()?.length ?? 0),
            message,
            filePath: arkFile.getFilePath() ?? '',
        };
        let fixInfo;
        if (fix && this.canSafeFix(node)) {
            const needsParens = this.needsParentheses(node, fix);
            fixInfo = {
                text: needsParens ? `(${fix})` : fix,
                needsParens
            };
        }
        ;
        const ruleFix = fixInfo ? this.createFix(node.getStart(), node.getEnd(), fixInfo.text) : undefined;
        this.addIssueReport(issue, ruleFix);
    };
    // 获取最内层非布尔转换的参数
    getInnermostNonBooleanArg = (node) => {
        if (node.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression) {
            const unaryExpr = node;
            if (unaryExpr.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
                const operand = this.getUnwrappedExpression(unaryExpr.operand);
                return this.getInnermostNonBooleanArg(operand);
            }
            ;
        }
        else if (node.kind === lib_1.ts.SyntaxKind.CallExpression) {
            const callExpr = node;
            if (callExpr.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                callExpr.expression.text === 'Boolean') {
                const arg = callExpr.arguments[0];
                const unwrappedArg = this.getUnwrappedExpression(arg);
                return this.getInnermostNonBooleanArg(unwrappedArg);
            }
            ;
        }
        ;
        return node;
    };
    checkNode = (node) => {
        if (node.kind === lib_1.ts.SyntaxKind.CallExpression) {
            const callExpr = node;
            if (this.checkCallExpressionOneArguments(callExpr)) {
                return;
            }
            if (callExpr.expression?.kind === lib_1.ts.SyntaxKind.Identifier && callExpr.expression.text === 'Boolean') {
                const result = this.checkCallExpressionNoOneArguments(callExpr, this.sourceFile, this.arkFile, this.enforceForLogicalOperands);
                if (result) {
                    return;
                }
                const arg = callExpr.arguments[0];
                const result1 = this.isInBooleanContext(callExpr, this.defaultOptions[0].enforceForLogicalOperands) ||
                    (this.enforceForLogicalOperands && this.isParentLogicalExpression(callExpr));
                if (result1) {
                    const unwrappedArg = this.getUnwrappedExpression(arg);
                    this.addIssue(callExpr, 'Redundant Boolean call', unwrappedArg.getText(), this.sourceFile, this.arkFile);
                }
                ;
                this.checkNode(arg);
            }
        }
        else if (node.kind === lib_1.ts.SyntaxKind.NewExpression) {
            const newExpr = node;
            if (newExpr.expression.kind === lib_1.ts.SyntaxKind.Identifier && newExpr.expression.text === 'Boolean') {
                const result = this.checkNewCallExpression(newExpr, this.sourceFile, this.arkFile, this.enforceForLogicalOperands);
                if (result || !newExpr.arguments) {
                    return;
                }
                const arg = newExpr.arguments[0];
                this.checkNode(arg);
            }
        }
        else if (node.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression) {
            const unaryExpr = node;
            if (unaryExpr.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
                const operand = this.getUnwrappedExpression(unaryExpr.operand);
                if (operand.kind === lib_1.ts.SyntaxKind.CallExpression &&
                    operand.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                    operand.expression.text === 'Boolean') {
                    this.checkNode(operand);
                    return;
                }
                else if (operand.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
                    operand.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
                    this.checkPrefixUnaryExpression(unaryExpr, this.enforceForLogicalOperands, operand, this.sourceFile, this.arkFile);
                }
                ;
            }
        }
        ;
        lib_1.ts.forEachChild(node, this.checkNode);
    };
    checkExtraBooleanCast(arkFile, enforceForLogicalOperands) {
        const methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.sourceFile = methodAst;
        this.arkFile = arkFile;
        this.enforceForLogicalOperands = enforceForLogicalOperands;
        this.checkNode(methodAst);
    }
    ;
    checkPrefixUnaryExpression(unaryExpr, enforceForLogicalOperands, operand, methodAst, arkFile) {
        const innerOperand = this.getUnwrappedExpression(operand.operand);
        if ((!enforceForLogicalOperands && this.isInBooleanContext(unaryExpr, enforceForLogicalOperands)) ||
            (enforceForLogicalOperands && (this.isParentLogicalExpression(unaryExpr)) || this.isInBooleanContext(unaryExpr, enforceForLogicalOperands))) {
            this.addIssue(unaryExpr, 'Redundant double negation', innerOperand.getText(), methodAst, arkFile);
        }
        ;
    }
    ;
    checkNewCallExpression(newExpr, methodAst, arkFile, enforceForLogicalOperands) {
        if (!newExpr.arguments) {
            return false;
        }
        if (newExpr.arguments?.length !== 1) {
            const message = 'Redundant Boolean constructor call';
            this.addIssue(newExpr, message, 'false', methodAst, arkFile);
            return true;
        }
        ;
        const arg = newExpr.arguments[0];
        const unwrappedArg = this.getUnwrappedExpression(arg);
        const isRedundant = this.hasRedundantBooleanCast(unwrappedArg);
        if (isRedundant) {
            const innermostArg = this.getInnermostNonBooleanArg(unwrappedArg);
            this.addIssue(unwrappedArg, 'Redundant double negation', innermostArg.getText(), methodAst, arkFile);
        }
        ;
        return false;
    }
    ;
    checkCallExpressionOneArguments(callExpr) {
        if (callExpr.expression.getText() !== 'Boolean') {
            return false;
        }
        ;
        if (callExpr.arguments.length === 1) {
            const arg = callExpr.arguments[0];
            if (lib_1.ts.isBinaryExpression(arg) &&
                arg.operatorToken.kind === lib_1.ts.SyntaxKind.QuestionQuestionToken &&
                lib_1.ts.isCallExpression(arg.right) && arg.right.arguments.length === 1) {
                return true;
            }
            ;
        }
        ;
        if (callExpr.arguments.length === 2 &&
            callExpr.arguments[0]?.kind !== lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
            callExpr.arguments[1]?.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
            callExpr.arguments[1].expression?.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression) {
            return true;
        }
        ;
        return false;
    }
    ;
    checkCallExpressionNoOneArguments(callExpr, methodAst, arkFile, enforceForLogicalOperands) {
        if (callExpr.arguments.length !== 1) {
            if (callExpr.arguments.length > 0) {
                const arg = callExpr.arguments[0];
                if (!(arg.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
                    arg.operator === lib_1.ts.SyntaxKind.ExclamationToken &&
                    arg.operand.kind === lib_1.ts.SyntaxKind.PrefixUnaryExpression &&
                    arg.operand.operator === lib_1.ts.SyntaxKind.ExclamationToken) && !enforceForLogicalOperands) {
                    return true;
                }
                ;
            }
            ;
            if (callExpr.arguments.length === 0) {
                const message = 'Redundant Boolean call';
                this.addIssue(callExpr, message, 'false', methodAst, arkFile);
                return true;
            }
            ;
        }
        ;
        const arg = callExpr.arguments[0];
        if (this.isBooleanTypeExpression(arg)) {
            return true; // 不报告问题
        }
        ;
        return false;
    }
    ;
    isBooleanTypeExpression(node) {
        const unwrapped = this.getUnwrappedExpression(node);
        if (lib_1.ts.isBinaryExpression(unwrapped) &&
            !lib_1.ts.isConditionalExpression(unwrapped.parent.parent) &&
            !lib_1.ts.isPrefixUnaryExpression(unwrapped.parent.parent)) {
            const operator = unwrapped.operatorToken.kind;
            const comparisonOps = [
                lib_1.ts.SyntaxKind.LessThanToken,
                lib_1.ts.SyntaxKind.GreaterThanToken,
            ];
            return comparisonOps.includes(operator);
        }
        ;
        return false;
    }
    ;
    canSafeFix(node) {
        // 类型校验次之   参数安全   优先级校验最后
        return this.isValidBooleanCall(node) && this.checkArgumentSafety(node) && this.checkPrecedenceSafety(node);
    }
    ;
    isValidBooleanCall(node) {
        // 处理双重否定表达式（!!exp → Boolean(exp)）
        if (lib_1.ts.isPrefixUnaryExpression(node) &&
            node.operator === lib_1.ts.SyntaxKind.ExclamationToken &&
            lib_1.ts.isPrefixUnaryExpression(node.operand) &&
            node.operand.operator === lib_1.ts.SyntaxKind.ExclamationToken) {
            return true; // 识别为 Boolean 转换
        }
        ;
        if (!lib_1.ts.isCallExpression(node) && !lib_1.ts.isNewExpression(node)) {
            return true; // 允许双重否定修复
        }
        ;
        // Boolean()必须只有一个参数且不是展开语法
        return node.arguments?.length === 1 &&
            !lib_1.ts.isSpreadElement(node.arguments[0]);
    }
    ;
    checkArgumentSafety(node) {
        if (lib_1.ts.isCallExpression(node) || lib_1.ts.isNewExpression(node)) {
            const args = node.arguments;
            // 1: Boolean()
            if (args?.length === 0) {
                return false;
            }
            ;
            // 2: Boolean(...args)
            if (args?.some(arg => lib_1.ts.isSpreadElement(arg))) {
                return false;
            }
            ;
            // 3: Boolean(a, b)
            if ((args?.length ?? 0) > 1) {
                return false;
            }
            ;
        }
        ;
        return true;
    }
    ;
    hasComments(node) {
        if (!this.sourceFile?.text) {
            return false;
        }
        ;
        // ESLint注释检测等效实现
        const commentRanges = [
            ...lib_1.ts.getLeadingCommentRanges(this.sourceFile.text, node.getFullStart()) || [],
            ...lib_1.ts.getTrailingCommentRanges(this.sourceFile.text, node.getEnd()) || []
        ];
        return commentRanges.length > 0;
    }
    checkPrecedenceSafety(node) {
        // ESLint优先级安全策略
        const parent = node.parent;
        if (!lib_1.ts.isBinaryExpression(parent)) {
            return true;
        }
        ;
        const nodePrecedence = this.getPrecedence(node);
        const parentPrecedence = this.getPrecedence(parent);
        return nodePrecedence >= parentPrecedence;
    }
    // 新增括号需求判断方法
    needsParentheses(originalNode, replacement) {
        // 新增快速检测运算符：三元、逗号、!=、!==、** 
        const forceParensRegex = /(\?|,|!\==?|\*\*)/;
        if (forceParensRegex.test(replacement)) {
            return true; // 强制添加括号
        }
        ;
        const parent = originalNode.parent;
        if (lib_1.ts.isParenthesizedExpression(parent)) {
            return false;
        }
        ;
        const replacementAST = lib_1.AstTreeUtils.getASTNode('temp.ts', replacement);
        const replacementExpr = replacementAST.statements[0]?.expression;
        if (!replacementExpr) {
            return false;
        }
        ;
        const replacementPrecedence = this.getPrecedence(replacementExpr);
        const contextPrecedence = this.getContextualPrecedence(originalNode);
        return replacementPrecedence < contextPrecedence;
    }
    getPrecedence(node) {
        if (lib_1.ts.isConditionalExpression(node)) {
            return 4; // 三元运算符优先级设为 4（与 ESLint 一致）
        }
        ;
        // ESLint优先级映射表转换
        if (lib_1.ts.isBinaryExpression(node)) {
            switch (node.operatorToken.kind) {
                case lib_1.ts.SyntaxKind.EqualsToken:
                case lib_1.ts.SyntaxKind.PlusEqualsToken:
                case lib_1.ts.SyntaxKind.MinusEqualsToken:
                    return 1;
                case lib_1.ts.SyntaxKind.BarBarToken:
                    return 2;
                case lib_1.ts.SyntaxKind.AmpersandAmpersandToken:
                    return 3;
                case lib_1.ts.SyntaxKind.EqualsEqualsToken:
                case lib_1.ts.SyntaxKind.ExclamationEqualsToken:
                case lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken:
                case lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    return 7;
                case lib_1.ts.SyntaxKind.LessThanToken:
                case lib_1.ts.SyntaxKind.GreaterThanToken:
                case lib_1.ts.SyntaxKind.LessThanEqualsToken:
                case lib_1.ts.SyntaxKind.GreaterThanEqualsToken:
                    return 8;
                case lib_1.ts.SyntaxKind.PlusToken:
                case lib_1.ts.SyntaxKind.MinusToken:
                    return 10;
                case lib_1.ts.SyntaxKind.AsteriskToken:
                    return 11;
                case lib_1.ts.SyntaxKind.AsteriskAsteriskToken:
                    return 14; // 幂运算符优先级最高之一
            }
            ;
        }
        ;
        if (lib_1.ts.isPrefixUnaryExpression(node)) {
            return 15;
        }
        ;
        return 20; // 最高优先级
    }
    ;
    // 上下文优先级判断
    getContextualPrecedence(node) {
        let parent = node.parent;
        while (parent && lib_1.ts.isParenthesizedExpression(parent)) {
            parent = parent.parent;
        }
        ;
        if (!parent) {
            return 0;
        }
        ;
        if (lib_1.ts.isBinaryExpression(parent)) {
            return this.getPrecedence(parent);
        }
        ;
        if (lib_1.ts.isPrefixUnaryExpression(parent)) {
            return this.getPrecedence(parent);
        }
        ;
        if (lib_1.ts.isConditionalExpression(parent)) {
            return 4; // 条件运算符的优先级
        }
        ;
        return 0;
    }
    ;
    createFix(start, end, code) {
        return { range: [start, end], text: code };
    }
    ;
    addIssueReport(issue, ruleFix) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, (ruleFix !== undefined ? true : false));
        this.issues.push(new Defects_1.IssueReport(defects, ruleFix));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.NoExtraBooleanCastCheck = NoExtraBooleanCastCheck;
