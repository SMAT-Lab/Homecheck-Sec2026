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
exports.NoUnsafeOptionalChainingCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeOptionalChainingCheck');
;
;
const UNSAFE_ARITHMETIC_OPERATORS = new Set(['+', '-', '/', '*', '%', '**']);
const UNSAFE_ASSIGNMENT_OPERATORS = new Set(['+=', '-=', '/=', '*=', '%=', '**=']);
const UNSAFE_RELATIONAL_OPERATORS = new Set(['in', 'instanceof']);
class NoUnsafeOptionalChainingCheck {
    rule;
    defaultOptions = [{ disallowArithmeticOperators: false }];
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-unsafe-optional-chaining.md',
        description: 'Disallow use of optional chaining in contexts where the undefined value is not allowed',
    };
    messages = {
        unsafeOptionalChain: `Unsafe usage of optional chaining. If it short-circuits with 'undefined' the evaluation will throw TypeError`,
        unsafeArithmetic: 'Unsafe arithmetic operation on optional chaining. It can result in NaN'
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    filePath = '';
    message = '';
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcherCb];
    }
    ;
    check = (target) => {
        try {
            this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
            this.filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            this.visitNode(sourceFile, sourceFile);
        }
        catch (error) {
            logger.error(`Error occurred while checking file: ${target.getFilePath()}, Error: ${error}`);
        }
        ;
    };
    visitNode(node, sourceFile) {
        // 检查是否是可选链表达式
        if (arkanalyzer_1.ts.isOptionalChain(node)) {
            const isUnsafe = this.isUnsafeOptionalChain(node);
            const isUnsafeArithmetic = this.isUnsafeArithmeticOperation(node, node.parent);
            if (isUnsafe || isUnsafeArithmetic) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                this.message = this.getMessage(isUnsafeArithmetic);
                const warnInfo = {
                    line: line + 1,
                    startCol: character + 1,
                    endCol: character + 1 + node.getText().length,
                };
                const defect = this.addIssueReport(warnInfo);
                const issueReport = new Defects_1.IssueReport(defect, undefined);
                this.issues.push(issueReport);
                DefectsList_1.RuleListUtil.push(defect);
                this.message = '';
            }
            ;
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, child => this.visitNode(child, sourceFile));
    }
    ;
    getMessage(isUnsafeArithmetic) {
        if (this.message) {
            return this.message;
        }
        ;
        return isUnsafeArithmetic ? this.messages.unsafeArithmetic : this.messages.unsafeOptionalChain;
    }
    ;
    // 检查是否是可选链表达式
    isUnsafeOptionalChain(node) {
        if (!arkanalyzer_1.ts.isOptionalChain(node)) {
            return false;
        }
        ;
        let current = node;
        let parent = node.parent;
        // 向上遍历 AST，检查父节点
        while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            current = parent;
            parent = parent.parent;
        }
        ;
        if (!parent) {
            return false;
        }
        ;
        // 检查 for...of 循环
        if (arkanalyzer_1.ts.isForOfStatement(parent)) {
            return true;
        }
        ;
        // 检查 await 表达式
        if (arkanalyzer_1.ts.isAwaitExpression(parent)) {
            return this.isUnsafeAwaitExpression(parent) || this.checkBinaryExpressionUnsafe(parent);
        }
        ;
        // 检查不安全的条件表达式
        if (arkanalyzer_1.ts.isConditionalExpression(parent) && (parent.whenTrue === current || parent.whenFalse === current)) {
            return this.isUnsafeConditionalExpression(parent);
        }
        ;
        // 检查解构赋值
        if (this.isInDestructuring(node)) {
            return true;
        }
        ;
        // 检查不安全的使用场景
        return this.isUnsafeGeneralCase(parent, current);
    }
    // 用于检查节点作为二元表达式一部分时的不安全性
    checkBinaryExpressionUnsafe(node) {
        let current = node;
        let parent = node.parent;
        // 处理括号表达式
        while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            current = parent;
            parent = parent.parent;
        }
        ;
        if (!parent) {
            return false;
        }
        ;
        // 检查三元表达式
        if (arkanalyzer_1.ts.isConditionalExpression(parent)) {
            if (parent.whenTrue === current || parent.whenFalse === current) {
                return this.isUnsafeConditionalExpression(parent);
            }
            ;
        }
        ;
        // 检查二元表达式
        if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            const kind = parent.operatorToken.kind;
            // 如果是 ?? 运算符，只检查右侧的可选链
            if (kind === arkanalyzer_1.ts.SyntaxKind.QuestionQuestionToken) {
                // 如果当前节点在左侧，是安全的
                return this.checkQuestionQuestionToken(current, node, parent);
            }
            ;
            // 处理其他逻辑运算符
            if (this.isLogicalOperator(parent.operatorToken.kind)) {
                return this.checkParentChainForUnsafeUsage(parent, current);
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkQuestionQuestionToken(current, node, parent) {
        // 如果当前节点在左侧，是安全的
        if (current === parent.left || this.isDescendantOf(node, parent.left)) {
            return false;
        }
        ;
        // 如果当前节点在右侧，需要继续检查
        if (current === parent.right || this.isDescendantOf(node, parent.right)) {
            let expressionParent = parent.parent;
            while (expressionParent && arkanalyzer_1.ts.isParenthesizedExpression(expressionParent)) {
                expressionParent = expressionParent.parent;
            }
            ;
            if ((arkanalyzer_1.ts.isCallExpression(expressionParent) && expressionParent.expression === parent.parent &&
                !(expressionParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
                (arkanalyzer_1.ts.isPropertyAccessExpression(expressionParent) && expressionParent.expression === parent.parent &&
                    !(expressionParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain))) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    // 递归检查父节点链上的不安全使用
    checkParentChainForUnsafeUsage(parent, node) {
        let current = parent;
        let parentExpression = parent.parent;
        while (parentExpression) {
            // 处理括号表达式
            while (parentExpression && arkanalyzer_1.ts.isParenthesizedExpression(parentExpression)) {
                current = parentExpression;
                parentExpression = parentExpression.parent;
            }
            ;
            if (!parentExpression) {
                break;
            }
            ;
            // 检查await表达式
            if (arkanalyzer_1.ts.isAwaitExpression(parentExpression)) {
                current = parentExpression;
                parentExpression = parentExpression.parent;
                continue;
            }
            ;
            // 如果是函数调用
            if (arkanalyzer_1.ts.isCallExpression(parentExpression) && parentExpression.expression === current &&
                !(parentExpression.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) {
                if (arkanalyzer_1.ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind !== arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken) {
                    return false;
                }
                ;
                if (arkanalyzer_1.ts.isParenthesizedExpression(current) && current.expression !== parent && !arkanalyzer_1.ts.isAwaitExpression(current.expression)) {
                    current = parentExpression;
                    parentExpression = parentExpression.parent;
                    continue;
                }
                ;
            }
            ;
            // new 表达式: new (expr)()
            if (arkanalyzer_1.ts.isNewExpression(parentExpression) && parentExpression.expression === current) {
                return this.checkNewAndBinaryExpression(parent, node);
            }
            ;
            // 检查不安全的使用场景
            if (
            // 函数调用: (expr)()
            (arkanalyzer_1.ts.isCallExpression(parentExpression) && parentExpression.expression === current &&
                !(parentExpression.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
                // 属性访问: (expr).prop
                (arkanalyzer_1.ts.isPropertyAccessExpression(parentExpression) && parentExpression.expression === current &&
                    !(parentExpression.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
                // 元素访问: (expr)[index]
                (arkanalyzer_1.ts.isElementAccessExpression(parentExpression) && parentExpression.expression === current &&
                    !(parentExpression.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
                // 模板字面量: (expr)`template`
                (arkanalyzer_1.ts.isTaggedTemplateExpression(parentExpression) && parentExpression.tag === current) ||
                // 检查变量声明中的解构赋值
                (arkanalyzer_1.ts.isVariableDeclaration(parentExpression) &&
                    (arkanalyzer_1.ts.isBinaryExpression(parent) && node === parent.right) &&
                    (arkanalyzer_1.ts.isArrayBindingPattern(parentExpression.name) || arkanalyzer_1.ts.isObjectBindingPattern(parentExpression.name)))) {
                return true;
            }
            ;
            // 继续向上检查
            current = parentExpression;
            parentExpression = parentExpression.parent;
        }
        ;
        return false;
    }
    ;
    checkNewAndBinaryExpression(parent, node) {
        if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            if (parent.right === node) {
                return true;
            }
            else {
                return false;
            }
            ;
        }
        else {
            return true;
        }
        ;
    }
    ;
    // 检查是否在解构赋值中
    isInDestructuring(node) {
        let current = node;
        let parent = node.parent;
        while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            current = parent;
            parent = parent.parent;
        }
        ;
        if (!parent) {
            return false;
        }
        ;
        // 检查数组解构赋值模式
        if (arkanalyzer_1.ts.isArrayLiteralExpression(parent)) {
            // 检查是否在数组解构赋值中
            return this.checkArrayLiteralExpression(parent);
        }
        ;
        // 检查对象解构赋值
        if (arkanalyzer_1.ts.isPropertyAssignment(parent)) {
            let objParent = parent.parent;
            while (objParent) {
                if (this.checkObjectLiteralExpression(objParent)) {
                    return true;
                }
                ;
                objParent = objParent.parent;
            }
            ;
        }
        ;
        // 检查嵌套的解构赋值
        if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
            (arkanalyzer_1.ts.isArrayLiteralExpression(parent.left) ||
                arkanalyzer_1.ts.isObjectLiteralExpression(parent.left))) {
            return true;
        }
        ;
        // 检查变量声明中的解构
        if (arkanalyzer_1.ts.isVariableDeclaration(parent) && parent.initializer === current) {
            if ((arkanalyzer_1.ts.isArrayBindingPattern(parent.name) || arkanalyzer_1.ts.isObjectBindingPattern(parent.name)) &&
                arkanalyzer_1.ts.isOptionalChain(current)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkArrayLiteralExpression(parent) {
        // 检查是否在数组解构赋值中
        let arrayParent = parent.parent;
        while (arrayParent && arkanalyzer_1.ts.isParenthesizedExpression(arrayParent)) {
            arrayParent = arrayParent.parent;
        }
        ;
        if (arrayParent && arkanalyzer_1.ts.isBinaryExpression(arrayParent) &&
            arrayParent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            return true;
        }
        ;
        return false;
    }
    ;
    checkObjectLiteralExpression(objParent) {
        if (arkanalyzer_1.ts.isObjectLiteralExpression(objParent)) {
            let assignParent = objParent.parent;
            while (assignParent && arkanalyzer_1.ts.isParenthesizedExpression(assignParent)) {
                assignParent = assignParent.parent;
            }
            ;
            if (assignParent &&
                (arkanalyzer_1.ts.isBinaryExpression(assignParent) &&
                    assignParent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                    arkanalyzer_1.ts.isVariableDeclaration(assignParent))) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    // 检查 in 或 instanceof 操作符
    isUnsafeInOrInstanceOfOperation(parent, current) {
        // 检查 in 操作符
        if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
            (parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InKeyword ||
                parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InstanceOfKeyword)) {
            // 只有当可选链在右侧时才不安全
            return parent.right === current;
        }
        ;
        return false;
    }
    ;
    // 检查不安全的三元条件表达式
    isUnsafeConditionalExpression(parent) {
        let expressionParent = parent.parent;
        // 处理逻辑表达式外层可能的括号
        while (expressionParent && arkanalyzer_1.ts.isParenthesizedExpression(expressionParent)) {
            expressionParent = expressionParent.parent;
        }
        ;
        if (!expressionParent) {
            return false;
        }
        ;
        return this.isUnsafeExpressionParent(expressionParent, parent);
    }
    ;
    // 检查不安全的表达式父节点
    isUnsafeExpressionParent(expressionParent, parent) {
        return !!(expressionParent && ((arkanalyzer_1.ts.isCallExpression(expressionParent) && expressionParent.expression === parent.parent &&
            !(expressionParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            (arkanalyzer_1.ts.isPropertyAccessExpression(expressionParent) && expressionParent.expression === parent.parent &&
                !(expressionParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            (arkanalyzer_1.ts.isElementAccessExpression(expressionParent) && expressionParent.expression === parent.parent &&
                !(expressionParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            this.checkParentChainForUnsafeUsage(expressionParent, parent)));
    }
    ;
    // 检查不安全的通用情况
    isUnsafeGeneralCase(parent, current) {
        return (
        // 检查各种直接的不安全使用场景
        this.isDirectUnsafeUsage(parent, current) ||
            // 检查各种条件表达式
            this.checkBinaryExpressionUnsafe(current) ||
            // 检查类继承
            this.isUnsafeHeritageExpression(parent) ||
            // // 递归检查表达式链
            this.checkExpressionChainForUnsafeUsage(current));
    }
    ;
    // 递归检查表达式链上的不安全使用
    checkExpressionChainForUnsafeUsage(node) {
        let current = node;
        let parent = node.parent;
        while (parent) {
            // 处理括号表达式
            while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
                current = parent;
                parent = parent.parent;
            }
            ;
            if (!parent) {
                break;
            }
            ;
            // 检查逗号表达式
            if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
                parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken) {
                // 如果当前节点是右操作数，继续向上检查
                if (parent.right === current) {
                    current = parent;
                    parent = parent.parent;
                    continue;
                }
                ;
            }
            ;
            if (arkanalyzer_1.ts.isElementAccessExpression(parent)) {
                return parent.expression === current &&
                    !(parent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain);
            }
            ;
            current = parent;
            parent = parent.parent;
        }
        ;
        return false;
    }
    // 检查直接的不安全使用场景
    isDirectUnsafeUsage(parent, current) {
        return (
        // 函数调用: (obj?.foo)()
        (arkanalyzer_1.ts.isCallExpression(parent) && parent.expression === current &&
            !(parent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            // 属性访问: (obj?.foo).bar
            (arkanalyzer_1.ts.isPropertyAccessExpression(parent) && parent.expression === current &&
                !(parent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            // 元素访问: (obj?.foo)[1]
            (arkanalyzer_1.ts.isElementAccessExpression(parent) && parent.expression === current &&
                !(parent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            // 模板字面量: (obj?.foo)`template`
            (arkanalyzer_1.ts.isTaggedTemplateExpression(parent) && parent.tag === current) ||
            // new 表达式: new (obj?.foo)()
            (arkanalyzer_1.ts.isNewExpression(parent) && parent.expression === current) ||
            // 展开运算符: [...obj?.foo]
            arkanalyzer_1.ts.isSpreadElement(parent) ||
            // 解构赋值的各种情况
            arkanalyzer_1.ts.isBindingElement(parent) ||
            // ts.isVariableDeclaration(parent) ||
            (arkanalyzer_1.ts.isBinaryExpression(parent) && parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken && arkanalyzer_1.ts.isBindingElement(parent.left)) ||
            // in 运算符: 1 in obj?.foo
            this.isUnsafeRelationalOperation(parent, current));
    }
    ;
    // 检查不安全的类继承
    isUnsafeHeritageExpression(parent) {
        let current = parent;
        let heritageParent = parent.parent;
        // 递归检查父节点，处理可能的括号表达式和await表达式
        while (heritageParent) {
            if (arkanalyzer_1.ts.isHeritageClause(heritageParent) &&
                heritageParent.token === arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword) {
                return true;
            }
            ;
            // 处理括号表达式
            if (arkanalyzer_1.ts.isParenthesizedExpression(heritageParent)) {
                current = heritageParent;
                heritageParent = heritageParent.parent;
                continue;
            }
            ;
            // 处理await表达式
            if (arkanalyzer_1.ts.isAwaitExpression(heritageParent)) {
                current = heritageParent;
                heritageParent = heritageParent.parent;
                continue;
            }
            ;
            // 处理类表达式
            if (arkanalyzer_1.ts.isClassExpression(heritageParent)) {
                current = heritageParent;
                heritageParent = heritageParent.parent;
                continue;
            }
            ;
            break;
        }
        ;
        return false;
    }
    // 检查不安全的 await 表达式
    isUnsafeAwaitExpression(parent) {
        // 检查 await 表达式
        let current = parent;
        let awaitParent = parent.parent;
        // 处理括号表达式，同时更新 current
        while (awaitParent && arkanalyzer_1.ts.isParenthesizedExpression(awaitParent)) {
            current = awaitParent;
            awaitParent = awaitParent.parent;
        }
        ;
        if (!awaitParent) {
            return false;
        }
        ;
        // 检查 await 表达式是否参与算术运算
        if (this.defaultOptions[0].disallowArithmeticOperators &&
            (this.isInvolvedInArithmeticOperation(awaitParent, parent) ||
                this.isInArithmeticAssignment(parent))) {
            this.message = this.messages.unsafeArithmetic;
            return true;
        }
        ;
        // 检查类继承
        if (this.isUnsafeHeritageExpression(awaitParent)) {
            return true;
        }
        ;
        // 检查 for...of 循环
        if (arkanalyzer_1.ts.isForOfStatement(awaitParent)) {
            return true;
        }
        ;
        // await 表达式后的不安全操作
        if ((arkanalyzer_1.ts.isCallExpression(awaitParent) && awaitParent.expression === parent.parent &&
            !(awaitParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            (arkanalyzer_1.ts.isPropertyAccessExpression(awaitParent) && awaitParent.expression === parent.parent &&
                !(awaitParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            (arkanalyzer_1.ts.isElementAccessExpression(awaitParent) && awaitParent.expression === parent.parent &&
                !(awaitParent.flags & arkanalyzer_1.ts.NodeFlags.OptionalChain)) ||
            arkanalyzer_1.ts.isVariableDeclaration(awaitParent) ||
            arkanalyzer_1.ts.isBindingElement(awaitParent) ||
            (arkanalyzer_1.ts.isBinaryExpression(awaitParent) &&
                awaitParent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken)) {
            return true;
        }
        ;
        // 检查二元表达式（比如 ||、&&）
        if (arkanalyzer_1.ts.isBinaryExpression(awaitParent)) {
            return this.checkBinaryExpressionUnsafeForAwait(current, awaitParent);
        }
        ;
        // 检查 await 表达式的父节点是否是 in 操作符的右侧
        return this.isUnsafeInOrInstanceOfOperation(awaitParent, parent);
    }
    ;
    // 专门处理 await 表达式在二元表达式中的情况
    checkBinaryExpressionUnsafeForAwait(current, parent) {
        let currentNode = current;
        let parentNode = parent;
        while (parentNode) {
            // 处理括号表达式
            if (arkanalyzer_1.ts.isParenthesizedExpression(parentNode)) {
                currentNode = parentNode;
                parentNode = parentNode.parent;
                continue;
            }
            ;
            if (!parentNode) {
                return false;
            }
            ;
            // 检查二元表达式
            if (arkanalyzer_1.ts.isBinaryExpression(parentNode)) {
                return this.checkBinaryExpression(currentNode, parentNode, current);
            }
            ;
            // 继续向上检查其他父节点
            currentNode = parentNode;
            parentNode = parentNode.parent;
        }
        ;
        return false;
    }
    checkBinaryExpression(currentNode, parentNode, current) {
        // 检查 in 或 instanceof 操作符
        if ((parentNode.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InKeyword ||
            parentNode.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InstanceOfKeyword) &&
            currentNode === parentNode.right || this.isDescendantOf(current, parentNode.right)) {
            // 只有当可选链在右侧时才不安全
            return true;
        }
        ;
        // 如果是逻辑运算符，且当前节点在右侧，继续向上检查
        if (this.isLogicalOperator(parentNode.operatorToken.kind) &&
            currentNode === parentNode.right || this.isDescendantOf(current, parentNode.right)) {
            if (arkanalyzer_1.ts.isParenthesizedExpression(parentNode.parent) && arkanalyzer_1.ts.isBinaryExpression(parentNode.parent.parent) &&
                !this.defaultOptions[0].disallowArithmeticOperators) {
                return false;
            }
            ;
            return true;
        }
        ;
        return false;
    }
    ;
    isInArithmeticAssignment(node) {
        let current = node;
        let parent = node.parent;
        // 处理括号表达式
        while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            parent = parent.parent;
        }
        ;
        if (!parent) {
            return false;
        }
        ;
        while (parent) {
            if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
                this.isArithmeticCompoundAssignment(parent.operatorToken.kind)) {
                // 如果可选节点的父节点是括号运算符，并且在祖先节点运算表达式的左侧
                if (arkanalyzer_1.ts.isParenthesizedExpression(node.parent) && arkanalyzer_1.ts.isBinaryExpression(node.parent.parent) &&
                    node.parent === node.parent.parent.left) {
                    return false;
                }
                ;
                return true;
            }
            ;
            current = parent;
            parent = parent.parent;
            // 继续处理外层的括号表达式
            while (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
                parent = parent.parent;
            }
            ;
        }
        ;
        return false;
    }
    ;
    // 检查是否参与算术运算
    isInvolvedInArithmeticOperation(parent, node) {
        if (!parent) {
            return false;
        }
        ;
        // 检查一元运算符
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(parent) || arkanalyzer_1.ts.isPostfixUnaryExpression(parent)) {
            const operatorKind = arkanalyzer_1.ts.isPrefixUnaryExpression(parent) ?
                parent.operator : parent.operator;
            return this.isArithmeticUnaryOperator(operatorKind);
        }
        ;
        // 检查复合赋值运算符
        if (arkanalyzer_1.ts.isBinaryExpression(parent) && this.isArithmeticCompoundAssignment(parent.operatorToken.kind)) {
            return true;
        }
        ;
        // 检查二元运算符
        if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            if (arkanalyzer_1.ts.isBinaryExpression(node.parent) && node === node.parent.left && node.parent !== parent) {
                return false;
            }
            else if (arkanalyzer_1.ts.isAwaitExpression(node.parent) && node === node.parent.expression &&
                (arkanalyzer_1.ts.isBinaryExpression(node.parent.parent) && node.parent === node.parent.parent.left)) {
                return false;
            }
            ;
            return this.isArithmeticBinaryOperator(parent.operatorToken.kind);
        }
        ;
        return false;
    }
    ;
    isArithmeticUnaryOperator(kind) {
        return kind === arkanalyzer_1.ts.SyntaxKind.PlusToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.MinusToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.PlusPlusToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.MinusMinusToken;
    }
    ;
    isArithmeticBinaryOperator(kind) {
        return kind === arkanalyzer_1.ts.SyntaxKind.PlusToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.MinusToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.AsteriskToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.SlashToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.PercentToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.AsteriskAsteriskToken;
    }
    ;
    isArithmeticCompoundAssignment(kind) {
        return kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.PercentEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.AsteriskAsteriskEqualsToken;
    }
    ;
    // 辅助方法：检查一个节点是否是另一个节点的后代
    isDescendantOf(node, possibleAncestor) {
        let current = node.parent;
        while (current) {
            if (current === possibleAncestor) {
                return true;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    }
    ;
    // 检查是否是逻辑运算符
    isLogicalOperator(kind) {
        return kind === arkanalyzer_1.ts.SyntaxKind.QuestionQuestionToken || // ??
            kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken || // ||
            kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken || // &&
            kind === arkanalyzer_1.ts.SyntaxKind.CommaToken; // ,操作符
    }
    ;
    // 检查是否是不安全的算术运算
    isUnsafeArithmeticOperation(node, parent) {
        if (!this.defaultOptions[0].disallowArithmeticOperators) {
            return false;
        }
        ;
        // 检查节点是否被空值合并操作符保护
        if (this.isProtectedByNullishCoalescing(node)) {
            return false;
        }
        ;
        // 检查是否是二元表达式
        if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            const operator = parent.operatorToken.getText();
            if (UNSAFE_ARITHMETIC_OPERATORS.has(operator) ||
                UNSAFE_ASSIGNMENT_OPERATORS.has(operator)) {
                return true;
            }
            ;
        }
        ;
        // 检查是否是前缀一元表达式
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(parent)) {
            const operator = parent.operator;
            return operator === arkanalyzer_1.ts.SyntaxKind.PlusToken ||
                operator === arkanalyzer_1.ts.SyntaxKind.MinusToken;
        }
        ;
        return this.checkParentUnsafeUsage(parent, node);
    }
    ;
    checkParentUnsafeUsage(parent, node) {
        let current = parent;
        let parentExpression = parent.parent;
        while (parentExpression) {
            // 处理括号表达式
            while (parentExpression && arkanalyzer_1.ts.isParenthesizedExpression(parentExpression)) {
                current = parentExpression;
                parentExpression = parentExpression.parent;
            }
            ;
            if (!parentExpression) {
                break;
            }
            ;
            // 检查是否参与了计算
            if (this.isInvolvedInArithmeticOperation(parentExpression, node)) {
                return true;
            }
            ;
            // 继续向上检查
            current = parentExpression;
            parentExpression = parentExpression.parent;
        }
        ;
        return false;
    }
    ;
    isProtectedByNullishCoalescing(node) {
        let current = node;
        let parent = node.parent;
        if (!parent) {
            return false;
        }
        ;
        while (parent) {
            // 检查括号表达式
            if (arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
                current = parent;
                parent = parent.parent;
                continue;
            }
            ;
            // 检查 await 表达式
            if (arkanalyzer_1.ts.isAwaitExpression(parent)) {
                current = parent;
                parent = parent.parent;
                continue;
            }
            ;
            // 检查二元表达式
            if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
                // 如果是空值合并操作符，且当前节点在左侧，则是安全的
                if (parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.QuestionQuestionToken &&
                    (current === parent.left || this.isDescendantOf(node, parent.left))) {
                    return true;
                }
                ;
                // 如果是逻辑运算符，且当前节点在右侧，继续向上检查
                if (this.isLogicalOperator(parent.operatorToken.kind) &&
                    (current === parent.right || this.isDescendantOf(node, parent.right))) {
                    current = parent;
                    parent = parent.parent;
                    continue;
                }
                ;
            }
            ;
            return false;
        }
        ;
        return false;
    }
    ;
    // 检查是否是不安全的比较运算
    isUnsafeRelationalOperation(parent, node) {
        if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            const operator = parent.operatorToken.getText();
            // 检查 in 操作符
            if (UNSAFE_RELATIONAL_OPERATORS.has(operator)) {
                return this.isUnsafeInOrInstanceOfOperation(parent, node);
            }
            ;
        }
        ;
        return false;
    }
    ;
    addIssueReport(warnInfo) {
        this.metaData.description = this.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, false);
        return defect;
    }
    ;
}
exports.NoUnsafeOptionalChainingCheck = NoUnsafeOptionalChainingCheck;
