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
exports.RequireAwaitCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const arkanalyzer_1 = require("arkanalyzer");
const gmetaData = {
    severity: 2,
    ruleDocPath: "docs/require-await.md",
    description: "Disallow async functions which have no `await` expression."
};
;
class RequireAwaitCheck {
    symbolTable = new Map();
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check.bind(this)
        };
        return [matchFileCb];
    }
    ;
    check = (arkFile) => {
        const filePath = arkFile.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        // 构建符号表
        this.buildSymbolTable(sourceFile);
        this.checkNode(sourceFile, filePath, arkFile);
    };
    checkNode(node, filePath, arkFile) {
        // 检查当前节点是否为异步函数
        if (this.isAsyncFunction(node)) {
            this.processAsyncFunction(node, filePath, arkFile);
        }
        ;
        lib_1.ts.forEachChild(node, child => this.checkNode(child, filePath, arkFile));
    }
    ;
    /**
     * 处理异步函数
     */
    processAsyncFunction(node, filePath, arkFile) {
        const scopeInfo = {
            upper: null,
            hasAwait: false,
            hasAsync: true,
            isGen: this.isGeneratorFunction(node),
            isAsyncYield: false
        };
        // 检查是否需要报告缺少await的问题
        if (this.shouldReportMissingAwait(node, scopeInfo, arkFile)) {
            this.reportDefect(filePath, node);
        }
        ;
    }
    ;
    /**
     * 检查是否应该报告缺少await的问题
     */
    shouldReportMissingAwait(node, scopeInfo, arkFile) {
        const returnsPromise = this.checkFunctionReturnsPromise(node, arkFile);
        if (returnsPromise) {
            return false;
        }
        ;
        const hasAwait = this.hasAwaitExpression(node);
        if (hasAwait) {
            return false;
        }
        ;
        if (this.isEmptyFunction(node)) {
            return false;
        }
        ;
        if (scopeInfo.isGen && scopeInfo.isAsyncYield) {
            return false;
        }
        ;
        // 处理异步生成器特殊情况
        if (scopeInfo.isGen && this.isAsyncFunction(node)) {
            if (this.hasSpecialYieldExpressions(node, arkFile)) {
                return false;
            }
            ;
        }
        ;
        return true;
    }
    ;
    /**
     * 检查异步生成器函数中是否有特殊的yield表达式
     * 包括：yield* source, yield Promise, yield asyncFunction
     */
    hasSpecialYieldExpressions(node, arkFile) {
        const body = this.getFunctionBody(node);
        if (!body || !lib_1.ts.isBlock(body)) {
            return false;
        }
        for (const statement of body.statements) {
            if (lib_1.ts.isExpressionStatement(statement)) {
                const expression = statement.expression;
                if (this.hasYieldPromise(expression, arkFile)) {
                    return true;
                }
                ;
                if (this.hasYieldStarSource(expression, node, arkFile)) {
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
    hasYieldPromise(expression, arkFile) {
        if (lib_1.ts.isYieldExpression(expression) && expression.expression) {
            const yieldExpr = expression.expression;
            if (this.isPromiseExpression(yieldExpr)) {
                return true;
            }
            ;
            if (lib_1.ts.isCallExpression(yieldExpr)) {
                return this.isPromiseCall(yieldExpr, arkFile);
            }
            ;
        }
        ;
        return false;
    }
    ;
    hasYieldStarSource(expression, node, arkFile) {
        if (lib_1.ts.isYieldExpression(expression) && expression.asteriskToken) {
            const source = expression.expression;
            if (source) {
                if (this.isPromiseExpression(source)) {
                    return true;
                }
                ;
                if (lib_1.ts.isCallExpression(source)) {
                    return this.isPromiseCall(source, arkFile);
                }
                ;
                if (lib_1.ts.isIdentifier(source)) {
                    return this.isValidSourceIdentifier(source, node);
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    isPromiseCall(callExpr, arkFile) {
        const funcName = callExpr.expression.getText();
        const definition = this.symbolTable.get(funcName);
        if (definition) {
            if (lib_1.ts.isVariableDeclaration(definition)) {
                if (this.hasPromiseInVarDecl(definition, arkFile)) {
                    return true;
                }
                ;
            }
            ;
            if (this.isAsyncFunction(definition) || this.returnsPromiseType(definition)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    hasPromiseInVarDecl(definition, arkFile) {
        if (definition.initializer) {
            const funcBody = this.getFunctionBody(definition.initializer);
            if (funcBody && lib_1.ts.isBlock(funcBody)) {
                return this.containsExplicitPromiseReturn(funcBody, arkFile);
            }
            ;
        }
        else if (definition.type) {
            const typeText = definition.type.getText();
            return typeText.includes('Promise') || typeText.includes('Thenable');
        }
        ;
        return false;
    }
    ;
    isValidSourceIdentifier(source, node) {
        const param = this.findParameter(node, source.text);
        if (param && (this.isAsyncIterableParameter(param) || this.isCustomTypeParameter(param))) {
            return true;
        }
        ;
        const varDecl = this.symbolTable.get(source.text);
        if (varDecl && lib_1.ts.isVariableDeclaration(varDecl) && varDecl.type) {
            const typeText = varDecl.type.getText();
            return typeText.includes('Omit') && typeText.includes('Symbol.asyncIterator');
        }
        ;
        return false;
    }
    ;
    /**
     * 检查参数是否为自定义类型
     */
    isCustomTypeParameter(param) {
        if (!param.type) {
            return false;
        }
        ;
        const typeText = param.type.getText();
        return !typeText.includes('AsyncIterable') && !typeText.includes('Promise');
    }
    ;
    /**
     * 查找函数参数
     */
    findParameter(node, paramName) {
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node) || lib_1.ts.isArrowFunction(node)) {
            return node.parameters.find(param => lib_1.ts.isIdentifier(param.name) && param.name.text === paramName);
        }
        ;
        return undefined;
    }
    ;
    /**
     * 检查参数类型是否为AsyncIterable
     */
    isAsyncIterableParameter(param) {
        if (!param.type) {
            return false;
        }
        ;
        const typeText = param.type.getText();
        return typeText.includes('AsyncIterable');
    }
    ;
    /**
     * 检查是否为异步函数
     */
    isAsyncFunction(node) {
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isArrowFunction(node) || lib_1.ts.isMethodDeclaration(node)) {
            return node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword) ?? false;
        }
        ;
        return false;
    }
    ;
    /**
     * 检查是否为生成器函数
     */
    isGeneratorFunction(node) {
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isMethodDeclaration(node)) {
            return node.asteriskToken !== undefined;
        }
        ;
        return false;
    }
    ;
    getFunctionBody(node) {
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isMethodDeclaration(node) || lib_1.ts.isArrowFunction(node)) {
            return node.body;
        }
        ;
        return undefined;
    }
    ;
    isEmptyFunction(node) {
        const body = this.getFunctionBody(node);
        if (body && lib_1.ts.isBlock(body)) {
            return body.statements.length === 0;
        }
        ;
        return false;
    }
    ;
    /**
     * 检查函数体中是否包含await表达式
     */
    hasAwaitExpression(node) {
        const body = this.getFunctionBody(node);
        if (!body) {
            return true; // 如果没有函数体，不需要await
        }
        ;
        return this.containsAwait(body);
    }
    ;
    /**
     * 检查表达式是否是Promise相关表达式
     */
    isPromiseExpression(node) {
        if (lib_1.ts.isCallExpression(node) && lib_1.ts.isPropertyAccessExpression(node.expression)) {
            const objName = node.expression.expression.getText();
            return objName === 'Promise';
        }
        ;
        if (lib_1.ts.isNewExpression(node) && lib_1.ts.isIdentifier(node.expression)) {
            return node.expression.text === 'Promise';
        }
        ;
        const nodeText = node.getText();
        return nodeText.includes('Promise');
    }
    ;
    /**
     * 检查函数返回类型是否为Promise
     */
    returnsPromiseType(node) {
        const isValidNode = lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isArrowFunction(node);
        if (isValidNode && node.type) {
            const typeText = node.type.getText();
            return typeText.includes('Promise') || typeText.includes('Thenable');
        }
        ;
        return false;
    }
    ;
    /**
     * 递归检查节点中是否包含await表达式
     */
    containsAwait(node) {
        if (lib_1.ts.isAwaitExpression(node)) {
            return true;
        }
        ;
        if (this.isFunction(node)) {
            return false;
        }
        ;
        let hasAwait = false;
        node.forEachChild(child => {
            if (this.containsAwait(child)) {
                hasAwait = true;
            }
            ;
        });
        return hasAwait;
    }
    ;
    /**
     * 检查节点是否为函数
     */
    isFunction(node) {
        return lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isArrowFunction(node) ||
            lib_1.ts.isMethodDeclaration(node);
    }
    ;
    /**
     * 检查函数是否返回Promise
     */
    checkFunctionReturnsPromise(node, arkFile) {
        const body = this.getFunctionBody(node);
        if (!body) {
            return false;
        }
        ;
        if (lib_1.ts.isCallExpression(body)) {
            const experience = body.expression.getText();
            const definition = this.symbolTable.get(experience);
            if (definition && lib_1.ts.isVariableDeclaration(definition) && definition.initializer) {
                const funcBody = this.getFunctionBody(definition.initializer);
                if (funcBody && lib_1.ts.isBlock(funcBody)) {
                    return this.containsExplicitPromiseReturn(funcBody, arkFile);
                }
            }
            ;
        }
        ;
        if (lib_1.ts.isArrowFunction(node) && !lib_1.ts.isBlock(body)) {
            return this.isPromiseExpression(body);
        }
        ;
        if (lib_1.ts.isBlock(body)) {
            return this.containsExplicitPromiseReturn(body, arkFile);
        }
        ;
        return false;
    }
    ;
    /**
     * 检查块中是否包含返回Promise的语句
     */
    containsExplicitPromiseReturn(block, arkFile) {
        let hasPromiseReturn = false;
        const visitNode = (node) => {
            if (!this.isReturnWithPromise(node, arkFile)) {
                lib_1.ts.forEachChild(node, visitNode);
                return;
            }
            ;
            hasPromiseReturn = true;
        };
        visitNode(block);
        return hasPromiseReturn;
    }
    ;
    /**
     * 检查Return语句是否返回Promise
     */
    isReturnWithPromise(node, arkFile) {
        if (!lib_1.ts.isReturnStatement(node) || !node.expression) {
            return false;
        }
        ;
        if (lib_1.ts.isCallExpression(node.expression)) {
            const funcName = node.expression.expression.getText();
            const definition = this.symbolTable.get(funcName);
            if (definition && lib_1.ts.isVariableDeclaration(definition) && definition.initializer) {
                const funcBody = this.getFunctionBody(definition.initializer);
                if (funcBody && lib_1.ts.isBlock(funcBody)) {
                    return this.containsExplicitPromiseReturn(funcBody, arkFile);
                }
            }
            ;
        }
        ;
        if (this.isPromiseExpression(node.expression)) {
            return true;
        }
        ;
        return this.isPromiseFunctionCall(node.expression);
    }
    ;
    /**
     * 检查函数调用是否返回Promise
     */
    isPromiseFunctionCall(expression) {
        if (!lib_1.ts.isCallExpression(expression)) {
            return false;
        }
        ;
        if (lib_1.ts.isIdentifier(expression.expression)) {
            const funcName = expression.expression.text;
            const definition = this.symbolTable.get(funcName);
            if (definition) {
                return this.isAsyncFunction(definition) || this.returnsPromiseType(definition);
            }
            ;
        }
        ;
        return true;
    }
    ;
    buildSymbolTable(sourceFile) {
        const visit = (node) => {
            if (lib_1.ts.isVariableDeclaration(node)) {
                const name = node.name.getText();
                this.symbolTable.set(name, node);
            }
            else if (lib_1.ts.isFunctionDeclaration(node)) {
                const name = node.name?.getText();
                if (name) {
                    this.symbolTable.set(name, node);
                }
                ;
            }
            else if (lib_1.ts.isClassDeclaration(node)) {
                const name = node.name?.getText();
                if (name) {
                    this.symbolTable.set(name, node);
                }
                ;
            }
            else if (lib_1.ts.isArrowFunction(node)) {
                const parent = node.parent;
                if (lib_1.ts.isVariableDeclaration(parent)) {
                    const name = parent.name.getText();
                    this.symbolTable.set(name, node);
                }
                ;
            }
            ;
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    ;
    getFunctionPosition(node) {
        const pos = node.getStart();
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        let startLine = line + 1;
        let startColumn = character + 1;
        let endColumn = startColumn + 5; // "async"关键字的长度
        if (this.isAsyncFunction(node)) {
            const text = node.getText();
            const asyncIndex = text.indexOf('async');
            if (asyncIndex > -1) {
                startColumn = startColumn + asyncIndex;
                endColumn = startColumn + 5;
            }
            ;
        }
        ;
        if (lib_1.ts.isArrowFunction(node)) {
            const arrowIndex = node.getText().indexOf('=>');
            if (arrowIndex > 0) {
                startColumn = startColumn + arrowIndex;
            }
            ;
        }
        ;
        return { startLine, startColumn, endColumn };
    }
    ;
    getFunctionName(node) {
        if (lib_1.ts.isFunctionDeclaration(node) && node.name) {
            return node.name.text;
        }
        ;
        if (lib_1.ts.isMethodDeclaration(node) && lib_1.ts.isIdentifier(node.name)) {
            return node.name.text;
        }
        ;
        // 箭头函数或函数表达式
        if (lib_1.ts.isArrowFunction(node) || lib_1.ts.isFunctionExpression(node)) {
            const parent = node.parent;
            if (parent && lib_1.ts.isVariableDeclaration(parent) && lib_1.ts.isIdentifier(parent.name)) {
                return parent.name.text;
            }
            ;
        }
        ;
        return '';
    }
    ;
    generateErrorMessage(node) {
        const functionName = this.getFunctionName(node);
        const isArrowFunction = lib_1.ts.isArrowFunction(node);
        const isFunctionExpression = lib_1.ts.isFunctionExpression(node);
        const isGenerator = this.isGeneratorFunction(node);
        // 根据函数类型和名称选择消息
        if (isGenerator) {
            return functionName ?
                `Async generator function '${functionName}' has no 'await' expression.` :
                "Async generator function has no 'await' expression.";
        }
        ;
        if (isArrowFunction) {
            return functionName ?
                `Async arrow function '${functionName}' has no 'await' expression.` :
                "Async arrow function has no 'await' expression.";
        }
        ;
        if (isFunctionExpression) {
            return functionName ?
                `Async function '${functionName}' has no 'await' expression.` :
                "Async function has no 'await' expression.";
        }
        ;
        return functionName ?
            `Async function '${functionName}' has no 'await' expression.` :
            "Async function has no 'await' expression.";
    }
    ;
    reportDefect(filePath, node) {
        const { startLine, startColumn, endColumn } = this.getFunctionPosition(node);
        const message = this.generateErrorMessage(node);
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(startLine, startColumn, endColumn, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
}
exports.RequireAwaitCheck = RequireAwaitCheck;
;
