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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoConfusingVoidExpressionCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const messages = {
    invalidVoidExpr: 'Placing a void expression inside another expression is forbidden. Move it to its own statement instead.',
    invalidVoidExprWrapVoid: 'Void expressions used inside another expression must be marked explicitly with the `void` operator.',
    invalidVoidExprArrow: 'Returning a void expression from an arrow function shorthand is forbidden. Please add braces to the arrow function.',
    invalidVoidExprArrowWrapVoid: 'Void expressions returned from an arrow function shorthand must be marked explicitly with the `void` operator.',
    invalidVoidExprReturn: 'Returning a void expression from a function is forbidden. Please move it before the `return` statement.',
    invalidVoidExprReturnLast: 'Returning a void expression from a function is forbidden. Please remove the `return` statement.',
    invalidVoidExprReturnWrapVoid: 'Void expressions returned from a function must be marked explicitly with the `void` operator.',
    voidExprWrapVoid: 'Mark with an explicit `void` operator.'
};
class NoConfusingVoidExpressionCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-confusing-void-expression.md',
        description: 'Require expressions of type void to appear in statement position'
    };
    rule;
    defects = [];
    issues = [];
    defaultOptions = [{}];
    config = {
        ignoreArrowShorthand: false,
        ignoreVoidOperator: false
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    // 定义需要检测的高风险函数名（可配置）
    VOID_FUNCTION_PATTERNS = new Set([
        'console.log', 'console.info', 'console.error', 'alert', 'setTimeout',
        'dispatchEvent', 'history.pushState', 'Array.forEach',
        'Promise.then', 'Array.map', 'console.error', 'forEach', 'super'
    ]);
    INVALID_ANCESTOR_TYPES = [
        lib_1.ts.SyntaxKind.ArrowFunction,
        lib_1.ts.SyntaxKind.ArrayLiteralExpression,
        lib_1.ts.SyntaxKind.ObjectLiteralExpression,
        lib_1.ts.SyntaxKind.VariableDeclaration,
        lib_1.ts.SyntaxKind.PropertyAssignment,
        lib_1.ts.SyntaxKind.CallExpression,
        lib_1.ts.SyntaxKind.VoidExpression,
        lib_1.ts.SyntaxKind.ComputedPropertyName,
        lib_1.ts.SyntaxKind.HeritageClause
    ];
    functionDeclarations = new Map();
    arrowFunctions = new Map();
    classMethods = new Map();
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        this.config.ignoreArrowShorthand = this.defaultOptions[0].ignoreArrowShorthand ?? false;
        this.config.ignoreVoidOperator = this.defaultOptions[0].ignoreVoidOperator ?? false;
        if (target instanceof lib_1.ArkFile) {
            this.checkVoidExpressions(target);
        }
        ;
    };
    collectFunctionDefinitions(node) {
        // 收集函数声明
        if (lib_1.ts.isFunctionDeclaration(node) && node.name) {
            this.functionDeclarations.set(node.name.text, node);
        }
        ;
        // 收集箭头函数（变量声明中的初始化）
        if (lib_1.ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach(decl => {
                if (decl.initializer && lib_1.ts.isArrowFunction(decl.initializer)) {
                    this.arrowFunctions.set(decl.name.getText(), decl.initializer);
                }
                else if (decl.initializer && (lib_1.ts.isFunctionExpression(decl.initializer) || lib_1.ts.isArrowFunction(decl.initializer))) {
                    const key = decl.name.getText();
                    this.functionDeclarations.set(key, decl.initializer);
                }
                ;
            });
        }
        ;
        // 收集类方法
        if (lib_1.ts.isClassDeclaration(node) && node.name) {
            const className = node.name.getText();
            node.members.forEach(member => {
                if (lib_1.ts.isMethodDeclaration(member) && member.name) {
                    const fullMethodName = `${className}.${member.name.getText()}`;
                    this.classMethods.set(fullMethodName, member);
                }
                ;
            });
        }
        ;
        lib_1.ts.forEachChild(node, this.collectFunctionDefinitions.bind(this));
    }
    ;
    getFunctionName = (node) => {
        const expr = node.expression;
        if (lib_1.ts.isPropertyAccessExpression(expr) && expr.questionDotToken) {
            return ''; // 标记为不匹配任何模式
        }
        ;
        if (lib_1.ts.isPropertyAccessExpression(expr)) {
            const objName = expr.expression.getText();
            const funcName = expr.name.text;
            return `${objName}.${funcName}`;
        }
        ;
        return expr.getText(); // 直接函数名
    };
    checkNewPromise(node, arkFile) {
        if (lib_1.ts.isIdentifier(node.expression) && node.expression.text === 'Promise' && node.arguments?.[0]) {
            const executor = node.arguments[0];
            if (lib_1.ts.isFunctionExpression(executor) || lib_1.ts.isArrowFunction(executor)) {
                // 递归遍历所有嵌套函数
                this.checkPromiseExecutor(executor, arkFile);
            }
            ;
        }
        ;
    }
    ;
    // 遍历函数体，检查是否存在直接调用resolve或reject的语句
    checkSyncResolve = (node, arkFile, resolveParamName, rejectParamName, isInExecutorDirectScope = false) => {
        if (lib_1.ts.isCallExpression(node) && lib_1.ts.isIdentifier(node.expression) &&
            (node.expression.text === resolveParamName || node.expression.text === rejectParamName)) {
            const args = node.arguments;
            if (args.length > 0 && args[0].kind === lib_1.ts.SyntaxKind.AwaitExpression) {
                return;
            }
            ;
            this.checkInvalidContext(node, arkFile);
        }
        ;
        if (lib_1.ts.isCallExpression(node)) {
            let funcExpr = node.expression;
            while (lib_1.ts.isParenthesizedExpression(funcExpr)) {
                funcExpr = funcExpr.expression;
            }
            ;
            // 检查是否是函数表达式调用：如 (function(){}()) 或 (async () => {})()
            if (lib_1.ts.isFunctionExpression(funcExpr) || lib_1.ts.isArrowFunction(funcExpr)) {
                // 递归检查IIFE的函数体
                this.checkSyncResolve(funcExpr.body, arkFile, resolveParamName, rejectParamName, false);
            }
        }
        ;
        if (lib_1.ts.isAwaitExpression(node)) {
            lib_1.ts.forEachChild(node, child => this.checkSyncResolve(child, arkFile, resolveParamName, rejectParamName, false));
            return;
        }
        ;
        // 递归遍历所有嵌套函数
        let childScopeFlag = isInExecutorDirectScope;
        if (lib_1.ts.isFunctionLike(node)) {
            childScopeFlag = false;
            const node1 = node;
            // 对嵌套的函数体进行递归检查
            if (node1.body) {
                lib_1.ts.forEachChild(node1.body, child => this.checkSyncResolve(child, arkFile, resolveParamName, rejectParamName, false));
            }
            ;
        }
        else {
            lib_1.ts.forEachChild(node, child => this.checkSyncResolve(child, arkFile, resolveParamName, rejectParamName, childScopeFlag));
        }
        ;
    };
    checkPromiseExecutor(executor, arkFile) {
        // 获取resolve和reject的参数名（可能是任意名称，如res, rej）
        const resolveParamName = executor.parameters[0]?.name.getText();
        const rejectParamName = executor.parameters[1]?.name.getText();
        if (executor.body) {
            this.checkSyncResolve(executor.body, arkFile, resolveParamName, rejectParamName, true);
        }
        ;
    }
    ;
    checkArrowFunction = (node, arkFile) => {
        const body = node.body;
        const isVoidBody = lib_1.ts.isCallExpression(body)
            ? this.VOID_FUNCTION_PATTERNS.has(this.getFunctionName(body))
            : lib_1.ts.isVoidExpression(body);
        if (isVoidBody) {
            this.checkInvalidContext(body, arkFile);
        }
        ;
    };
    checkClassDeclaration = (node, arkFile) => {
        this.checkClassHeritage(node, arkFile);
    };
    checkVoidExpressions(arkFile) {
        const methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.collectFunctionDefinitions(methodAst); // 收集所有函数定义
        const checkNode = (node) => {
            if (lib_1.ts.isVoidExpression(node)) {
                this.checkInvalidContext(node, arkFile);
            }
            else if (lib_1.ts.isCallExpression(node)) {
                checkCallExpression(node);
            }
            else if (lib_1.ts.isTaggedTemplateExpression(node)) {
                this.checkTaggedTemplate(node, arkFile);
            }
            else if (lib_1.ts.isArrowFunction(node) && !lib_1.ts.isBlock(node.body)) {
                this.checkArrowFunction(node, arkFile);
            }
            else if (lib_1.ts.isClassDeclaration(node)) {
                this.checkClassDeclaration(node, arkFile);
            }
            else if (lib_1.ts.isNewExpression(node)) {
                this.checkNewPromise(node, arkFile);
            }
            lib_1.ts.forEachChild(node, checkNode);
        };
        const checkCallExpression = (node) => {
            const funcName = this.getFunctionName(node);
            let isVoidFunction = this.VOID_FUNCTION_PATTERNS.has(funcName);
            const isInsideReturn = this.isInsideReturnStatement(node); // 检查是否在return语句中
            isVoidFunction = this.processLocalFunc(funcName, node) ? true : isVoidFunction;
            if (isVoidFunction && (isInsideReturn || this.isInsideExpression(node))) {
                this.checkInvalidContext(node, arkFile);
            }
            ;
            if (isVoidFunction || (funcName.includes('.forEach') && this.isParentVoidOrReturn(node))) {
                this.checkInvalidContext(node, arkFile);
                checkArguments(node);
            }
            ;
            this.checkIifeWithCall(node, arkFile);
        };
        const checkArguments = (node) => {
            node.arguments.forEach(arg => {
                if (lib_1.ts.isFunctionLike(arg)) {
                    lib_1.ts.forEachChild(arg, checkNode);
                }
                ;
            });
        };
        checkNode(methodAst);
    }
    ;
    processLocalFunc(funcName, node) {
        const localFunc = this.functionDeclarations.get(funcName) || this.arrowFunctions.get(funcName) || this.classMethods.get(funcName);
        return (localFunc && this.isFunctionReturningVoid(localFunc) && node.expression.getText() !== 'RegExp') ||
            (lib_1.ts.isPropertyAccessExpression(node.expression) && node.expression.questionDotToken && !this.isDotChainDepthnMoreDepth(node.expression));
    }
    ;
    isDotChainDepthnMoreDepth(node) {
        let dotChainDepth = 0;
        let currentExpr = node;
        // 遍历整个属性访问链统计可选链数量
        while (lib_1.ts.isPropertyAccessExpression(currentExpr)) {
            dotChainDepth++;
            currentExpr = currentExpr.expression;
        }
        ;
        if (dotChainDepth >= 2) {
            return true;
        }
        ;
        return false;
    }
    ;
    isParentVoidOrReturn(node) {
        return lib_1.ts.isReturnStatement(node.parent) || lib_1.ts.isVoidExpression(node.parent);
    }
    ;
    checkTaggedTemplate(node, arkFile) {
        const func = node.tag;
        // 判断标签函数是否返回void
        if (lib_1.ts.isFunctionExpression(func) && this.isFunctionReturningVoid(func)) {
            // 检查是否处于非法上下文中
            this.checkInvalidContext(node, arkFile);
        }
        ;
    }
    ;
    // 辅助方法：检查是否在表达式上下文中
    isInsideExpression(node) {
        const invalidAncestors = [
            lib_1.ts.SyntaxKind.BinaryExpression,
            lib_1.ts.SyntaxKind.ConditionalExpression,
            lib_1.ts.SyntaxKind.ArrayLiteralExpression,
            lib_1.ts.SyntaxKind.ObjectLiteralExpression,
            lib_1.ts.SyntaxKind.PropertyAccessExpression,
            lib_1.ts.SyntaxKind.CallExpression,
            lib_1.ts.SyntaxKind.ElementAccessExpression
        ];
        let parent = node.parent;
        while (parent) {
            if (invalidAncestors.includes(parent.kind)) {
                return true;
            }
            ;
            if (lib_1.ts.isCallExpression(parent) && parent.questionDotToken) {
                return true;
            }
            ;
            parent = parent.parent;
        }
        ;
        return false;
    }
    ;
    // 检查是否在return语句内部
    isInsideReturnStatement(node) {
        let parent = node.parent;
        while (parent) {
            if (lib_1.ts.isReturnStatement(parent)) {
                return true;
            }
            ;
            parent = parent.parent;
        }
        ;
        return false;
    }
    ;
    isFunctionReturningVoid(funcNode) {
        // 显式返回类型为void
        if (funcNode.type?.kind === lib_1.ts.SyntaxKind.VoidKeyword) {
            return true;
        }
        ;
        if (!funcNode.body) {
            return true;
        }
        ;
        // 函数体无return或所有return无值
        let hasReturnWithValue = false;
        const checkReturnStatements = (node) => {
            if (lib_1.ts.isReturnStatement(node)) {
                hasReturnWithValue = node.expression !== undefined;
            }
            ;
            lib_1.ts.forEachChild(node, checkReturnStatements);
        };
        if (funcNode.body) {
            if (lib_1.ts.isBlock(funcNode.body)) {
                funcNode.body.statements.forEach(checkReturnStatements);
            }
            else {
                // 箭头函数简写：() => expression
                hasReturnWithValue = !this.isVoidTypeExpression(funcNode.body);
            }
            ;
        }
        ;
        const checkReturns = (n) => {
            if (lib_1.ts.isReturnStatement(n)) {
                // 排除 void 0 和 undefined 的返回
                if (n.expression &&
                    !lib_1.ts.isVoidExpression(n.expression) &&
                    !(lib_1.ts.isIdentifier(n.expression) && n.expression.text === 'undefined')) {
                    hasReturnWithValue = true;
                }
                ;
            }
            ;
            lib_1.ts.forEachChild(n, checkReturns);
        };
        lib_1.ts.forEachChild(funcNode.body, checkReturns);
        return !hasReturnWithValue;
    }
    checkIifeWithCall(node, arkFile) {
        // 检测是否是 .call() 调用
        if (!lib_1.ts.isPropertyAccessExpression(node.expression) ||
            node.expression.name.text !== 'call') {
            return;
        }
        ;
        // 检测第一个参数是否是 this
        if (node.arguments.length === 0) {
            return;
        }
        ;
        const firstArg = node.arguments[0];
        const isThisArg = firstArg.kind === lib_1.ts.SyntaxKind.ThisKeyword || // 处理直接使用 this 关键字
            (lib_1.ts.isIdentifier(firstArg) && firstArg.text === 'this'); // 处理变量名为 this 的情况
        if (!isThisArg) {
            return;
        }
        ;
        // 确认调用主体是函数表达式
        const funcExpr = node.expression.expression;
        if (!lib_1.ts.isFunctionExpression(funcExpr) &&
            !lib_1.ts.isArrowFunction(funcExpr)) {
            return;
        }
        ;
        // 判断函数体是否无返回值
        if (!this.functionHasReturnValue(funcExpr)) {
            this.markVoidExpression(node, arkFile);
        }
        ;
    }
    ;
    functionHasReturnValue(func) {
        if (lib_1.ts.isBlock(func.body)) {
            let hasReturnWithValue = false;
            func.body.statements.forEach(stmt => {
                if (lib_1.ts.isReturnStatement(stmt) && stmt.expression) {
                    hasReturnWithValue = true;
                }
            });
            return hasReturnWithValue;
        }
        else {
            // 处理箭头函数简写：() => expression
            return !this.isVoidTypeExpression(func.body);
        }
        ;
    }
    ;
    isVoidTypeExpression(expr) {
        return lib_1.ts.isVoidExpression(expr) ||
            lib_1.ts.isCallExpression(expr) &&
                !this.hasOptionalChain(expr) &&
                this.VOID_FUNCTION_PATTERNS.has(this.getFunctionName(expr));
    }
    ;
    hasOptionalChain(node) {
        let expr = node.expression;
        while (lib_1.ts.isPropertyAccessExpression(expr)) {
            if (expr.questionDotToken) {
                return true;
            }
            ;
            expr = expr.expression;
        }
        ;
        return false;
    }
    ;
    // 检查上下文是否非法
    checkInvalidContext = (node, arkFile) => {
        if (lib_1.ts.isVoidExpression(node) && this.isAllowedVoidContext(node)) {
            return;
        }
        ;
        // 跳过 void 0 的特殊处理
        if (lib_1.ts.isVoidExpression(node) &&
            lib_1.ts.isNumericLiteral(node.expression) &&
            node.expression.text === '0') {
            return;
        }
        if (lib_1.ts.isVoidExpression(node.parent)) {
            if (this.config.ignoreVoidOperator) {
                return;
            }
            ;
        }
        ;
        if (lib_1.ts.isVoidExpression(node) && lib_1.ts.isCallExpression(node.expression)) {
            const funcName = this.getFunctionName(node.expression);
            if (this.VOID_FUNCTION_PATTERNS.has(funcName) && this.config.ignoreVoidOperator) {
                return;
            }
            ;
        }
        ;
        const invalidAncestor = this.findInvalidAncestor(node);
        if (!invalidAncestor) {
            return;
        }
        ;
        // 当配置忽略箭头简写且祖先为箭头函数时跳过检测
        if (lib_1.ts.isArrowFunction(invalidAncestor) && this.config.ignoreArrowShorthand) {
            return;
        }
        ;
        if (lib_1.ts.isArrowFunction(invalidAncestor) && this.config.ignoreVoidOperator) {
            if (this.config.ignoreVoidOperator) {
                return;
            }
            ;
        }
        ;
        // 过滤特殊表达式
        if (this.specialExpression(invalidAncestor, node)) {
            return;
        }
        ;
        this.createIssue(node, invalidAncestor, arkFile);
    };
    specialExpression(invalidAncestor, node) {
        const invalidAncestorText = invalidAncestor.getText();
        const nodeText = node.getText();
        if (invalidAncestorText === `-${nodeText}`) {
            return true;
        }
        ;
        if (!lib_1.ts.isCallExpression(invalidAncestor)) {
            return false;
        }
        ;
        const args = invalidAncestor.arguments ?? [];
        if (args.length > 0 && lib_1.ts.isFunctionExpression(args[0])) {
            return true;
        }
        ;
        return false;
    }
    ;
    isLastStatementInFunction(node) {
        let funcBody = node.parent;
        if (lib_1.ts.isBlock(funcBody) && lib_1.ts.isIfStatement(funcBody.parent)) {
            funcBody = funcBody.parent.parent;
        }
        ;
        return lib_1.ts.isBlock(funcBody) &&
            funcBody.statements[funcBody.statements.length - 1] === node;
    }
    generateFixCode(node, invalidAncestor, nodeText) {
        let fixCode;
        let messageId = 'invalidVoidExpr';
        if (lib_1.ts.isArrowFunction(invalidAncestor)) {
            const frontText = invalidAncestor.getText().replace(/=>.*$/, '');
            const bodyText = invalidAncestor.body.getText();
            const exist = bodyText.endsWith(';');
            if (this.config.ignoreVoidOperator) {
                messageId = 'invalidVoidExprArrowWrapVoid';
                fixCode = `${frontText}=> void ${bodyText}${exist ? '' : ';'}`;
            }
            else {
                messageId = 'invalidVoidExprArrow';
                fixCode = `${frontText}=> { ${bodyText}${exist ? '' : ';'} }`;
            }
            ;
        }
        else if (lib_1.ts.isReturnStatement(invalidAncestor)) {
            messageId = this.returnStatementFixCode(invalidAncestor, nodeText, messageId, fixCode).messageId;
            fixCode = this.returnStatementFixCode(invalidAncestor, nodeText, messageId, fixCode).fixCode;
        }
        else if (lib_1.ts.isBinaryExpression(invalidAncestor)) {
            messageId = this.config.ignoreVoidOperator
                ? 'invalidVoidExprWrapVoid'
                : 'invalidVoidExpr';
            fixCode = this.config.ignoreVoidOperator
                ? `void ${nodeText}`
                : `${nodeText};`;
        }
        ;
        return { fixCode: fixCode ? `${fixCode}` : undefined, messageId };
    }
    ;
    returnStatementFixCode(invalidAncestor, nodeText, messageId, fixCode) {
        const isLastStatement = this.isLastStatementInFunction(invalidAncestor);
        messageId = isLastStatement ? 'invalidVoidExprReturnLast' : 'invalidVoidExprReturn';
        if (invalidAncestor.expression && lib_1.ts.isConditionalExpression(invalidAncestor.expression)) {
            const { condition, whenTrue, whenFalse } = invalidAncestor.expression;
            const conditionVar = this.getConditionVariable(condition);
            const isUndefinedVar = conditionVar ? this.isVariableUndefined(conditionVar) : false;
            if (isUndefinedVar) {
                const isLastStatement = this.isLastStatementInFunction(invalidAncestor);
                messageId = isLastStatement ? 'invalidVoidExprReturnLast' : 'invalidVoidExprReturn';
                fixCode = this.config.ignoreVoidOperator
                    ? `void ${whenTrue.getText()}`
                    : `${whenTrue.getText()}; return ${whenFalse.getText()}`;
            }
            else {
                return { fixCode: undefined, messageId: 'invalidVoidExprReturn' };
            }
        }
        else if (invalidAncestor.expression && lib_1.ts.isBinaryExpression(invalidAncestor.expression) &&
            invalidAncestor.expression?.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken) {
            fixCode = undefined;
        }
        else {
            const result = lib_1.ts.isIfStatement(invalidAncestor.parent) && !invalidAncestor.getText().includes('{');
            fixCode = isLastStatement ? nodeText : (result ? `{ ${nodeText}; return; }` : `${nodeText}; return;`);
        }
        ;
        return { fixCode: fixCode ? `${fixCode}` : undefined, messageId };
    }
    ;
    getConditionVariable(condition) {
        // 处理简单标识符条件（如：myVar）
        if (lib_1.ts.isIdentifier(condition)) {
            return condition;
        }
        // 处理二元表达式（如：myVar != null）
        if (lib_1.ts.isBinaryExpression(condition)) {
            return this.getIdentifierFromBinaryExpression(condition);
        }
        return undefined;
    }
    getIdentifierFromBinaryExpression(expr) {
        // 递归查找左侧或右侧的标识符
        if (lib_1.ts.isIdentifier(expr.left)) {
            return expr.left;
        }
        ;
        if (lib_1.ts.isBinaryExpression(expr.left)) {
            return this.getIdentifierFromBinaryExpression(expr.left);
        }
        ;
        if (lib_1.ts.isIdentifier(expr.right)) {
            return expr.right;
        }
        ;
        if (lib_1.ts.isBinaryExpression(expr.right)) {
            return this.getIdentifierFromBinaryExpression(expr.right);
        }
        ;
        return undefined;
    }
    isVariableUndefined(varNode) {
        const declaration = this.findVariableDeclaration(varNode);
        if (!declaration) {
            return false;
        }
        ;
        if (declaration.initializer &&
            (declaration.initializer.kind === lib_1.ts.SyntaxKind.UndefinedKeyword ||
                declaration.initializer.kind === lib_1.ts.SyntaxKind.VoidExpression)) {
            return true;
        }
        ;
        if (declaration.initializer && declaration.initializer.kind === lib_1.ts.SyntaxKind.Identifier &&
            declaration.initializer.getText() === 'undefined') {
            return true;
        }
        ;
        // 检查类型注解是否为undefined
        if (declaration.type?.kind === lib_1.ts.SyntaxKind.UndefinedKeyword) {
            return true;
        }
        ;
        return false;
    }
    findVariableDeclaration(varNode) {
        const targetName = varNode.text;
        let current = varNode;
        // 定位到最近的作用域边界（Function/Block）
        while (current.parent && !lib_1.ts.isBlock(current) && !lib_1.ts.isFunctionLike(current.parent)) {
            current = current.parent;
        }
        ;
        // 递归搜索作用域内的变量声明
        const searchScope = (node) => {
            if (lib_1.ts.isVariableDeclaration(node) && this.checkDeclarationName(node.name, targetName)) {
                return node;
            }
            let found;
            lib_1.ts.forEachChild(node, child => {
                const result = searchScope(child);
                if (result) {
                    found = result;
                }
                ;
            });
            return found;
        };
        return searchScope(current);
    }
    ;
    checkDeclarationName(nameNode, targetName) {
        if (lib_1.ts.isIdentifier(nameNode)) {
            return nameNode.text === targetName;
        }
        ;
        const elements = lib_1.ts.isObjectBindingPattern(nameNode)
            ? nameNode.elements
            : nameNode.elements;
        return elements.some(element => {
            if (lib_1.ts.isBindingElement(element)) {
                return element.name.getText() === targetName;
            }
            return false;
        });
    }
    selectMessageId(invalidAncestor) {
        if (lib_1.ts.isArrowFunction(invalidAncestor)) {
            return this.config.ignoreVoidOperator
                ? 'invalidVoidExprArrowWrapVoid'
                : 'invalidVoidExprArrow';
        }
        if (lib_1.ts.isReturnStatement(invalidAncestor)) {
            return this.config.ignoreVoidOperator
                ? 'invalidVoidExprReturnWrapVoid'
                : 'invalidVoidExprReturn';
        }
        return this.config.ignoreVoidOperator
            ? 'invalidVoidExprWrapVoid'
            : 'invalidVoidExpr';
    }
    ;
    checkClassHeritage(node, arkFile) {
        const checkClause = (clause) => {
            clause.types.forEach(type => {
                if (lib_1.ts.isExpressionWithTypeArguments(type) &&
                    lib_1.ts.isCallExpression(type.expression)) {
                    this.checkSuperCall(type.expression, arkFile);
                }
            });
        };
        // 检测 extends 继承表达式
        if (node.heritageClauses) {
            node.heritageClauses.forEach(clause => {
                checkClause(clause);
            });
        }
        ;
        // 检测计算属性名中的 super()
        node.members.forEach(member => {
            if (lib_1.ts.isPropertyDeclaration(member) &&
                member.name &&
                lib_1.ts.isComputedPropertyName(member.name)) {
                this.checkComputedProperty(member.name.expression, arkFile);
            }
        });
    }
    ;
    checkSuperCall(node, arkFile) {
        if (node.expression.kind === lib_1.ts.SyntaxKind.SuperKeyword) {
            this.markVoidExpression(node, arkFile);
        }
        ;
    }
    ;
    checkComputedProperty(expr, arkFile) {
        if (lib_1.ts.isPropertyAccessExpression(expr) &&
            lib_1.ts.isCallExpression(expr.expression) &&
            expr.expression?.expression?.kind === lib_1.ts.SyntaxKind.SuperKeyword) {
            this.markVoidExpression(expr.expression, arkFile);
        }
        ;
    }
    ;
    markVoidExpression(node, arkFile) {
        const sourceFile = node.getSourceFile();
        const start = node.getStart();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
        let messageId = 'invalidVoidExpr';
        const resultIssue = {
            line: line + 1,
            column: character + 1,
            columnEnd: character + node.getWidth() + 1,
            message: messages[messageId],
            filePath: arkFile.getFilePath() ?? ''
        };
        this.addIssueReport(resultIssue);
    }
    ;
    createIssue(node, invalidAncestor, arkFile) {
        const sourceFile = node.getSourceFile();
        const start = node.getStart();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
        const nodeText = sourceFile.text.substring(start, node.getEnd());
        const { fixCode, messageId } = this.generateFixCode(node, invalidAncestor, node.getText());
        const resultIssue = {
            line: line + 1,
            column: character + 1,
            columnEnd: character + nodeText.length + 1,
            message: messages[messageId],
            filePath: arkFile.getFilePath() ?? '',
            fixCode: fixCode
        };
        let ruleFix;
        if (lib_1.ts.isArrowFunction(invalidAncestor) || lib_1.ts.isReturnStatement(invalidAncestor)) {
            ruleFix = fixCode ? this.createFix(invalidAncestor.getStart(), invalidAncestor.getEnd(), fixCode) : undefined;
        }
        ;
        this.addIssueReport(resultIssue, ruleFix);
    }
    ;
    createFix(line, column, code) {
        return { range: [line, column], text: code };
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
    handleLogical(parent, node, isExplicitVoid) {
        const binaryParent = parent;
        // 完全复制原始代码逻辑
        if (this.config.ignoreVoidOperator) {
            if (this.isWrappedByVoid(binaryParent)) {
                return null;
            }
            ;
            if (binaryParent.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken &&
                binaryParent.right === node &&
                !lib_1.ts.isVoidExpression(node)) {
                return binaryParent;
            }
            ;
            return isExplicitVoid(node) ? null : binaryParent;
        }
        ;
        // 严格保留原始嵌套检查逻辑
        let isNested = false;
        let ancestor = binaryParent.parent;
        while (ancestor) {
            if (lib_1.ts.isBinaryExpression(ancestor) && this.isLogicalOperator(ancestor)) {
                isNested = true;
                break;
            }
            ;
            ancestor = ancestor.parent;
        }
        ;
        if (isNested || !lib_1.ts.isExpressionStatement(binaryParent.parent)) {
            let currentParent = binaryParent.parent;
            while (currentParent) {
                if (this.INVALID_ANCESTOR_TYPES.includes(currentParent.kind)) {
                    return currentParent;
                }
                ;
                currentParent = currentParent.parent;
            }
            ;
            return binaryParent;
        }
        ;
        return !lib_1.ts.isExpressionStatement(binaryParent.parent)
            ? binaryParent
            : undefined;
    }
    ;
    isLogicalOperator(node) {
        return node.operatorToken.kind === lib_1.ts.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken;
    }
    ;
    checkReturnStatement(parent, node, isExplicitVoid) {
        if (!lib_1.ts.isReturnStatement(parent)) {
            return undefined;
        }
        ;
        const returnExpr = parent.expression;
        if (returnExpr && lib_1.ts.isBinaryExpression(returnExpr) && returnExpr.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken) {
            let current = node;
            while (current.parent !== returnExpr) {
                current = current.parent;
            }
            ;
            if (current === returnExpr.left) {
                return null;
            }
            ;
        }
        ;
        return this.config.ignoreVoidOperator
            ? (isExplicitVoid(node) ? null : parent)
            : parent;
    }
    ;
    isWrappedByVoid(n) {
        let current = n;
        while (current) {
            if (lib_1.ts.isVoidExpression(current)) {
                return true;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    }
    ;
    isWrappedByExplicitVoid = (n) => lib_1.ts.isVoidExpression(n);
    // 检查节点是否被显式 void 包裹（自身或任何祖先）
    isExplicitVoid = (n) => {
        let current = n;
        while (current) {
            if (lib_1.ts.isVoidExpression(current)) {
                return true;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    };
    shouldSkipFunctionCheck(node) {
        if (node.arguments.length === 0) {
            return false;
        }
        ;
        if (!lib_1.ts.isArrowFunction(node.arguments[0])) {
            return false;
        }
        ;
        const node1 = node.arguments[0];
        const asyncAPIs = ['setTimeout', 'setInterval', 'requestAnimationFrame'];
        // 检查函数体是否包含目标模式
        if (lib_1.ts.isBlock(node1.body)) {
            return node1.body.statements.some(statement => {
                return lib_1.ts.isExpressionStatement(statement) &&
                    lib_1.ts.isCallExpression(statement.expression) &&
                    asyncAPIs.includes(node.expression.getText());
            });
        }
        ;
        return false;
    }
    ;
    // 查找非法祖先节点（与之前逻辑类似，但不再依赖类型）
    findInvalidAncestor(node) {
        if (this.skipSpecificPatterns(node) || this.checkVoidZero(node)) {
            return null;
        }
        ;
        let parent = node.parent;
        while (parent) {
            if (this.isVoidExpressionWithZero(node, parent)) {
                return null;
            }
            ;
            if (lib_1.ts.isReturnStatement(parent)) {
                const result = this.checkReturnStatement(parent, node, this.isExplicitVoid);
                if (result !== undefined) {
                    return result;
                }
                ;
            }
            ;
            if (this.isCoalesceExpression(parent, node)) {
                return parent;
            }
            ;
            if (this.isLogicalExpression(parent, node)) {
                const result = this.handleLogical(parent, node, this.isExplicitVoid);
                if (result !== undefined) {
                    return result;
                }
                ;
            }
            ;
            if (lib_1.ts.isComputedPropertyName(parent) || lib_1.ts.isHeritageClause(parent)) {
                if (lib_1.ts.isPropertyAccessExpression(node) && node.expression.kind === lib_1.ts.SyntaxKind.SuperKeyword) {
                    return parent;
                }
                ;
            }
            ;
            const conditionalResult = this.handleConditionalExpression(parent, node);
            if (conditionalResult !== undefined) {
                return conditionalResult;
            }
            if (lib_1.ts.isParenthesizedExpression(parent)) {
                parent = parent.parent;
                continue;
            }
            ;
            if (lib_1.ts.isPrefixUnaryExpression(parent)) {
                return this.handlePrefixUnaryExpression(parent, node);
            }
            ;
            if (lib_1.ts.isExpressionStatement(parent) && !parent.getText().includes('await')) {
                return null;
            }
            ;
            if (this.isInvalidAncestorType(parent)) {
                return this.handleInvalidAncestorType(parent);
            }
            ;
            parent = parent.parent;
        }
        ;
        return null;
    }
    ;
    handleConditionalExpression(parent, node) {
        if (!lib_1.ts.isConditionalExpression(parent)) {
            return undefined;
        }
        if (this.config.ignoreVoidOperator) {
            const bothVoid = lib_1.ts.isVoidExpression(parent.whenTrue) && lib_1.ts.isVoidExpression(parent.whenFalse);
            return bothVoid ? null : (this.isExplicitVoid(parent) ? null : parent);
        }
        return parent.condition === node ? parent : undefined;
    }
    // 提取初始条件判断
    skipSpecificPatterns(node) {
        return (lib_1.ts.isCallExpression(node) && this.shouldSkipFunctionCheck(node)) ||
            (lib_1.ts.isCallExpression(node) && lib_1.ts.isBinaryExpression(node.parent) &&
                lib_1.ts.isParenthesizedExpression(node.parent.parent) &&
                lib_1.ts.isAwaitExpression(node.parent.parent.parent));
    }
    ;
    // 提取 void 0 检测
    checkVoidZero(node) {
        return lib_1.ts.isVoidExpression(node) &&
            lib_1.ts.isNumericLiteral(node.expression) &&
            node.expression.text === '0';
    }
    ;
    isAllowedVoidContext(node) {
        const parent = node.parent;
        if (lib_1.ts.isPrefixUnaryExpression(parent) &&
            parent.operator === lib_1.ts.SyntaxKind.ExclamationToken) { // !
            return true;
        }
        ;
        // 允许数组字面量中的 void 表达式
        if (lib_1.ts.isArrayLiteralExpression(parent)) {
            return true;
        }
        ;
        // 允许变量声明初始化中的 void
        if (lib_1.ts.isVariableDeclaration(parent) && parent.initializer === node) {
            return true;
        }
        ;
        // 允许类型注释为 undefined 的变量声明
        if (lib_1.ts.isVariableDeclaration(parent)) {
            const typeNode = parent.type;
            if (typeNode && typeNode.getText() === 'undefined') {
                return true;
            }
            ;
        }
        ;
        // 允许导出声明中的 void
        if (lib_1.ts.isExportAssignment(parent) || (lib_1.ts.isVariableDeclarationList(parent.parent) &&
            lib_1.ts.isVariableStatement(parent.parent.parent) &&
            parent.parent.parent.modifiers?.some(m => m.kind === lib_1.ts.SyntaxKind.ExportKeyword))) {
            return true;
        }
        ;
        return false;
    }
    isVoidExpressionWithZero(node, parent) {
        return lib_1.ts.isVoidExpression(node) && node.expression.getText() === '0' && lib_1.ts.isVariableDeclaration(parent);
    }
    ;
    isCoalesceExpression(parent, node) {
        return lib_1.ts.isBinaryExpression(parent) && parent.operatorToken.kind === lib_1.ts.SyntaxKind.QuestionQuestionToken &&
            this.config.ignoreVoidOperator && parent.right === node && !this.isExplicitVoid(node) && !this.isWrappedByExplicitVoid(parent);
    }
    ;
    isLogicalExpression(parent, node) {
        return lib_1.ts.isBinaryExpression(parent) && this.isLogicalOperator(parent);
    }
    ;
    handlePrefixUnaryExpression(parent, node) {
        const unaryParent = parent;
        // 特殊处理逻辑非操作符
        if (unaryParent.operator === lib_1.ts.SyntaxKind.ExclamationToken &&
            lib_1.ts.isCallExpression(node) && lib_1.ts.isPropertyAccessExpression(node.expression) &&
            lib_1.ts.isPropertyAccessExpression(node.expression.expression)) {
            return null; // 标记为合法上下文
        }
        ;
        if (this.config.ignoreVoidOperator) {
            return this.isExplicitVoid(node) ? null : parent;
        }
        ;
        return parent;
    }
    ;
    isInvalidAncestorType(parent) {
        return this.INVALID_ANCESTOR_TYPES.includes(parent.kind);
    }
    ;
    handleInvalidAncestorType(parent) {
        if (this.config.ignoreVoidOperator && lib_1.ts.isVariableDeclaration(parent)) {
            return null;
        }
        ;
        return parent;
    }
    ;
}
exports.NoConfusingVoidExpressionCheck = NoConfusingVoidExpressionCheck;
