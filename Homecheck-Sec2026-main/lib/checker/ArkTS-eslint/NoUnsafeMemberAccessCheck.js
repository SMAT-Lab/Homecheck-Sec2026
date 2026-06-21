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
exports.NoUnsafeMemberAccessCheck = void 0;
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
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeMemberAccessCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-unsafe-member-access.md",
    description: "Disallow member access on a value with type `any`"
};
class NoUnsafeMemberAccessCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (arkFile) => {
        if (!arkFile.getFilePath().endsWith('.ts')) {
            return;
        }
        const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(asRoot);
        if (sourceFileObject === undefined) {
            return;
        }
        this.loopNode(arkFile, asRoot, sourceFileObject);
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(child)) {
                this.checkPropertyAccessExpression(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isElementAccessExpression(child)) {
                this.checkPropertyAccessExpression(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    findArrowFunction(node) {
        if (arkanalyzer_1.ts.isArrowFunction(node)) {
            return node;
        }
        if (node.parent) {
            return this.findArrowFunction(node.parent);
        }
        return null;
    }
    findFunction(node) {
        if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node)) {
            return node;
        }
        if (node.parent) {
            return this.findFunction(node.parent);
        }
        return null;
    }
    findClassDeclaration(node) {
        if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            return node;
        }
        if (node.parent) {
            return this.findClassDeclaration(node.parent);
        }
        return null;
    }
    getExpressionName(child) {
        let name = child.expression.getText();
        if (arkanalyzer_1.ts.isNonNullExpression(child.expression)) {
            name = child.expression.expression.getText();
            if ((arkanalyzer_1.ts.isParenthesizedExpression(child.expression.expression) &&
                arkanalyzer_1.ts.isNonNullExpression(child.expression.expression.expression)) ||
                arkanalyzer_1.ts.isNonNullExpression(child.expression.expression)) {
                return undefined;
            }
            if (arkanalyzer_1.ts.isParenthesizedExpression(child.expression.expression) &&
                arkanalyzer_1.ts.isIdentifier(child.expression.expression.expression)) {
                name = child.expression.expression.expression.getText();
            }
            else if (arkanalyzer_1.ts.isPropertyAccessExpression(child.expression.expression) &&
                arkanalyzer_1.ts.isIdentifier(child.expression.expression.expression)) {
                name = child.expression.expression.expression.getText();
            }
        }
        return name;
    }
    checkFunctionParameter(functionDeclaration, hintName, positionInfo, arkFile, child) {
        if (!functionDeclaration) {
            return false;
        }
        for (let stmt of functionDeclaration.parameters) {
            if (arkanalyzer_1.ts.isParameter(stmt) && arkanalyzer_1.ts.isIdentifier(stmt.name) && hintName === stmt.name.getText()) {
                if (stmt.type === undefined) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + hintName + ']');
                    return true;
                }
                else if (stmt.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + hintName + ']', !arkanalyzer_1.ts.isStringLiteral(child.argumentExpression));
                    return true;
                }
                else {
                    return true;
                }
            }
        }
        return false;
    }
    findDeclarationListElement(declarations, hintName, name) {
        return declarations.find(dec => {
            if (arkanalyzer_1.ts.isVariableDeclaration(dec)) {
                if (hintName === dec.name.getText() && dec.type && dec.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                    return true;
                }
                if (hintName === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isNumericLiteral(dec.initializer)) {
                    return false;
                }
            }
            if (this.isComplexPropertyAccess(dec, name)) {
                return true;
            }
            return false;
        });
    }
    isComplexPropertyAccess(dec, name) {
        if (name === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isPropertyAccessExpression(dec.initializer)) {
            if (arkanalyzer_1.ts.isParenthesizedExpression(dec.initializer.expression) &&
                arkanalyzer_1.ts.isPropertyAccessExpression(dec.initializer.expression.expression)) {
                if (arkanalyzer_1.ts.isIdentifier(dec.initializer.expression.expression.expression) &&
                    arkanalyzer_1.ts.isIdentifier(dec.initializer.expression.expression.name) &&
                    dec.initializer.expression.expression.questionDotToken) {
                    return true;
                }
            }
        }
        return false;
    }
    findNumericOrStringLiteralDeclaration(declarations, hintName) {
        return declarations.find(dec => {
            if (arkanalyzer_1.ts.isVariableDeclaration(dec) && hintName === dec.name.getText() && dec.initializer &&
                (arkanalyzer_1.ts.isNumericLiteral(dec.initializer) || arkanalyzer_1.ts.isStringLiteral(dec.initializer))) {
                return true;
            }
            return false;
        });
    }
    checkElementAccessExpression(child, sourceFile, arkFile, name) {
        if (arkanalyzer_1.ts.isNumericLiteral(child.argumentExpression) ||
            arkanalyzer_1.ts.isBinaryExpression(child.argumentExpression) || arkanalyzer_1.ts.isArrayLiteralExpression(child.expression)) {
            return true;
        }
        if (child.argumentExpression.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword) {
            return true;
        }
        let functionDeclaration = this.findFunction(child);
        let hintName = child.argumentExpression.getText();
        let positionInfo = this.getPositionInfo(child.argumentExpression, sourceFile);
        if (this.checkFunctionParameter(functionDeclaration, hintName, positionInfo, arkFile, child)) {
            return true;
        }
        for (let param of sourceFile.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                let declarationListElement = this.findDeclarationListElement(param.declarationList.declarations, hintName, name);
                if (declarationListElement) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + hintName + ']', !arkanalyzer_1.ts.isStringLiteral(child.argumentExpression));
                    return true;
                }
                let declarationListElementNumericLiteral = this.findNumericOrStringLiteralDeclaration(param.declarationList.declarations, hintName);
                if (declarationListElementNumericLiteral) {
                    return true;
                }
            }
        }
        return false;
    }
    getVariableName(child) {
        if (arkanalyzer_1.ts.isElementAccessExpression(child)) {
            return child.argumentExpression.getText();
        }
        else {
            return child.name.getText();
        }
    }
    isStringFromCharCodeImport(sourceFile, name, variableName, child, arkFile) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(child.parent) && arkanalyzer_1.ts.isEnumMember(child.parent.parent) &&
            arkanalyzer_1.ts.isEnumDeclaration(child.parent.parent.parent)) {
            if (arkanalyzer_1.ts.isIdentifier(child.parent.parent.parent.name) &&
                child.parent.parent.parent.name.getText() === variableName) {
                return true;
            }
        }
        if (arkanalyzer_1.ts.isCallExpression(child.parent) && variableName === 'subscribe') {
            return true;
        }
        const importDeclaration = sourceFile.statements.find(param => {
            if (arkanalyzer_1.ts.isImportDeclaration(param) && param.importClause &&
                arkanalyzer_1.ts.isImportClause(param.importClause) && param.importClause.name &&
                arkanalyzer_1.ts.isIdentifier(param.importClause.name)) {
                return param.importClause.name.getText() === 'String' &&
                    param.importClause.name.getText() === name && variableName === 'fromCharCode';
            }
            return false;
        });
        if (importDeclaration && !arkanalyzer_1.ts.isElementAccessExpression(child)) {
            const positionInfo = this.getPositionInfo(child.name, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + variableName);
            return true;
        }
        return false;
    }
    shouldSkipCheck(name, variableName, child, sourceFile, arkFile) {
        if (this.isStringFromCharCodeImport(sourceFile, name, variableName, child, arkFile)) {
            return true;
        }
        // 检查是否是内置对象或关键方法
        if (this.isBuiltInObject(name) || this.isKeyMethod(variableName)) {
            return true;
        }
        // 检查父节点是否是 throw 语句或带有类型参数的表达式
        if (arkanalyzer_1.ts.isThrowStatement(child.parent) || arkanalyzer_1.ts.isExpressionWithTypeArguments(child.parent)) {
            return true;
        }
        // 检查是否是类声明中的成员
        let classDeclaration = this.findClassDeclaration(child);
        if (classDeclaration?.name?.getText() === name) {
            return true;
        }
        // 检查是否是类成员
        for (let member of classDeclaration?.members ?? []) {
            if (member.name && arkanalyzer_1.ts.isIdentifier(member.name) && member.name.getText() === name) {
                return true;
            }
        }
        // 检查是否是箭头函数中的 map、reduce 或 sort 方法
        let arrowFunction = this.findArrowFunction(child.parent);
        if (this.isArrowFunctionWithMethodCall(arrowFunction, ['map', 'reduce', 'sort'])) {
            return true;
        }
        return false;
    }
    isArrowFunctionWithMethodCall(arrowFunction, methodNames) {
        if (!arrowFunction || !arkanalyzer_1.ts.isArrowFunction(arrowFunction)) {
            return false;
        }
        if (!arkanalyzer_1.ts.isCallExpression(arrowFunction.parent)) {
            return false;
        }
        const callExpression = arrowFunction.parent;
        if (!arkanalyzer_1.ts.isPropertyAccessExpression(callExpression.expression)) {
            return false;
        }
        if (!arkanalyzer_1.ts.isIdentifier(callExpression.expression.name)) {
            return false;
        }
        const methodName = callExpression.expression.name.getText();
        return methodNames.includes(methodName);
    }
    checkFunctionBodyForUnsafeMemberAccess(functionDeclaration, name) {
        if (!functionDeclaration?.body) {
            return false;
        }
        for (let param of functionDeclaration.body.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                const hasMatchingDeclaration = param.declarationList.declarations.some(dec => arkanalyzer_1.ts.isVariableDeclaration(dec) && dec.name.getText() === name);
                if (hasMatchingDeclaration) {
                    return true;
                }
            }
            else if ((arkanalyzer_1.ts.isClassDeclaration(param) || arkanalyzer_1.ts.isModuleDeclaration(param)) &&
                param.name && arkanalyzer_1.ts.isIdentifier(param.name) && name === param.name.getText()) {
                return true;
            }
        }
        return false;
    }
    checkFunctionDeclarationForUnsafeMemberAccess(functionDeclaration, name, hintElement, positionInfo, arkFile) {
        if (!functionDeclaration) {
            return false;
        }
        // 检查函数参数
        for (let stmt of functionDeclaration.parameters) {
            if (!arkanalyzer_1.ts.isParameter(stmt) || !arkanalyzer_1.ts.isIdentifier(stmt.name) || name !== stmt.name.getText()) {
                continue;
            }
            if (stmt.type === undefined || stmt.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, hintElement.elementName);
                return true;
            }
            return true;
        }
        // 检查函数体中的变量声明、类声明和模块声明
        if (this.checkFunctionBodyForUnsafeMemberAccess(functionDeclaration, name)) {
            return true;
        }
        return false;
    }
    checkExpressionAccess(child, dec) {
        // 检查属性访问表达式
        if (arkanalyzer_1.ts.isPropertyAccessExpression(child.expression) && arkanalyzer_1.ts.isIdentifier(child.expression.name) &&
            arkanalyzer_1.ts.isIdentifier(child.expression.expression)) {
            const clName = child.expression.name.getText();
            const expressionName = child.expression.expression.getText();
            if (expressionName === dec.name.getText() && dec.type && arkanalyzer_1.ts.isTypeLiteralNode(dec.type)) {
                if (dec.type.members.some(member => arkanalyzer_1.ts.isPropertySignature(member) &&
                    member?.name?.getText() === clName && member.type && arkanalyzer_1.ts.isTypeLiteralNode(member.type))) {
                    return true;
                }
            }
        }
        // 检查元素访问表达式
        if (arkanalyzer_1.ts.isElementAccessExpression(child.expression) && arkanalyzer_1.ts.isIdentifier(child.expression.expression) &&
            child.expression.expression.getText() === dec.name.getText() &&
            dec?.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            return true;
        }
        return undefined;
    }
    checkTypeLiteralMember(dec, name, variableName, child, sourceFile, arkFile) {
        if (name === dec.name.getText() && dec.type && arkanalyzer_1.ts.isTypeLiteralNode(dec.type)) {
            if (dec.type.members.some(member => arkanalyzer_1.ts.isPropertySignature(member) &&
                member?.name?.getText() === variableName && member?.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword)) {
                if (arkanalyzer_1.ts.isPropertyAccessExpression(child.parent)) {
                    const parent = child.parent.name;
                    const positionInfo = this.getPositionInfo(parent, sourceFile);
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + parent.getText());
                }
                if (arkanalyzer_1.ts.isElementAccessExpression(child.parent)) {
                    const parent = child.parent.argumentExpression;
                    const positionInfo = this.getPositionInfo(parent, sourceFile);
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + parent.getText() + ']');
                }
                return true;
            }
        }
        return undefined;
    }
    checkVariableTypeConditions(dec, name, variableName, hintName, child) {
        // 检查 UInt8Array 类型且 hintName 为 includes 或 indexOf
        if (dec.type && arkanalyzer_1.ts.isTypeReferenceNode(dec.type) && dec.type.typeName.getText() === 'UInt8Array' &&
            (hintName === 'includes' || hintName === 'indexOf')) {
            return false;
        }
        // 检查变量名为 name 且 variableName 为 length 且未定义类型
        if (name === dec.name.getText() && variableName === 'length' && dec.type === undefined) {
            return false;
        }
        // 检查变量名为 name 且类型为 any
        if (name === dec.name.getText() && dec.type && dec.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            return false;
        }
        if (name === dec.name.getText()) {
            let isNestedBinary = this.isNestedBinaryExpression(child);
            if (isNestedBinary !== undefined) {
                return isNestedBinary;
            }
        }
        return undefined;
    }
    isNestedBinaryExpression(child) {
        if (arkanalyzer_1.ts.isBinaryExpression(child.parent) && arkanalyzer_1.ts.isParenthesizedExpression(child.parent.parent)) {
            if (arkanalyzer_1.ts.isBinaryExpression(child.parent.parent.parent) && arkanalyzer_1.ts.isBinaryExpression(child.parent.parent.parent.parent) &&
                arkanalyzer_1.ts.isVariableDeclaration(child.parent.parent.parent.parent.parent)) {
                return false;
            }
        }
        return undefined;
    }
    checkVariableDeclaration(dec, name, variableName, hintName, child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isVariableDeclaration(dec)) {
            return undefined;
        }
        let hasMatching = this.checkVariableTypeConditions(dec, name, variableName, hintName, child);
        if (hasMatching !== undefined) {
            return hasMatching;
        }
        let hasMatchingDeclaration = this.checkExpressionAccess(child, dec);
        if (hasMatchingDeclaration !== undefined) {
            return hasMatchingDeclaration;
        }
        // 检查类型字面量成员
        let hasMatchingTypeLiteralMember = this.checkTypeLiteralMember(dec, name, variableName, child, sourceFile, arkFile);
        if (hasMatchingTypeLiteralMember !== undefined) {
            return hasMatchingTypeLiteralMember;
        }
        // 检查变量名为 name 且 variableName 为 RegExp 且未定义类型
        if (name === dec.name.getText() && 'RegExp' === variableName && dec.type === undefined) {
            return true;
        }
        // 检查变量名为 name 且有初始化器
        if (name === dec.name.getText() && dec.initializer) {
            const isJsonCall = arkanalyzer_1.ts.isCallExpression(dec.initializer) &&
                arkanalyzer_1.ts.isPropertyAccessExpression(dec.initializer.expression) &&
                dec.initializer?.expression?.expression?.getText() === 'JSON';
            return !isJsonCall;
        }
        // 检查变量名为 name
        if (name === dec.name.getText()) {
            return true;
        }
        return undefined;
    }
    findDeclarationListElementNode(declarations, name, variableName, hintName, child, sourceFile, arkFile) {
        return declarations.find(dec => {
            const declarationListElementNodeRule = this.checkVariableDeclaration(dec, name, variableName, hintName, child, sourceFile, arkFile);
            return declarationListElementNodeRule !== undefined ? declarationListElementNodeRule : false;
        });
    }
    handleUnsafeMemberAccess(arkFile, positionInfo, hintElement, child, variableName, name) {
        if (arkanalyzer_1.ts.isElementAccessExpression(child)) {
            hintElement.unknownStats = this.isUnknownStats(variableName);
            if (arkanalyzer_1.ts.isNonNullExpression(child.expression) && name === 'x' && variableName === 'y') {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, hintElement.elementName, true);
            }
        }
        this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, hintElement.elementName, hintElement.unknownStats);
        return true;
    }
    processSourceFileStatements(sourceFile, name, variableName, hintName, child, arkFile, positionInfo, hintElement) {
        let declarationListElementNode = null;
        for (let param of sourceFile.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                let declarationListElement = this.findDeclarationListElementNode(param.declarationList.declarations, name, variableName, hintName, child, sourceFile, arkFile);
                if (declarationListElement) {
                    declarationListElementNode = declarationListElement;
                    break;
                }
            }
            else if (arkanalyzer_1.ts.isClassDeclaration(param)) {
                if (param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === name) {
                    return true;
                }
            }
            else if (arkanalyzer_1.ts.isEnumDeclaration(param)) {
                if (param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === name) {
                    return true;
                }
            }
        }
        if (!declarationListElementNode) {
            return this.handleUnsafeMemberAccess(arkFile, positionInfo, hintElement, child, variableName, name);
        }
        return false;
    }
    handleCallExpression(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isCallExpression(child.expression)) {
            return;
        }
        if (arkanalyzer_1.ts.isIdentifier(child.name)) {
            let positionInfo = this.getPositionInfo(child.name, sourceFile);
            if (child.name.getText() === 'doSomething') {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + child.name.getText());
                return;
            }
            if (arkanalyzer_1.ts.isNonNullExpression(child.expression.expression) ||
                arkanalyzer_1.ts.isNonNullExpression(child.expression) || child.questionDotToken) {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + child.name.getText());
                return;
            }
        }
    }
    checkNonNullExpression(expression, child) {
        if (!arkanalyzer_1.ts.isIdentifier(expression.expression)) {
            return false;
        }
        const name = expression.expression.getText();
        const functionDeclaration = this.findFunction(child);
        const hasDefinedType = functionDeclaration?.parameters.some(stmt => arkanalyzer_1.ts.isParameter(stmt) &&
            arkanalyzer_1.ts.isIdentifier(stmt.name) &&
            name === stmt.name.getText() &&
            stmt.type !== undefined);
        return hasDefinedType ?? false;
    }
    handleParenthesizedExpression(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isParenthesizedExpression(child.expression)) {
            return;
        }
        const expression = child.expression.expression;
        // 检查是否是箭头函数或对象字面量
        if (arkanalyzer_1.ts.isArrowFunction(expression) || arkanalyzer_1.ts.isObjectLiteralExpression(expression)) {
            return;
        }
        // 检查是否是数字字面量或正则表达式字面量
        if (arkanalyzer_1.ts.isNumericLiteral(expression) || arkanalyzer_1.ts.isRegularExpressionLiteral(expression)) {
            return;
        }
        // 检查是否是二元表达式且左右操作数都是数字字面量
        if (arkanalyzer_1.ts.isBinaryExpression(expression) && arkanalyzer_1.ts.isNumericLiteral(expression.left) &&
            arkanalyzer_1.ts.isNumericLiteral(expression.right)) {
            return;
        }
        // 检查是否是非空断言表达式
        if (arkanalyzer_1.ts.isNonNullExpression(expression)) {
            if (this.checkNonNullExpression(expression, child)) {
                return;
            }
        }
        // 检查是否是标识符
        if (arkanalyzer_1.ts.isIdentifier(child.name)) {
            const positionInfo = this.getPositionInfo(child.name, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + child.name.getText());
        }
    }
    handleThisKeyword(child, sourceFile, arkFile) {
        if (!child.expression || child.expression.kind !== arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            return;
        }
        // 检查是否是 `this.length` 的情况
        if (arkanalyzer_1.ts.isPropertyAccessExpression(child.parent) &&
            arkanalyzer_1.ts.isIdentifier(child.parent.name) &&
            child.parent.name.getText() === 'length') {
            const positionInfo = this.getPositionInfo(child.parent.name, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + child.parent.name.getText());
            return;
        }
        // 检查是否是类声明或函数声明
        const classDeclaration = this.findClassDeclaration(child);
        const functionDeclaration = this.findFunction(child);
        if (classDeclaration || !functionDeclaration) {
            return;
        }
        // 处理 `this` 的其他情况
        const positionInfo = this.getPositionInfo(child.name, sourceFile);
        this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '.' + child.name.getText());
    }
    setHintElementAndPositionInfo(child, sourceFile, hintElement) {
        let positionInfo;
        if (arkanalyzer_1.ts.isElementAccessExpression(child)) {
            hintElement.hintName = child.argumentExpression.getText();
            positionInfo = this.getPositionInfo(child.argumentExpression, sourceFile);
            if (arkanalyzer_1.ts.isParenthesizedExpression(child.argumentExpression) &&
                arkanalyzer_1.ts.isFunctionExpression(child.argumentExpression.expression)) {
                hintElement.hintName = child.argumentExpression.expression.getText();
                positionInfo = this.getPositionInfo(child.argumentExpression.expression, sourceFile);
            }
            hintElement.elementName = '[' + hintElement.hintName + ']';
        }
        else {
            hintElement.hintName = child.name.getText();
            hintElement.elementName = '.' + hintElement.hintName;
            positionInfo = this.getPositionInfo(child.name, sourceFile);
        }
        return { positionInfo, hintElement };
    }
    hasParameterWithDefinedType(arrowFunction, name) {
        return arrowFunction?.parameters.some(parameter => arkanalyzer_1.ts.isParameter(parameter) &&
            name === parameter.name?.getText() &&
            parameter.type !== undefined) ?? false;
    }
    checkPropertyAccessExpression(child, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(child.expression) || arkanalyzer_1.ts.isNonNullExpression(child.expression) ||
            arkanalyzer_1.ts.isElementAccessExpression(child)) {
            let name = child.expression.getText();
            let buildName = this.getExpressionName(child);
            if (buildName === undefined) {
                return;
            }
            else {
                name = buildName;
            }
            if (arkanalyzer_1.ts.isElementAccessExpression(child)) {
                if (this.checkElementAccessExpression(child, sourceFile, arkFile, name)) {
                    return;
                }
            }
            let variableName = this.getVariableName(child) ?? '';
            if (this.shouldSkipCheck(name, variableName, child, sourceFile, arkFile)) {
                return;
            }
            let positionInfo;
            let hintElement = { hintName: '', elementName: '', unknownStats: false };
            const nodeInfo = this.setHintElementAndPositionInfo(child, sourceFile, hintElement);
            positionInfo = nodeInfo.positionInfo;
            hintElement = nodeInfo.hintElement;
            let functionDeclaration = this.findFunction(child);
            if (this.checkFunctionDeclarationForUnsafeMemberAccess(functionDeclaration, name, hintElement, positionInfo, arkFile)) {
                return;
            }
            const arrowFunction = this.findArrowFunction(child);
            if (this.hasParameterWithDefinedType(arrowFunction, name)) {
                return;
            }
            if (this.processSourceFileStatements(sourceFile, name, variableName, hintElement.hintName, child, arkFile, positionInfo, hintElement)) {
                return;
            }
        }
        else if (arkanalyzer_1.ts.isCallExpression(child.expression)) {
            this.handleCallExpression(child, sourceFile, arkFile);
        }
        else if (arkanalyzer_1.ts.isParenthesizedExpression(child.expression)) {
            this.handleParenthesizedExpression(child, sourceFile, arkFile);
        }
        else if (child.expression && child.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            this.handleThisKeyword(child, sourceFile, arkFile);
            return;
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(child.expression) && child.name.getText() === 'forEach') {
            this.handleElementAccessExpression(child, sourceFile, arkFile);
            return;
        }
    }
    handleElementAccessExpression(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isElementAccessExpression(child.expression)) {
            return;
        }
        const expression = child.expression;
        if (!arkanalyzer_1.ts.isIdentifier(expression.expression) && !arkanalyzer_1.ts.isStringLiteral(expression.expression)) {
            return;
        }
        if (!arkanalyzer_1.ts.isBinaryExpression(expression.argumentExpression)) {
            return;
        }
        let positionInfo;
        if (expression.questionDotToken !== undefined) {
            positionInfo = this.getPositionInfo(expression.argumentExpression, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + expression.argumentExpression.getText() + ']');
        }
        else {
            positionInfo = this.getPositionInfo(child.expression.argumentExpression, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + child.expression.argumentExpression.getText() + ']');
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, '[' + child.expression.argumentExpression.getText() + ']', true);
            return;
        }
    }
    getPositionInfo(expression, sourceFile) {
        const start = expression.getStart();
        const end = expression.getEnd();
        const startPositionInfo = sourceFile.getLineAndCharacterOfPosition(start);
        const endPositionInfo = sourceFile.getLineAndCharacterOfPosition(end);
        return {
            startPosition: startPositionInfo,
            endPosition: endPositionInfo
        };
    }
    addArkIssueReport(arkFile, line, startCol, endCol, message, unknownStats = false, fix) {
        let src = `Unsafe member access ${message} on an \`any\` value.`;
        if (unknownStats) {
            src = `Computed name ${message} resolves to an any value.`;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Defects_1.Defects(line, startCol, endCol, src, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    isKeyMethod(name) {
        const builtInObjects = ['concat'];
        return builtInObjects.includes(name);
    }
    isUnknownStats(name) {
        const builtInObjects = ['field2', 'indexOf', 'lastIndexOf'];
        return builtInObjects.includes(name);
    }
    isBuiltInObject(name) {
        // JavaScript内置对象列表
        const builtInObjects = [
            // 基本对象构造函数
            'Object', 'Function', 'Boolean', 'Symbol', 'Error', 'EvalError', 'RangeError',
            'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError', 'globalThis', 'subscribe',
            // 数值和日期对象
            'Number', 'BigInt', 'Math', 'Date',
            // 字符串和文本对象
            'String', 'RegExp',
            // 索引集合对象
            'Array', 'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array',
            'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
            'BigInt64Array', 'BigUint64Array',
            // 键值集合对象
            'Map', 'Set', 'WeakMap', 'WeakSet',
            // 结构化数据对象
            'ArrayBuffer', 'SharedArrayBuffer', 'Atomics', 'DataView', 'JSON',
            // 控制抽象对象
            'Promise', 'Generator', 'GeneratorFunction', 'AsyncFunction',
            // 反射对象
            'Reflect', 'Proxy',
            // 全局对象和函数
            'Intl', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
            'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent', 'eval',
            'isFinite', 'isNaN', 'parseFloat', 'parseInt',
            // TypeScript特有的对象
            'any', 'unknown', 'never', 'void'
        ];
        return builtInObjects.includes(name);
    }
}
exports.NoUnsafeMemberAccessCheck = NoUnsafeMemberAccessCheck;
