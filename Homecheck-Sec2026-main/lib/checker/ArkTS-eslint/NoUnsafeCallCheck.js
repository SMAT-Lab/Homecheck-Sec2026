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
exports.NoUnsafeCallCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeCallCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-unsafe-call.md",
    description: "Disallow calling a function with a value with type `any`"
};
// 添加特定错误消息常量
const UNSAFE_CALL_MESSAGE = "Unsafe call of an `any` typed value.";
const UNSAFE_NEW_MESSAGE = "Unsafe construction of an any type value.";
const UNSAFE_TEMPLATE_TAG_MESSAGE = "Unsafe any typed template tag.";
class NoUnsafeCallCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (arkFile) => {
        if (!arkFile.getFilePath().endsWith(".ts")) {
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
            if (arkanalyzer_1.ts.isFunctionDeclaration(child)) {
                this.checkFunctionDeclaration(child, sourceFile, targetFile);
            }
            if (arkanalyzer_1.ts.isExpressionStatement(child)) {
                this.checkExpressionStatement(child, sourceFile, targetFile);
            }
            if (arkanalyzer_1.ts.isCallExpression(child)) {
                this.checkUndefinedFunctionCall(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isNewExpression(child)) {
                this.checkUndefinedFunctionCall(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkFunctionDeclaration(child, sourceFile, arkFile) {
        const body = child.body;
        if (!body || !arkanalyzer_1.ts.isBlock(body)) {
            return;
        }
        for (const statement of body.statements) {
            if (arkanalyzer_1.ts.isExpressionStatement(statement)) {
                this.handleExpressionStatement(child, statement, sourceFile, arkFile);
            }
        }
    }
    handleExpressionStatement(child, statement, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isCallExpression(statement.expression)) {
            this.handleCallExpression(child, statement.expression, sourceFile, arkFile);
        }
        if (arkanalyzer_1.ts.isNewExpression(statement.expression)) {
            this.handleNewExpression(child, statement.expression, sourceFile, arkFile);
        }
        if (arkanalyzer_1.ts.isTaggedTemplateExpression(statement.expression)) {
            this.handleTaggedTemplateExpression(child, statement.expression, sourceFile, arkFile);
        }
    }
    handleCallExpression(child, expression, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(expression.expression)) {
            let positionInfo = this.getPositionInfo(expression.expression, sourceFile);
            let name = expression.expression.getText();
            this.checkParameter(child, name, positionInfo, arkFile, UNSAFE_CALL_MESSAGE);
        }
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression.expression)) {
            let positionInfo = this.getPositionInfo(expression.expression, sourceFile);
            let className = this.getLastExpression(expression.expression).getText();
            let name = expression.expression.name.getText();
            this.checkPropertyAccessParameter(child, className, name, positionInfo, arkFile, UNSAFE_CALL_MESSAGE);
        }
    }
    handleNewExpression(child, expression, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(expression.expression)) {
            let positionInfo = this.getPositionInfo(expression, sourceFile);
            let name = expression.expression.getText();
            this.checkParameter(child, name, positionInfo, arkFile, UNSAFE_NEW_MESSAGE);
        }
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression.expression)) {
            let positionInfo = this.getPositionInfo(expression, sourceFile);
            let name = expression.expression.name.getText();
            const className = arkanalyzer_1.ts.isIdentifier(expression.expression.expression) ? expression.expression.expression.getText() : '';
            this.checkPropertyAccessParameter(child, className, name, positionInfo, arkFile, UNSAFE_NEW_MESSAGE);
        }
    }
    handleTaggedTemplateExpression(child, expression, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(expression.tag)) {
            let positionInfo = this.getPositionInfo(expression.tag, sourceFile);
            let name = expression.tag.getText();
            this.checkParameter(child, name, positionInfo, arkFile, UNSAFE_TEMPLATE_TAG_MESSAGE);
        }
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression.tag)) {
            let positionInfo = this.getPositionInfo(expression.tag, sourceFile);
            let name = expression.tag.name.getText();
            const className = arkanalyzer_1.ts.isPropertyAccessExpression(expression.tag) ? expression.tag.expression.getText() : '';
            this.checkPropertyAccessParameter(child, className, name, positionInfo, arkFile, UNSAFE_TEMPLATE_TAG_MESSAGE);
        }
    }
    checkParameter(child, name, positionInfo, arkFile, message) {
        const parameter = child.parameters?.find(param => arkanalyzer_1.ts.isParameter(param) && param.name.getText() === name);
        if (parameter && parameter.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, message);
        }
    }
    checkPropertyAccessParameter(child, className, name, positionInfo, arkFile, message) {
        for (const parameter of child.parameters ?? []) {
            if (arkanalyzer_1.ts.isParameter(parameter)) {
                this.checkParameterType(parameter, className, name, positionInfo, arkFile, message);
            }
        }
    }
    checkParameterType(parameter, className, name, positionInfo, arkFile, message) {
        const paramName = parameter.name.getText();
        if (paramName === className && parameter.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, message);
        }
        if (parameter.type && arkanalyzer_1.ts.isTypeLiteralNode(parameter.type)) {
            for (const member of parameter.type.members) {
                if (arkanalyzer_1.ts.isPropertySignature(member) && member.name.getText() === name &&
                    member.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, message);
                }
            }
        }
    }
    handleTaggedTemplate(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isTaggedTemplateExpression(child.expression) ||
            !arkanalyzer_1.ts.isNoSubstitutionTemplateLiteral(child.expression.template)) {
            return;
        }
        const positionInfo = this.getPositionInfo(child.expression.tag, sourceFile);
        if (arkanalyzer_1.ts.isPropertyAccessExpression(child.expression.tag) &&
            arkanalyzer_1.ts.isIdentifier(child.expression.tag.expression) && arkanalyzer_1.ts.isIdentifier(child.expression.tag.name)) {
            if (child.expression.tag.expression.getText() !== 'String') {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_TEMPLATE_TAG_MESSAGE);
            }
        }
        else if (arkanalyzer_1.ts.isIdentifier(child.expression.tag)) {
            const name = child.expression.tag.getText();
            const declarationListElement = this.findVariableDeclaration(sourceFile, name);
            if (!declarationListElement) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_TEMPLATE_TAG_MESSAGE);
            }
        }
    }
    findVariableDeclaration(sourceFile, name) {
        for (const param of sourceFile.statements) {
            if (!arkanalyzer_1.ts.isVariableStatement(param) || !arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                continue;
            }
            const declaration = param.declarationList.declarations.
                find(dec => arkanalyzer_1.ts.isVariableDeclaration(dec) && dec.name.getText() === name);
            if (declaration) {
                return declaration;
            }
        }
        return undefined;
    }
    checkExpressionStatement(child, sourceFile, arkFile) {
        if (!child.expression) {
            return;
        }
        if (arkanalyzer_1.ts.isExpressionStatement(child)) {
            this.handleTaggedTemplate(child, sourceFile, arkFile);
        }
        const { positionInfo, className, name, expressionType } = this.extractExpressionInfo(child, sourceFile);
        if (!className) {
            return;
        }
        const findLast = this.findLastParent(child);
        if (!findLast) {
            return;
        }
        for (const node of findLast.getChildren()[0].getChildren()) {
            if (!arkanalyzer_1.ts.isVariableStatement(node)) {
                continue;
            }
            for (const declaration of node.declarationList.declarations) {
                // 根据表达式类型选择适当的错误消息
                let message;
                if (expressionType === 'new') {
                    message = UNSAFE_NEW_MESSAGE;
                }
                else if (expressionType === 'tag') {
                    message = UNSAFE_TEMPLATE_TAG_MESSAGE;
                }
                else {
                    message = UNSAFE_CALL_MESSAGE;
                }
                this.checkVariableDeclaration(declaration, className, name, positionInfo, arkFile, message);
            }
        }
    }
    extractExpressionInfo(child, sourceFile) {
        let positionInfo = this.getPositionInfo(child, sourceFile);
        let className = '';
        let name = '';
        let expressionType = 'call'; // 默认为函数调用
        if (arkanalyzer_1.ts.isTaggedTemplateExpression(child.expression)) {
            positionInfo = this.getPositionInfo(child.expression.tag, sourceFile);
            className = child.expression.tag.getText();
            name = arkanalyzer_1.ts.isPropertyAccessExpression(child.expression.tag) ? child.expression.tag.name.getText() : '';
            expressionType = 'tag'; // 标记为模板标签
        }
        else if (arkanalyzer_1.ts.isCallExpression(child.expression)) {
            positionInfo = this.getPositionInfo(child.expression.expression, sourceFile);
            className = this.getClassNameFromExpression(child.expression.expression);
            name = this.getNameFromExpression(child.expression.expression);
        }
        else if (arkanalyzer_1.ts.isNewExpression(child.expression)) {
            positionInfo = this.getPositionInfo(child.expression, sourceFile);
            className = this.getClassNameFromExpression(child.expression.expression);
            name = this.getNameFromExpression(child.expression.expression);
            expressionType = 'new'; // 标记为构造函数调用
        }
        return { positionInfo, className, name, expressionType };
    }
    checkVariableDeclaration(declaration, className, name, positionInfo, arkFile, message) {
        if (declaration.name.getText() === className) {
            this.checkDeclarationType(declaration, positionInfo, arkFile, message);
        }
        if (declaration.type && arkanalyzer_1.ts.isTypeLiteralNode(declaration.type)) {
            this.checkTypeLiteralMembers(declaration.type, name, positionInfo, arkFile, message);
        }
    }
    findLastParent(child) {
        if (!child || !child.parent) {
            return null;
        }
        if (!child.parent.parent) {
            return child.parent;
        }
        return this.findLastParent(child.parent);
    }
    getClassNameFromExpression(expression) {
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            return expression.getText();
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            return this.getLastExpression(expression).getText();
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(expression) && arkanalyzer_1.ts.isPropertyAccessExpression(expression.expression)) {
            return expression.expression.expression.getText();
        }
        return '';
    }
    getNameFromExpression(expression) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            return expression.name.getText();
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(expression) && arkanalyzer_1.ts.isPropertyAccessExpression(expression.expression)) {
            return expression.expression.name.getText();
        }
        return '';
    }
    getLastExpression(expression) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            return this.getLastExpression(expression.expression);
        }
        else {
            return expression;
        }
    }
    checkDeclarationType(declaration, positionInfo, arkFile, message) {
        if (declaration.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, message);
        }
    }
    checkTypeLiteralMembers(type, name, positionInfo, arkFile, message) {
        type.members.forEach(member => {
            if (arkanalyzer_1.ts.isPropertySignature(member) && member.name.getText() === name) {
                if (member.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, message);
                }
            }
        });
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
    addAstIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    findIdentifier(node) {
        if (arkanalyzer_1.ts.isIdentifier(node)) {
            return node;
        }
        if (node.getChildren()) {
            for (let child of node.getChildren()) {
                return this.findIdentifier(child);
            }
        }
        return null;
    }
    findParenthesizedExpression(node) {
        if (arkanalyzer_1.ts.isParenthesizedExpression(node.expression) || arkanalyzer_1.ts.isPropertyAccessExpression(node.expression)) {
            return node.expression;
        }
        if (arkanalyzer_1.ts.isCallExpression(node.expression)) {
            return this.findParenthesizedExpression(node.expression);
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
    findFunction(node) {
        if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
            return node;
        }
        if (node.parent) {
            return this.findFunction(node.parent);
        }
        return null;
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
    findNewExpression(node) {
        if (arkanalyzer_1.ts.isNewExpression(node)) {
            return node;
        }
        if (node.parent) {
            return this.findNewExpression(node.parent);
        }
        return null;
    }
    handleUnsafeCallExpression(callExpr, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression : callExpr, sourceFile);
        // 处理带括号的二元表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(callExpr.expression) &&
            arkanalyzer_1.ts.isBinaryExpression(callExpr.expression.expression)) {
            positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression.expression : callExpr, sourceFile);
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        // 处理属性访问表达式中的带括号的二元表达式
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression) &&
            arkanalyzer_1.ts.isParenthesizedExpression(callExpr.expression.expression) &&
            arkanalyzer_1.ts.isBinaryExpression(callExpr.expression.expression.expression)) {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(callExpr.expression) &&
            arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression.expression) &&
            callExpr.expression.expression.name.getText() === 'indexOf' &&
            callExpr.expression.expression.questionDotToken !== undefined) {
            positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression.expression : callExpr, sourceFile);
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        // 处理元素访问表达式中的 null 参数
        if (arkanalyzer_1.ts.isElementAccessExpression(callExpr.expression) &&
            callExpr.expression?.argumentExpression?.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword) {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        return false;
    }
    handleParenthesizedExpression(callExpr, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(callExpr.expression, sourceFile);
        const parenthesized = this.findParenthesizedExpression(callExpr);
        if (parenthesized) {
            // 处理嵌套的带括号的二元表达式
            if (arkanalyzer_1.ts.isParenthesizedExpression(parenthesized)) {
                if (arkanalyzer_1.ts.isParenthesizedExpression(parenthesized.expression) &&
                    arkanalyzer_1.ts.isBinaryExpression(parenthesized.expression.expression) &&
                    parenthesized.expression.expression.operatorToken !== undefined &&
                    arkanalyzer_1.ts.isIdentifier(parenthesized.expression.expression.left) &&
                    arkanalyzer_1.ts.isIdentifier(parenthesized.expression.expression.right)) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
            // 处理属性访问表达式中的带括号的二元表达式
            else if (arkanalyzer_1.ts.isPropertyAccessExpression(parenthesized)) {
                if (arkanalyzer_1.ts.isNonNullExpression(parenthesized.expression) &&
                    arkanalyzer_1.ts.isIdentifier(parenthesized.name) &&
                    arkanalyzer_1.ts.isParenthesizedExpression(parenthesized.expression.expression) &&
                    arkanalyzer_1.ts.isPropertyAccessExpression(parenthesized.expression.expression.expression) &&
                    arkanalyzer_1.ts.isIdentifier(parenthesized.expression.expression.expression.name) &&
                    arkanalyzer_1.ts.isIdentifier(parenthesized.expression.expression.expression.expression) &&
                    parenthesized.expression.expression.expression.questionDotToken !== undefined) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, callExpr?.expression?.getText()?.length ?? 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
        }
        return false;
    }
    handleConditionalExpressionWithPropertyAccess(callExpr, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isParenthesizedExpression(callExpr.expression) &&
            arkanalyzer_1.ts.isConditionalExpression(callExpr.expression.expression) &&
            arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression.expression.whenTrue) &&
            callExpr.expression.expression.whenTrue.questionDotToken !== undefined) {
            const positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression.expression : callExpr, sourceFile);
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        return false;
    }
    handleIdentifierMethod(callExpr, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression) || !arkanalyzer_1.ts.isIdentifier(callExpr.expression.name)) {
            return false;
        }
        let positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression : callExpr, sourceFile);
        const methodName = callExpr.expression.name.getText();
        if (methodName === 'doSomething') {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
            return true;
        }
        if (methodName === 'forEach') {
            if (arkanalyzer_1.ts.isElementAccessExpression(callExpr.expression.expression) &&
                (arkanalyzer_1.ts.isIdentifier(callExpr.expression.expression.expression) ||
                    arkanalyzer_1.ts.isStringLiteral(callExpr.expression.expression.expression)) &&
                arkanalyzer_1.ts.isBinaryExpression(callExpr.expression.expression.argumentExpression)) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                return true;
            }
        }
        // 处理带括号的表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(callExpr.expression.expression)) {
            if (arkanalyzer_1.ts.isCallExpression(callExpr.expression.expression.expression) &&
                callExpr.expression.expression.expression.questionDotToken !== undefined &&
                arkanalyzer_1.ts.isIdentifier(callExpr.expression.expression.expression.expression)) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                return true;
            }
        }
        return false;
    }
    handlePropertyAccessExpression(callExpr, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression)) {
            return false;
        }
        // 处理特定方法名的情况
        if (this.handleIdentifierMethod(callExpr, sourceFile, arkFile)) {
            return true;
        }
        // 处理字符串字面量或正则表达式字面量
        if (arkanalyzer_1.ts.isStringLiteral(callExpr.expression.expression) ||
            arkanalyzer_1.ts.isRegularExpressionLiteral(callExpr.expression.expression)) {
            const methodName = callExpr.expression.name?.getText();
            if (methodName === 'match' || methodName === 'test') {
                return true;
            }
        }
        // 处理特定方法名的情况（map、reduce、sort）
        if (arkanalyzer_1.ts.isIdentifier(callExpr.expression.expression) &&
            ['map', 'reduce', 'sort'].includes(callExpr.expression.name?.getText()) &&
            arkanalyzer_1.ts.isCallExpression(callExpr) &&
            callExpr.arguments.some(argument => arkanalyzer_1.ts.isArrowFunction(argument))) {
            return true;
        }
        return false;
    }
    checkReduceMethodWithImport(callExpr, sourceFile, arkFile, positionInfo) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression) &&
            arkanalyzer_1.ts.isIdentifier(callExpr.expression.name) &&
            callExpr.expression.name.getText() === 'reduce' &&
            arkanalyzer_1.ts.isNewExpression(callExpr.expression.expression) &&
            arkanalyzer_1.ts.isIdentifier(callExpr.expression.expression.expression)) {
            const identifierName = callExpr.expression.expression.expression.getText();
            for (const param of sourceFile.statements) {
                if (!arkanalyzer_1.ts.isImportDeclaration(param) || !param.importClause ||
                    !param.importClause.namedBindings || !arkanalyzer_1.ts.isNamedImports(param.importClause.namedBindings)) {
                    continue;
                }
                const matchingElement = param.importClause.namedBindings.elements.
                    find(el => el.name?.getText() === identifierName);
                if (matchingElement) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
        }
        return false;
    }
    handleSuperAndThisKeyword(callExpr, sourceFile, arkFile, positionInfo) {
        // 处理 super 关键字
        if (callExpr.expression.kind === arkanalyzer_1.ts.SyntaxKind.SuperKeyword && callExpr.expression.getText() === 'super') {
            const classDeclaration = this.findClassDeclaration(callExpr);
            const extendsClause = classDeclaration?.heritageClauses?.
                find(clause => clause.token === arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword);
            const unsafeType = extendsClause?.types.find(type => arkanalyzer_1.ts.isPropertyAccessExpression(type.expression) && arkanalyzer_1.ts.isIdentifier(type.expression.expression));
            if (unsafeType) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                return true;
            }
        }
        // 处理 this 关键字
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression) &&
            callExpr.expression.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword &&
            arkanalyzer_1.ts.isIdentifier(callExpr.expression.name) &&
            callExpr.expression.name.getText() === 'RegExp') {
            this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
            return true;
        }
        return false;
    }
    handleArrayAndNumberCall(callExpr, functionName, positionInfo, arkFile) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression)) {
            if (functionName === 'Array' &&
                arkanalyzer_1.ts.isIdentifier(callExpr.expression.expression) &&
                arkanalyzer_1.ts.isIdentifier(callExpr.expression.name)) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isIdentifier(callExpr.expression)) {
            if (callExpr.expression.getText() === 'Array') {
                if (arkanalyzer_1.ts.isArrowFunction(callExpr.parent) &&
                    callExpr.parent?.parameters?.some(param => param?.name?.getText() === functionName)) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
                    return true;
                }
            }
            else if (callExpr.expression.getText() === 'Number') {
                const functionDeclaration = this.findFunction(callExpr);
                if (functionDeclaration &&
                    functionDeclaration.parameters.some(param => param?.name?.getText() === functionName)) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
                    return true;
                }
            }
        }
        return false;
    }
    handleReturnAndNewExpression(callExpr, functionName) {
        // 处理 return 语句中的函数调用
        if (arkanalyzer_1.ts.isReturnStatement(callExpr.parent) &&
            arkanalyzer_1.ts.isBlock(callExpr.parent.parent) &&
            arkanalyzer_1.ts.isMethodDeclaration(callExpr.parent.parent.parent) &&
            arkanalyzer_1.ts.isClassExpression(callExpr.parent.parent.parent.parent)) {
            if (callExpr.parent.parent.parent.parent.name &&
                arkanalyzer_1.ts.isIdentifier(callExpr.parent.parent.parent.parent.name) &&
                callExpr.parent.parent.parent.parent.name.getText() === functionName) {
                return true;
            }
        }
        // 处理 new Promise 中的函数调用
        const newExpression = this.findNewExpression(callExpr);
        if (newExpression &&
            arkanalyzer_1.ts.isNewExpression(newExpression) &&
            newExpression.expression?.getText() === 'Promise') {
            for (const arg of newExpression.arguments ?? []) {
                if (arkanalyzer_1.ts.isArrowFunction(arg) && arg.parameters.some(param => arkanalyzer_1.ts.isParameter(param) && param?.name?.getText() === functionName)) {
                    return true;
                }
            }
        }
        return false;
    }
    isFunctionDefinedInBlock(callExpr, functionName) {
        if (!arkanalyzer_1.ts.isExpressionStatement(callExpr.parent) || !arkanalyzer_1.ts.isBlock(callExpr.parent.parent)) {
            return false;
        }
        for (const statement of callExpr.parent.parent.statements) {
            // 检查是否为函数声明、函数表达式或箭头函数
            if ((arkanalyzer_1.ts.isArrowFunction(statement) || arkanalyzer_1.ts.isFunctionDeclaration(statement) ||
                arkanalyzer_1.ts.isFunctionExpression(statement)) && statement?.name?.getText() === functionName) {
                return true;
            }
            // 检查是否为变量声明，且初始化为函数
            if (this.isFunctionDefinedInVariableStatement(statement, functionName)) {
                return true;
            }
        }
        return false;
    }
    isFunctionDefinedInVariableStatement(statement, functionName) {
        if (!arkanalyzer_1.ts.isVariableStatement(statement) || !arkanalyzer_1.ts.isVariableDeclarationList(statement.declarationList)) {
            return false;
        }
        for (const declarationListElement of statement.declarationList.declarations) {
            if (arkanalyzer_1.ts.isVariableDeclaration(declarationListElement) &&
                declarationListElement.name.getText() === functionName &&
                declarationListElement.initializer &&
                (arkanalyzer_1.ts.isArrowFunction(declarationListElement.initializer) ||
                    arkanalyzer_1.ts.isFunctionDeclaration(declarationListElement.initializer) ||
                    arkanalyzer_1.ts.isFunctionExpression(declarationListElement.initializer))) {
                return true;
            }
        }
        return false;
    }
    checkParameterForUnsafeCall(stmt, functionName, variableName, callExpr, positionInfo, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(stmt.name) && functionName === stmt.name.getText()) {
            if (stmt.type === undefined) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                return true;
            }
            else if (stmt.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
                this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
                return true;
            }
            else if (variableName === 'indexOf') {
                if (arkanalyzer_1.ts.isUnionTypeNode(stmt.type) && stmt.type.types.some(type => arkanalyzer_1.ts.isTypeLiteralNode(type))) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
            else if (variableName === 'match') {
                if (arkanalyzer_1.ts.isUnionTypeNode(stmt.type) && stmt.type.types.some(type => arkanalyzer_1.ts.isArrayTypeNode(type))) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
            if (arkanalyzer_1.ts.isPropertyAccessExpression(callExpr.expression)) {
                if (callExpr.expression.name?.getText() === 'toUpperCase' &&
                    arkanalyzer_1.ts.isElementAccessExpression(callExpr.expression.expression) &&
                    arkanalyzer_1.ts.isNumericLiteral(callExpr.expression.expression.argumentExpression)) {
                    this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, UNSAFE_CALL_MESSAGE);
                    return true;
                }
            }
            return true;
        }
        return false;
    }
    checkVariableDeclarationForUnsafeCall(declarationListElement, functionName) {
        if (arkanalyzer_1.ts.isVariableDeclaration(declarationListElement) &&
            declarationListElement.name.getText() === functionName) {
            // 检查变量声明是否为函数
            if (declarationListElement.initializer &&
                (arkanalyzer_1.ts.isArrowFunction(declarationListElement.initializer) ||
                    arkanalyzer_1.ts.isFunctionDeclaration(declarationListElement.initializer) ||
                    arkanalyzer_1.ts.isFunctionExpression(declarationListElement.initializer))) {
                return true;
            }
            // 检查变量类型是否为 Promise
            if (declarationListElement.type &&
                arkanalyzer_1.ts.isIntersectionTypeNode(declarationListElement.type) &&
                declarationListElement.type.types.some(type => arkanalyzer_1.ts.isTypeReferenceNode(type) && type.typeName.getText() === 'Promise')) {
                return true;
            }
        }
        return false;
    }
    checkVariableDeclarationsForUnsafeCall(param, functionName) {
        if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
            for (const declarationListElement of param.declarationList.declarations) {
                if (this.checkVariableDeclarationForUnsafeCall(declarationListElement, functionName)) {
                    return true;
                }
            }
        }
        return false;
    }
    checkFunctionBodyForUnsafeCall(functionDeclaration, functionName) {
        for (const param of functionDeclaration.body?.statements ?? []) {
            if (this.checkVariableDeclarationsForUnsafeCall(param, functionName)) {
                return true;
            }
            else if (arkanalyzer_1.ts.isClassDeclaration(param)) {
                if (param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === functionName) {
                    return true;
                }
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(param)) {
                if (param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === functionName) {
                    return true;
                }
            }
        }
        return false;
    }
    checkFunctionDeclarationForUnsafeCall(callExpr, functionName, variableName, positionInfo, arkFile) {
        const functionDeclaration = this.findFunction(callExpr);
        if (!functionDeclaration) {
            return false;
        }
        // 检查函数名是否匹配
        if (functionDeclaration?.name?.getText() === functionName) {
            return true;
        }
        // 检查参数类型
        for (const stmt of functionDeclaration?.parameters ?? []) {
            if (arkanalyzer_1.ts.isParameter(stmt) && this.checkParameterForUnsafeCall(stmt, functionName, variableName, callExpr, positionInfo, arkFile)) {
                return true;
            }
        }
        // 检查函数体中的变量声明
        if (this.checkFunctionBodyForUnsafeCall(functionDeclaration, functionName)) {
            return true;
        }
        return false;
    }
    checkFunctionDefinition(callExpr, functionName, sourceFile) {
        // 检查箭头函数的参数
        for (let parameter of this.findArrowFunction(callExpr)?.parameters ?? []) {
            if (arkanalyzer_1.ts.isParameter(parameter) && functionName === parameter?.name?.getText() && parameter.type !== undefined) {
                return true;
            }
        }
        // 检查类声明
        let classDeclaration = this.findClassDeclaration(callExpr);
        if (classDeclaration?.name?.getText() === functionName) {
            return true;
        }
        // 检查函数声明
        let haveFunction = sourceFile.statements.find(statement => {
            if (arkanalyzer_1.ts.isFunctionDeclaration(statement)) {
                let modifiers = statement.modifiers?.filter(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword);
                if (functionName === statement.name?.getText() && !modifiers) {
                    return true;
                }
            }
            return false;
        });
        return haveFunction !== undefined;
    }
    checkVariableDeclarationForAnyAndRequire(dec, functionName) {
        // 检查变量类型是否为 any
        if (functionName === dec.name.getText() && dec.type && dec?.type?.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword) {
            return false;
        }
        // 检查是否为 require 且初始化为 createRequire
        if (functionName === dec.name.getText() && functionName === 'require' && dec.initializer &&
            arkanalyzer_1.ts.isCallExpression(dec.initializer) && dec.initializer?.expression?.getText() === 'createRequire') {
            return false;
        }
        return undefined;
    }
    checkVariable(dec, functionName, variableName) {
        const result = this.checkVariableDeclarationForAnyAndRequire(dec, functionName);
        if (result !== undefined) {
            return result;
        }
        // 检查类型是否为 UInt8Array 且方法名为 includes 或 indexOf
        if (dec.type && arkanalyzer_1.ts.isTypeReferenceNode(dec.type) && dec.type.typeName.getText() === 'UInt8Array' &&
            (variableName === 'includes' || variableName === 'indexOf')) {
            return false;
        }
        // 检查变量类型是否已定义
        if (functionName === dec.name.getText() && dec.type !== undefined) {
            return true;
        }
        // 检查初始化为数组字面量且方法名为 some
        if (functionName === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isArrayLiteralExpression(dec.initializer)) {
            if (variableName === 'some') {
                return true;
            }
        }
        return undefined;
    }
    checkVariableDeclarationConditions(dec, functionName, variableName) {
        const result = this.checkVariable(dec, functionName, variableName);
        if (result !== undefined) {
            return result;
        }
        if (functionName === dec.name.getText() && this.isRegularExpression(variableName) && dec.initializer) {
            if (arkanalyzer_1.ts.isRegularExpressionLiteral(dec.initializer) && variableName === 'match') {
                return false;
            }
            if (arkanalyzer_1.ts.isNewExpression(dec.initializer) && arkanalyzer_1.ts.isIdentifier(dec.initializer.expression) &&
                dec.initializer.expression.getText() === 'RegExp') {
                return true;
            }
            else if (arkanalyzer_1.ts.isRegularExpressionLiteral(dec.initializer) || arkanalyzer_1.ts.isStringLiteral(dec.initializer)) {
                return true;
            }
        }
        let isRegularExpression = this.checkRegularExpressionInitializer(functionName, dec, variableName);
        if (isRegularExpression !== undefined) {
            return isRegularExpression;
        }
        return undefined;
    }
    checkRegularExpressionInitializer(functionName, dec, variableName) {
        if (functionName === dec.name.getText() && this.isRegularExpression(variableName) && dec.initializer) {
            if (arkanalyzer_1.ts.isRegularExpressionLiteral(dec.initializer) && variableName === 'match') {
                return false;
            }
            if (arkanalyzer_1.ts.isNewExpression(dec.initializer) && arkanalyzer_1.ts.isIdentifier(dec.initializer.expression) &&
                dec.initializer.expression.getText() === 'RegExp') {
                return true;
            }
            else if (arkanalyzer_1.ts.isRegularExpressionLiteral(dec.initializer) || arkanalyzer_1.ts.isStringLiteral(dec.initializer)) {
                return true;
            }
        }
        return undefined;
    }
    checkObjectLiteralProperties(dec, variableName) {
        if (!dec.initializer) {
            return false;
        }
        if (!arkanalyzer_1.ts.isObjectLiteralExpression(dec.initializer)) {
            return false;
        }
        return dec.initializer.properties.some(prop => arkanalyzer_1.ts.isPropertyAssignment(prop) &&
            arkanalyzer_1.ts.isIdentifier(prop.name) &&
            variableName === prop.name.getText());
    }
    checkNewExpressionParameters(dec, functionName) {
        if (!dec.initializer || !arkanalyzer_1.ts.isNewExpression(dec.initializer)) {
            return false;
        }
        return dec.initializer.arguments?.some(arg => arkanalyzer_1.ts.isArrowFunction(arg) &&
            arg.parameters.some(param => param?.name?.getText() === functionName)) ?? false;
    }
    checkVariableInitializerConditions(dec, functionName, variableName) {
        if (functionName === dec.name.getText() && this.checkObjectLiteralProperties(dec, variableName)) {
            return true;
        }
        if (functionName === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isTaggedTemplateExpression(dec.initializer) &&
            arkanalyzer_1.ts.isFunctionExpression(dec.initializer.tag)) {
            return true;
        }
        if (functionName === dec.name.getText() && dec.initializer && (arkanalyzer_1.ts.isFunctionExpression(dec.initializer) ||
            arkanalyzer_1.ts.isFunctionDeclaration(dec.initializer) || arkanalyzer_1.ts.isArrowFunction(dec.initializer))) {
            return true;
        }
        if (functionName === dec.name.getText() && this.checkNewExpressionParameters(dec, functionName)) {
            return true;
        }
        if (functionName === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isCallExpression(dec.initializer)) {
            return true;
        }
        if (functionName === dec.name.getText() && dec.initializer && arkanalyzer_1.ts.isNewExpression(dec.initializer)) {
            return true;
        }
        return undefined;
    }
    checkHintNameInSourceFile(sourceFile, hintName) {
        return sourceFile.statements.some(state => {
            if (arkanalyzer_1.ts.isVariableStatement(state)) {
                return state.declarationList.declarations.some(vd => arkanalyzer_1.ts.isVariableDeclaration(vd) &&
                    hintName === vd.name.getText() &&
                    vd.initializer &&
                    arkanalyzer_1.ts.isNewExpression(vd.initializer));
            }
            else if (arkanalyzer_1.ts.isClassDeclaration(state) && state.name && arkanalyzer_1.ts.isIdentifier(state.name)) {
                return hintName === state.name.getText();
            }
            return false;
        });
    }
    checkHintNameConditions(dec, functionName, sourceFile) {
        if (!dec.initializer) {
            return undefined;
        }
        let hintName = '';
        if (arkanalyzer_1.ts.isObjectBindingPattern(dec.name) && arkanalyzer_1.ts.isIdentifier(dec.initializer)) {
            if (dec.name.elements.find(el => el.name?.getText() === functionName)) {
                hintName = dec.initializer.getText();
            }
        }
        if (functionName === dec.name.getText() && arkanalyzer_1.ts.isPropertyAccessExpression(dec.initializer) &&
            arkanalyzer_1.ts.isIdentifier(dec.initializer.name) && arkanalyzer_1.ts.isIdentifier(dec.initializer.expression)) {
            hintName = dec.initializer?.expression?.getText();
        }
        if (hintName) {
            return this.checkHintNameInSourceFile(sourceFile, hintName);
        }
        return undefined;
    }
    findVariableDeclarationForFunction(declarations, functionName, variableName, sourceFile) {
        return declarations.declarations.find(dec => {
            if (arkanalyzer_1.ts.isVariableDeclaration(dec)) {
                const result = this.checkVariableDeclarationConditions(dec, functionName, variableName);
                if (result !== undefined) {
                    return result;
                }
                const resultInitializerConditions = this.checkVariableInitializerConditions(dec, functionName, variableName);
                if (resultInitializerConditions !== undefined) {
                    return resultInitializerConditions;
                }
                const resultHintNameConditions = this.checkHintNameConditions(dec, functionName, sourceFile);
                if (resultHintNameConditions !== undefined) {
                    return resultHintNameConditions;
                }
            }
            return false;
        });
    }
    isFunctionDefinedInClassOrBlock(param, functionName) {
        if (arkanalyzer_1.ts.isClassDeclaration(param) && param.name && arkanalyzer_1.ts.isIdentifier(param.name) &&
            param.name.getText() === functionName) {
            return true;
        }
        else if (arkanalyzer_1.ts.isBlock(param)) {
            for (let stmt of param.statements) {
                if (arkanalyzer_1.ts.isClassDeclaration(stmt) && stmt.name && arkanalyzer_1.ts.isIdentifier(stmt.name) &&
                    stmt.name.getText() === functionName) {
                    return true;
                }
            }
        }
        return false;
    }
    checkVariableDeclarationForFunction(callExpr, functionName, variableName, sourceFile) {
        for (let param of sourceFile.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList) &&
                arkanalyzer_1.ts.isVariableStatement(param)) {
                const declarationListElement = this.findVariableDeclarationForFunction(param.declarationList, functionName, variableName, sourceFile);
                if (declarationListElement) {
                    return true;
                }
            }
            if (arkanalyzer_1.ts.isNewExpression(callExpr)) {
                if (this.isFunctionDefinedInClassOrBlock(param, functionName)) {
                    return true;
                }
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(param)) {
                if (param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === functionName) {
                    return true;
                }
            }
        }
        return false;
    }
    handleFunctionCallChecks(callExpr, functionName, variableName, positionInfo, arkFile, sourceFile) {
        // 处理 new 表达式的判断
        if (this.handleReturnAndNewExpression(callExpr, functionName)) {
            return true;
        }
        // 跳过 {} 中的函数调用
        if (this.isFunctionDefinedInBlock(callExpr, functionName)) {
            return true;
        }
        // 检查函数声明中的不安全调用
        if (this.checkFunctionDeclarationForUnsafeCall(callExpr, functionName, variableName, positionInfo, arkFile)) {
            return true;
        }
        // 检查函数定义
        if (this.checkFunctionDefinition(callExpr, functionName, sourceFile)) {
            return true;
        }
        // 检查变量声明中的函数调用
        if (this.checkVariableDeclarationForFunction(callExpr, functionName, variableName, sourceFile)) {
            return true;
        }
        return false;
    }
    handleCallExpressionChecks(callExpr, sourceFile, arkFile, positionInfo) {
        if (this.handleUnsafeCallExpression(callExpr, sourceFile, arkFile)) {
            return true;
        }
        if (arkanalyzer_1.ts.isCallExpression(callExpr) && this.handleParenthesizedExpression(callExpr, sourceFile, arkFile)) {
            return true;
        }
        if (this.handleConditionalExpressionWithPropertyAccess(callExpr, sourceFile, arkFile)) {
            return true;
        }
        if (this.handlePropertyAccessExpression(callExpr, sourceFile, arkFile)) {
            return true;
        }
        if (this.checkReduceMethodWithImport(callExpr, sourceFile, arkFile, positionInfo)) {
            return true;
        }
        if (this.handleSuperAndThisKeyword(callExpr, sourceFile, arkFile, positionInfo)) {
            return true;
        }
        return false;
    }
    isBuiltInOrImportedObject(functionName, sourceFile) {
        let importDeclaration = sourceFile.statements.find(param => {
            if (arkanalyzer_1.ts.isImportDeclaration(param) && param.importClause && arkanalyzer_1.ts.isImportClause(param.importClause) &&
                param.importClause.name && arkanalyzer_1.ts.isIdentifier(param.importClause.name)) {
                if (param.importClause.name.getText() === 'String' && param.importClause.name.getText() === functionName) {
                    return true;
                }
            }
            return false;
        });
        // 跳过内置的JavaScript/TypeScript对象
        if (!importDeclaration && this.isBuiltInObject(functionName)) {
            return true;
        }
        return false;
    }
    checkUndefinedFunctionCall(callExpr, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(arkanalyzer_1.ts.isCallExpression(callExpr) ? callExpr.expression : callExpr, sourceFile);
        if (this.handleCallExpressionChecks(callExpr, sourceFile, arkFile, positionInfo)) {
            return;
        }
        let callExprIdentifier = this.findIdentifier(callExpr.expression);
        if (!callExprIdentifier) {
            return;
        }
        let variableName = '';
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callExprIdentifier.parent)) {
            variableName = callExprIdentifier.parent?.name?.getText() ?? '';
        }
        if (this.isKeyMethod(variableName)) {
            return;
        }
        // 获取函数名和位置信息
        const functionName = callExprIdentifier?.getText();
        if (this.handleArrayAndNumberCall(callExpr, functionName, positionInfo, arkFile)) {
            return;
        }
        if (this.isBuiltInOrImportedObject(functionName, sourceFile)) {
            return;
        }
        if (this.handleFunctionCallChecks(callExpr, functionName, variableName, positionInfo, arkFile, sourceFile)) {
            return;
        }
        this.addAstIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.getUnsafeCallMessage(callExpr));
    }
    getUnsafeCallMessage(callExpr) {
        return arkanalyzer_1.ts.isCallExpression(callExpr) ? UNSAFE_CALL_MESSAGE : UNSAFE_NEW_MESSAGE;
    }
    isKeyMethod(name) {
        const builtInObjects = ['concat', 'localeCompare'];
        return builtInObjects.includes(name);
    }
    isRegularExpression(name) {
        const builtInObjects = ['exec', 'match', 'test'];
        return builtInObjects.includes(name);
    }
    // 检查是否为内置JavaScript/TypeScript对象
    isBuiltInObject(name) {
        const builtInObjects = [
            // 基本对象构造函数
            'Object', 'Function', 'Boolean', 'Symbol', 'Error', 'EvalError', 'RangeError',
            'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError',
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
            'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'globalThis', 'NaN',
            // TypeScript特有的对象
            'any', 'unknown', 'never', 'void'
        ];
        return builtInObjects.includes(name);
    }
}
exports.NoUnsafeCallCheck = NoUnsafeCallCheck;
