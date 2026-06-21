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
exports.EqeqeqCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
// 根据 ESLint 的 JavaScript 实现：
// mode: 默认值为 'always'。
// null: 当 mode 是 'always' 时，默认值为 'always'。
// 当 mode 是 'smart' 时，null 的值被忽略（因为 'smart' 模式下会自动处理 null）。
class EqeqeqCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/eqeqeq.md',
        description: 'Require the use of === and !==.'
    };
    //默认
    defaultOptions = [
        'always',
        {
            null: 'always', // 默认值
        }
    ];
    rule;
    defects = [];
    issues = [];
    letDeclarations = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    config = {
        mode: 'always',
        null: 'always' // 默认值
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    check = (target) => {
        this.parseConfig();
        if (target instanceof lib_1.ArkFile) {
            let code = target.getCode();
            this.checkEqeqeq(code, target);
        }
    };
    parseConfig() {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        this.config.mode = this.defaultOptions[0];
        this.config.null = this.defaultOptions[1]?.null;
        if (this.config.mode === 'allow-null') {
            this.config.mode = 'always';
            this.config.null = 'ignore';
            return;
        }
        // 确保 null 的默认值与 ESLint 一致
        if (this.config.mode === 'always' &&
            this.config.null === undefined) {
            this.config.null = 'always';
        }
    }
    isBooleanLiteral = (node) => {
        return node.kind === lib_1.ts.SyntaxKind.TrueKeyword || node.kind === lib_1.ts.SyntaxKind.FalseKeyword;
    };
    getLiteralValue = (node) => {
        switch (node.kind) {
            case lib_1.ts.SyntaxKind.StringLiteral:
                return node.text; // 确保访问的是 StringLiteral 类型
            case lib_1.ts.SyntaxKind.NumericLiteral:
                return parseFloat(node.text); // 确保访问的是 NumericLiteral 类型
            case lib_1.ts.SyntaxKind.TrueKeyword:
                return true; // 布尔字面量 true
            case lib_1.ts.SyntaxKind.FalseKeyword:
                return false; // 布尔字面量 false
            case lib_1.ts.SyntaxKind.NullKeyword:
                return null; // null 字面量
            default:
                return null; // null 字面量;
        }
    };
    isTypeOfBinary = (node) => {
        const isTypeOf = (node) => {
            return lib_1.ts.isTypeOfExpression(node);
        };
        return isTypeOf(node.left) || isTypeOf(node.right);
    };
    isNullCheck = (node) => {
        const isNullUndefined = (n) => {
            return n.kind === lib_1.ts.SyntaxKind.NullKeyword || n.kind === lib_1.ts.SyntaxKind.UndefinedKeyword;
        };
        return isNullUndefined(node.left) || isNullUndefined(node.right);
    };
    areLiteralsAndSameType = (node) => {
        const isLeftLiteral = lib_1.ts.isLiteralExpression(node.left) || this.isBooleanLiteral(node.left);
        const isRightLiteral = lib_1.ts.isLiteralExpression(node.right) || this.isBooleanLiteral(node.right);
        if (!isLeftLiteral || !isRightLiteral) {
            return false; // 不是字面量，直接返回 false
        }
        // 获取字面量的值
        const leftValue = this.getLiteralValue(node.left);
        const rightValue = this.getLiteralValue(node.right);
        // 检查是否为相同类型的字面量
        return typeof leftValue === typeof rightValue;
    };
    inferType = (node) => {
        // 新增处理括号表达式
        if (lib_1.ts.isParenthesizedExpression(node)) {
            return this.inferType(node.expression);
        }
        ;
        if (lib_1.ts.isTypeOfExpression(node)) {
            return 'typeof';
        }
        ;
        if (lib_1.ts.isStringLiteral(node)) {
            return 'string';
        }
        ;
        if (lib_1.ts.isIdentifier(node) && node.getText() === 'Object') {
            return 'Object';
        }
        ;
        if (lib_1.ts.isIdentifier(node) && (this.isUninitializedLetVariable(node) || this.isUninitializedLetVariable(node))) {
            return 'let-uninit';
        }
        ;
        if (lib_1.ts.isNumericLiteral(node)) {
            return 'number';
        }
        ;
        if (node.kind === lib_1.ts.SyntaxKind.TrueKeyword ||
            node.kind === lib_1.ts.SyntaxKind.FalseKeyword) {
            return 'boolean';
        }
        ;
        if (node.kind === lib_1.ts.SyntaxKind.NullKeyword) {
            return 'null';
        }
        ;
        if (lib_1.ts.isIdentifier(node) && node.text === 'undefined' ||
            (lib_1.ts.isVoidExpression(node) && node.expression.kind === lib_1.ts.SyntaxKind.NumericLiteral)) {
            return 'undefined';
        }
        ;
        return 'unknown';
    };
    isSameType = (left, right) => {
        const leftType = this.inferType(left);
        const rightType = this.inferType(right);
        // 处理 null 和 undefined 的互斥情况
        if ((leftType === 'null' && rightType === 'undefined') ||
            (leftType === 'undefined' && rightType === 'null')) {
            return false;
        }
        ;
        if ((leftType === 'typeof' && (rightType === 'string' || rightType === 'let-uninit' || rightType === 'Object' || rightType === 'number')) ||
            (rightType === 'typeof' && (leftType === 'string' || leftType === 'let-uninit'))) {
            return true;
        }
        ;
        if (leftType === 'undefined' && rightType === 'typeof') {
            return true;
        }
        ;
        return leftType === rightType && leftType !== 'unknown';
    };
    getOperatorRange = (node, sourceFile) => {
        const operatorPos = node.operatorToken.getStart(sourceFile);
        return [
            operatorPos,
            operatorPos + (node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsToken ? 2 : 2),
        ];
    };
    isPropertyAccessWithNullUndefined(node) {
        // 递归检查左侧是否包含属性访问
        const checkLeft = (n) => {
            if (lib_1.ts.isPropertyAccessExpression(n) || lib_1.ts.isElementAccessExpression(n)) {
                return true;
            }
            if (lib_1.ts.isParenthesizedExpression(n)) {
                return checkLeft(n.expression);
            }
            if (lib_1.ts.isBinaryExpression(n) && n.operatorToken.kind === lib_1.ts.SyntaxKind.AmpersandAmpersandToken) {
                return checkLeft(n.right);
            }
            return false;
        };
        const hasPropertyAccess = checkLeft(node.left);
        const isRightNullUndefined = node.right.kind === lib_1.ts.SyntaxKind.NullKeyword ||
            this.isUndefinedIdentifier(node.right);
        return hasPropertyAccess && isRightNullUndefined;
    }
    ;
    isUndefinedIdentifier(node) {
        // 处理标识符形式的 undefined
        if (lib_1.ts.isIdentifier(node) && node.text === 'undefined') {
            return true;
        }
        ;
        // 处理 void 0 形式的 undefined
        if (lib_1.ts.isVoidExpression(node) && node.expression.kind === lib_1.ts.SyntaxKind.NumericLiteral &&
            node.expression.text === '0') {
            return true;
        }
        ;
        return false;
    }
    ;
    isComplexPropertyAccessCheck(node) {
        const isNullOrUndefined = (n) => {
            return n.kind === lib_1.ts.SyntaxKind.NullKeyword ||
                n.kind === lib_1.ts.SyntaxKind.UndefinedKeyword ||
                this.isUndefinedIdentifier(n);
        };
        // 检查是否为属性访问表达式
        const isPropertyAccess = (n) => {
            if (lib_1.ts.isPropertyAccessExpression(n) || lib_1.ts.isElementAccessExpression(n)) {
                return true;
            }
            ;
            // 处理括号表达式
            if (lib_1.ts.isParenthesizedExpression(n)) {
                return isPropertyAccess(n.expression);
            }
            ;
            return false;
        };
        // 检查是否为链式属性访问与 null/undefined 比较
        return (isPropertyAccess(node.left) && isNullOrUndefined(node.right)) ||
            (isPropertyAccess(node.right) && isNullOrUndefined(node.left));
    }
    ;
    // 优先处理属性访问的特殊情况
    checkSpecialCases = (node, code, arkFile, methodAst) => {
        if (lib_1.ts.isBinaryExpression(node)) {
            // 处理链式与运算中的相等性检查
            if (node.operatorToken.kind === lib_1.ts.SyntaxKind.AmpersandAmpersandToken) {
                // 递归检查左右两侧的表达式
                return this.checkSpecialCases(node.left, code, arkFile, methodAst) || this.checkSpecialCases(node.right, code, arkFile, methodAst);
            }
            ;
            // 检查是否为相等性检查操作符
            const isEqualityOperator = node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsToken ||
                node.operatorToken.kind === lib_1.ts.SyntaxKind.ExclamationEqualsToken ||
                node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
                node.operatorToken.kind === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken;
            if (isEqualityOperator) {
                // 检查是否为属性访问与 null/undefined 的比较
                if (this.checkPropertyAccessWithNullUndefined(node, code, arkFile, methodAst)) {
                    return true;
                }
                // 检查是否为复杂的链式属性访问
                return this.checkComplexPropertyAccess(node, code, arkFile, methodAst);
            }
            ;
        }
        ;
        return false;
    };
    checkPropertyAccessWithNullUndefined(node, code, arkFile, methodAst) {
        if (this.isPropertyAccessWithNullUndefined(node)) {
            const operator = node.operatorToken.kind;
            const expected = this.config.null === 'always' ? '!==' : '!=';
            // 根据配置判断
            if ((this.config.null === 'always' && operator !== lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) ||
                (this.config.null === 'never' && operator !== lib_1.ts.SyntaxKind.ExclamationEqualsToken)) {
                this.createIssue(code, expected, node, methodAst, arkFile);
            }
            return true;
        }
        ;
        return false;
    }
    ;
    checkComplexPropertyAccess(node, code, arkFile, methodAst) {
        const isComplexPropertyAccess = this.isComplexPropertyAccessCheck(node);
        if (isComplexPropertyAccess) {
            const operator = node.operatorToken.kind;
            const expected = this.config.null === 'always' ?
                (operator === lib_1.ts.SyntaxKind.EqualsEqualsToken ? '===' : '!==') :
                (operator === lib_1.ts.SyntaxKind.EqualsEqualsToken ? '==' : '!=');
            if ((this.config.null === 'always' &&
                (operator === lib_1.ts.SyntaxKind.EqualsEqualsToken || operator === lib_1.ts.SyntaxKind.ExclamationEqualsToken)) ||
                (this.config.null === 'never' &&
                    (operator === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken || operator === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken))) {
                this.createIssue(code, expected, node, methodAst, arkFile);
            }
            ;
            return true;
        }
        ;
        return false;
    }
    ;
    shouldSkipCheck = (isEqualityCheck, isNull, enforceInverseRuleForNull, operator) => {
        return ((!isEqualityCheck && !enforceInverseRuleForNull) ||
            (isNull && enforceInverseRuleForNull && isEqualityCheck) ||
            (!isNull && enforceInverseRuleForNull && operator === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken));
    };
    isSmartMode = (node, isNull) => {
        return (this.config.mode === 'smart' &&
            (this.isTypeOfBinary(node) || this.areLiteralsAndSameType(node) || isNull));
    };
    shouldHandleNullCase = (isNull, enforceInverseRuleForNull) => {
        return enforceInverseRuleForNull && isNull;
    };
    isEqualityCheck = (operator) => {
        return (operator === lib_1.ts.SyntaxKind.EqualsEqualsToken ||
            operator === lib_1.ts.SyntaxKind.ExclamationEqualsToken);
    };
    getExpectedOperator = (operator) => {
        return operator === lib_1.ts.SyntaxKind.EqualsEqualsToken ? '===' : '!==';
    };
    getAllLetDeclarations(methodAst) {
        const letDeclarations = [];
        const visitNode = (node) => {
            if (lib_1.ts.isVariableDeclarationList(node) && (node.flags & lib_1.ts.NodeFlags.Let)) {
                node.declarations.forEach(declaration => {
                    letDeclarations.push(declaration);
                });
            }
            ;
            lib_1.ts.forEachChild(node, visitNode);
        };
        visitNode(methodAst);
        return letDeclarations;
    }
    ;
    checkEqeqeq(code, arkFile) {
        const methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.letDeclarations = this.getAllLetDeclarations(methodAst);
        const checkNode = (node) => {
            const result = this.checkSpecialCases(node, code, arkFile, methodAst);
            if (lib_1.ts.isBinaryExpression(node) && !result) {
                const operator = node.operatorToken.kind;
                const isEqualityCheck = this.isEqualityCheck(operator);
                const isNull = this.isNullCheck(node);
                const enforceRuleForNull = this.config.null === 'always';
                const enforceInverseRuleForNull = this.config.null === 'never';
                if (this.shouldSkipCheck(isEqualityCheck, isNull, enforceInverseRuleForNull, operator)) {
                    return;
                }
                ;
                const expectedOperator = this.getExpectedOperator(operator);
                if (this.isSmartMode(node, isNull)) {
                    return;
                }
                ;
                if (this.shouldHandleNullCase(isNull, enforceInverseRuleForNull)) {
                    const isTripleEqual = operator === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken;
                    const expectedOperator1 = isTripleEqual ? '==' : '!=';
                    this.createIssue(code, expectedOperator1, node, methodAst, arkFile);
                    return;
                }
                ;
                if (!enforceRuleForNull && isNull) {
                    return;
                }
                ;
                this.createIssue(code, expectedOperator, node, methodAst, arkFile);
            }
            lib_1.ts.forEachChild(node, checkNode);
        };
        checkNode(methodAst);
    }
    ;
    createIssue(code, expectedOperator, node, methodAst, arkFile) {
        const operatorStart = node.operatorToken.getStart(methodAst);
        const operatorLine = methodAst.getLineAndCharacterOfPosition(operatorStart).line;
        const operatorColumn = methodAst.getLineAndCharacterOfPosition(operatorStart).character;
        const [startRange, endRange] = this.getOperatorRange(node, methodAst);
        const fix = code.substring(0, startRange) + expectedOperator + code.substring(endRange);
        const resultIssue = {
            line: operatorLine + 1,
            column: operatorColumn + 1,
            columnEnd: operatorColumn + 1 + node.operatorToken.getText().length,
            message: `Expected '${expectedOperator}' and instead saw '${node.operatorToken.getText()}'.`,
            filePath: arkFile.getFilePath() ?? '',
            fixCode: expectedOperator
        };
        let ruleFix;
        if (this.isSameType(node.left, node.right)) {
            ruleFix = this.createFix(startRange, endRange, expectedOperator);
        }
        this.addIssueReport(resultIssue, ruleFix);
    }
    ;
    getDeclarationForIdentifier(node, letDeclarations) {
        for (const declaration of letDeclarations) {
            if (lib_1.ts.isIdentifier(declaration.name) && declaration.name.text === node.text) {
                return declaration;
            }
        }
        return null;
    }
    isUninitializedLetVariable(node) {
        if (lib_1.ts.isIdentifier(node)) {
            const declaration = this.getDeclarationForIdentifier(node, this.letDeclarations);
            if (declaration) {
                return (lib_1.ts.isVariableDeclarationList(declaration.parent) &&
                    (declaration.parent.flags & lib_1.ts.NodeFlags.Let) !== 0 &&
                    declaration.initializer === undefined);
            }
        }
        return false;
    }
    findVariableDeclaration(node) {
        let current = node;
        while (current) {
            if (lib_1.ts.isVariableDeclaration(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }
    createFix(start, end, code) {
        return { range: [start, end], text: code };
    }
    ;
    addIssueReport(issue, ruleFix) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, (ruleFix != undefined ? true : false));
        this.issues.push(new Defects_1.IssueReport(defects, ruleFix));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.EqeqeqCheck = EqeqeqCheck;
