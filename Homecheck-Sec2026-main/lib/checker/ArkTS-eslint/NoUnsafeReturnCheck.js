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
exports.NoUnsafeReturnCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeReturnCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-unsafe-return.md",
    description: "Unsafe return of an `any` typed value."
};
class NoUnsafeReturnCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    regex = /unknown\s*\{/;
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildTs = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.checkArk
        };
        return [fileMatcherCb, matchBuildTs];
    }
    checkArk = (arkFile) => {
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
            if (arkanalyzer_1.ts.isReturnStatement(child)) {
                this.checkArkReturnStatement(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isArrowFunction(child)) {
                this.checkArkArrowFunction(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    shouldSkipArrowFunctionCheck(child) {
        if (arkanalyzer_1.ts.isCallExpression(child.parent)) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(child.parent.expression)) {
                const methodName = child.parent.expression.name.getText();
                const allowedMethods = ['map', 'reduce', 'sort', 'filter'];
                return allowedMethods.includes(methodName);
            }
        }
        return false;
    }
    shouldSkipArrowFunctionCheckForArrayMethods(child) {
        if (arkanalyzer_1.ts.isCallExpression(child.parent)) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(child.parent.expression)) {
                const methodName = child.parent.expression.name.getText();
                const allowedMethods = ['map', 'reduce', 'sort', 'toSorted'];
                if (allowedMethods.includes(methodName)) {
                    return true;
                }
            }
            else if (arkanalyzer_1.ts.isElementAccessExpression(child.parent.expression)) {
                if (arkanalyzer_1.ts.isStringLiteral(child.parent.expression.argumentExpression) &&
                    child.parent.expression.argumentExpression.getText() === '\'reduce\'' &&
                    arkanalyzer_1.ts.isArrayLiteralExpression(child.parent.expression.expression)) {
                    return true;
                }
            }
        }
        return false;
    }
    checkArkArrowFunction(child, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(child.body, sourceFile);
        let nameSave = { paramName: '' };
        if (arkanalyzer_1.ts.isIdentifier(child.body)) {
            nameSave.paramName = child.body?.getText();
            if (this.shouldSkipArrowFunctionCheck(child)) {
                return;
            }
        }
        if (this.checkArrowFunctionBodyType(child, arkFile, positionInfo, nameSave)) {
            return;
        }
        if (arkanalyzer_1.ts.isNewExpression(child.body)) {
            if (arkanalyzer_1.ts.isIdentifier(child.body?.expression)) {
                nameSave.paramName = child.body?.expression.getText();
                if (nameSave.paramName === 'Bluebird') {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return;
                }
            }
        }
        if (nameSave.paramName === '') {
            return;
        }
        const parameters = child.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === nameSave.paramName && param.type === undefined);
        if (matchingParam) {
            let des = this.metaData.description;
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, des);
        }
    }
    checkArrowFunctionBodyType(child, arkFile, positionInfo, nameSave) {
        if (child.body.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            if (this.checkThisKeywordInConstructor(child, arkFile, positionInfo)) {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isBinaryExpression(child.body)) {
            if (this.checkArrowFunctionBody(child, arkFile, positionInfo, nameSave)) {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isPropertyAccessExpression(child.body)) {
            if (arkanalyzer_1.ts.isIdentifier(child.body?.expression) && arkanalyzer_1.ts.isPrivateIdentifier(child.body?.name)) {
                nameSave.paramName = child.body?.expression.getText();
            }
        }
        else if (arkanalyzer_1.ts.isAsExpression(child.body) || arkanalyzer_1.ts.isAwaitExpression(child.body)) {
            if (arkanalyzer_1.ts.isIdentifier(child.body?.expression)) {
                nameSave.paramName = child.body?.expression.getText();
            }
        }
        return false;
    }
    checkThisKeywordInConstructor(child, arkFile, positionInfo) {
        if (arkanalyzer_1.ts.isCallExpression(child.parent) &&
            arkanalyzer_1.ts.isExpressionStatement(child.parent.parent) &&
            arkanalyzer_1.ts.isBlock(child.parent.parent.parent) &&
            child.parent.parent.parent?.parent?.kind === arkanalyzer_1.ts.SyntaxKind.Constructor) {
            return true;
        }
        this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        return true;
    }
    checkArrowFunctionBody(child, arkFile, positionInfo, nameSave) {
        if (this.shouldSkipArrowFunctionCheckForArrayMethods(child)) {
            return true;
        }
        if (arkanalyzer_1.ts.isBinaryExpression(child.body)) {
            if (arkanalyzer_1.ts.isAsteriskToken(child.body?.operatorToken)) {
                return true;
            }
            else if (arkanalyzer_1.ts.isIdentifier(child.body?.left)) {
                nameSave.paramName = child.body?.left.getText();
                const parameters = child.parameters;
                const matchingParam = parameters.find(param => param.name.getText() === nameSave.paramName && param.type &&
                    param.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword);
                if (matchingParam) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return true;
                }
            }
        }
        if (arkanalyzer_1.ts.isPropertyAssignment(child.parent) &&
            arkanalyzer_1.ts.isIdentifier(child.parent.name) &&
            child.parent.name.getText() === 'map') {
            return true;
        }
        return false;
    }
    findClassDeclarationParentRecursive(node) {
        if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            return node;
        }
        if (!node.parent) {
            return null;
        }
        return this.findClassDeclarationParentRecursive(node.parent);
    }
    checkPropertyAccessExpressionWithThisKeyword(child, arkFile, positionInfo) {
        if (child.expression &&
            arkanalyzer_1.ts.isPropertyAccessExpression(child.expression) &&
            child.expression.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            let name = '';
            if (arkanalyzer_1.ts.isIdentifier(child.expression.name)) {
                name = child.expression.name.getText();
            }
            const classDeclaration = this.findClassDeclarationParentRecursive(child);
            if (classDeclaration) {
                const hasPropertyOrConstructor = classDeclaration.members.some(member => (arkanalyzer_1.ts.isPropertyDeclaration(member) && member.name.getText() === name) ||
                    member.kind === arkanalyzer_1.ts.SyntaxKind.Constructor);
                if (hasPropertyOrConstructor) {
                    return;
                }
            }
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return;
        }
    }
    checkIdentifierReturnStatement(child, arkFile, positionInfo, name) {
        if (!arkanalyzer_1.ts.isFunctionDeclaration(child?.parent?.parent)) {
            return false;
        }
        const parameters = child.parent.parent.parameters;
        const matchingParam = parameters.find(param => {
            if (arkanalyzer_1.ts.isArrayBindingPattern(param.name)) {
                return param.name.elements.some(element => arkanalyzer_1.ts.isBindingElement(element) &&
                    arkanalyzer_1.ts.isIdentifier(element.name) &&
                    element.name.getText() === name);
            }
            else if (arkanalyzer_1.ts.isParameter(param)) {
                if (param.name.getText() === name && param.type === undefined && param.initializer && arkanalyzer_1.ts.isIdentifier(param.initializer)) {
                    name = '';
                    return true;
                }
            }
            return false;
        });
        if (name === '') {
            return true;
        }
        if (matchingParam && name !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkIdentifierExpression(child, arkFile, positionInfo, name) {
        if (!arkanalyzer_1.ts.isFunctionDeclaration(child?.parent?.parent)) {
            return false;
        }
        const parameters = child.parent.parent.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === name && param.type === undefined);
        if (matchingParam && name !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkArrayTypeNode(matchingParam, arkFile, positionInfo) {
        if (matchingParam?.type && arkanalyzer_1.ts.isArrayTypeNode(matchingParam.type)) {
            if (arkanalyzer_1.ts.isTypeReferenceNode(matchingParam.type.elementType)) {
                if (matchingParam.type.elementType.typeName.getText() === 'T') {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return true;
                }
            }
        }
        return false;
    }
    checkElementAccessExpressionForArrayType(identifier, child, arkFile, positionInfo) {
        if (!arkanalyzer_1.ts.isIdentifier(identifier)) {
            return false;
        }
        const name = identifier.getText();
        const parentFunction = child?.parent?.parent?.parent?.parent;
        if (!arkanalyzer_1.ts.isFunctionDeclaration(parentFunction)) {
            return false;
        }
        const parameters = parentFunction.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === name &&
            param.type?.kind === arkanalyzer_1.ts.SyntaxKind.ArrayType);
        if (matchingParam && this.checkArrayTypeNode(matchingParam, arkFile, positionInfo)) {
            return true;
        }
        return false;
    }
    checkElementAccessExpressionForUndefinedType(methodName, child, arkFile, positionInfo) {
        if (!child.expression || !arkanalyzer_1.ts.isCallExpression(child.expression)) {
            return false;
        }
        if (!arkanalyzer_1.ts.isIdentifier(methodName) || !child.expression.arguments?.length) {
            return false;
        }
        const argumentName = child.expression.arguments[0].getText();
        const parentFunction = child?.parent?.parent;
        if (!arkanalyzer_1.ts.isFunctionExpression(parentFunction)) {
            return false;
        }
        const parameters = parentFunction.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === argumentName &&
            param.type === undefined);
        if (matchingParam) {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkElementAccessExpression(child, arkFile, positionInfo) {
        if (!child.expression || !arkanalyzer_1.ts.isCallExpression(child.expression)) {
            return false;
        }
        const expression = child.expression.expression;
        if (!arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            return false;
        }
        const elementAccessExpression = expression.expression;
        if (arkanalyzer_1.ts.isElementAccessExpression(elementAccessExpression)) {
            const identifier = elementAccessExpression.expression;
            if (this.checkElementAccessExpressionForArrayType(identifier, child, arkFile, positionInfo)) {
                return true;
            }
        }
        else if (elementAccessExpression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            const methodName = expression.name;
            if (this.checkElementAccessExpressionForUndefinedType(methodName, child, arkFile, positionInfo)) {
                return true;
            }
        }
        return false;
    }
    checkIdentifierExpressionForTypeLiteral(expression, child, arkFile, positionInfo) {
        if (!arkanalyzer_1.ts.isIdentifier(expression)) {
            return false;
        }
        const name = expression.getText();
        const parentFunction = child?.parent?.parent;
        if (!arkanalyzer_1.ts.isFunctionDeclaration(parentFunction)) {
            return false;
        }
        const parameters = parentFunction.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === name &&
            param.type &&
            arkanalyzer_1.ts.isTypeLiteralNode(param.type));
        if (matchingParam && name !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkNonNullExpressionForTypeLiteral(expression, child, arkFile, positionInfo) {
        if (child.expression && !arkanalyzer_1.ts.isCallExpression(child.expression)) {
            return false;
        }
        if (!arkanalyzer_1.ts.isNonNullExpression(expression) || child.expression?.questionDotToken?.kind !== arkanalyzer_1.ts.SyntaxKind.QuestionDotToken) {
            return false;
        }
        const innerExpression = expression.expression;
        if (!arkanalyzer_1.ts.isIdentifier(innerExpression)) {
            return false;
        }
        const name = innerExpression.getText();
        const parentFunction = child?.parent?.parent;
        if (!arkanalyzer_1.ts.isFunctionDeclaration(parentFunction)) {
            return false;
        }
        const parameters = parentFunction.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === name &&
            param.type &&
            arkanalyzer_1.ts.isTypeLiteralNode(param.type));
        if (matchingParam && name !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkElementAccessExpressionForIdentifier(argumentExpression, child, arkFile, positionInfo) {
        if (child.expression && !arkanalyzer_1.ts.isElementAccessExpression(child.expression)) {
            return false;
        }
        if (!arkanalyzer_1.ts.isIdentifier(argumentExpression)) {
            return false;
        }
        const name = child.expression?.expression.getText();
        const parentFunction = child?.parent?.parent;
        if (!arkanalyzer_1.ts.isFunctionDeclaration(parentFunction)) {
            return false;
        }
        const parameters = parentFunction.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === name && param.type !== undefined);
        if (!matchingParam && name !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        return false;
    }
    checkArkReturnStatement(child, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(child, sourceFile);
        if (child.expression === undefined || arkanalyzer_1.ts.isNumericLiteral(child.expression) || arkanalyzer_1.ts.isLiteralExpression(child.expression) ||
            child.expression.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword || child.expression.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
            return;
        }
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(child.expression) && arkanalyzer_1.ts.isPrefixUnaryExpression(child.expression.operand)) {
            return;
        }
        this.checkPropertyAccessExpressionWithThisKeyword(child, arkFile, positionInfo);
        let nameSave = { paramName: '' };
        if (arkanalyzer_1.ts.isIdentifier(child.expression)) {
            nameSave.paramName = child.expression?.getText();
            let name = child.expression?.getText();
            let isCheck = this.checkIdentifierReturnStatement(child, arkFile, positionInfo, name);
            if (isCheck) {
                return;
            }
        }
        if (this.checkReturnExpression(child, arkFile, positionInfo, nameSave)) {
            return;
        }
        this.checkBlockAndFunction(child, arkFile, positionInfo, nameSave.paramName);
    }
    checkReturnExpression(child, arkFile, positionInfo, nameSave) {
        if (!child.expression) {
            return false;
        }
        if (arkanalyzer_1.ts.isBinaryExpression(child.expression)) {
            if (arkanalyzer_1.ts.isAsteriskToken(child.expression?.operatorToken) || child.expression?.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashToken) {
                return true;
            }
            if (arkanalyzer_1.ts.isIdentifier(child.expression?.left)) {
                nameSave.paramName = child.expression?.left.getText();
            }
        }
        else if (arkanalyzer_1.ts.isNewExpression(child.expression)) {
            if (arkanalyzer_1.ts.isIdentifier(child.expression?.expression)) {
                const name = child.expression?.expression.getText();
                if (this.checkIdentifierExpression(child, arkFile, positionInfo, name)) {
                    return true;
                }
            }
        }
        if (this.checkCallAndElementAccessExpression(child, arkFile, positionInfo, nameSave.paramName)) {
            return true;
        }
        return false;
    }
    checkCallAndElementAccessExpression(child, arkFile, positionInfo, paramName) {
        if (!child.expression) {
            return false;
        }
        if (arkanalyzer_1.ts.isCallExpression(child.expression)) {
            if (this.checkCallExpression(child, arkFile, positionInfo, paramName)) {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isElementAccessExpression(child.expression)) {
            if (arkanalyzer_1.ts.isIdentifier(child.expression.expression) &&
                child.expression?.questionDotToken?.kind === arkanalyzer_1.ts.SyntaxKind.QuestionDotToken &&
                arkanalyzer_1.ts.isNonNullExpression(child.expression.argumentExpression)) {
                const argumentExpression = child.expression.argumentExpression.expression;
                if (this.checkElementAccessExpressionForIdentifier(argumentExpression, child, arkFile, positionInfo)) {
                    return true;
                }
            }
        }
        return false;
    }
    checkCallExpression(child, arkFile, positionInfo, paramName) {
        if (child.expression && !arkanalyzer_1.ts.isCallExpression(child.expression)) {
            return false;
        }
        if (!child.expression) {
            return false;
        }
        const expression = child.expression.expression;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            if (this.checkElementAccessExpression(child, arkFile, positionInfo)) {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isIdentifier(expression)) {
            paramName = expression.getText();
            if (paramName === 'String') {
                return true;
            }
        }
        else if (expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return true;
        }
        else if (arkanalyzer_1.ts.isNonNullExpression(expression) && child.expression?.questionDotToken?.kind === arkanalyzer_1.ts.SyntaxKind.QuestionDotToken) {
            const innerExpression = expression.expression;
            if (this.checkIdentifierExpressionForTypeLiteral(innerExpression, child, arkFile, positionInfo)) {
                return true;
            }
        }
        else if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
            const innerExpression = expression.expression;
            if (this.checkNonNullExpressionForTypeLiteral(innerExpression, child, arkFile, positionInfo)) {
                return true;
            }
        }
        return false;
    }
    checkBlockAndFunction(child, arkFile, positionInfo, paramName) {
        if (!arkanalyzer_1.ts.isBlock(child.parent)) {
            return;
        }
        const parentParent = child.parent.parent;
        if (!arkanalyzer_1.ts.isFunctionDeclaration(parentParent) &&
            !arkanalyzer_1.ts.isFunctionExpression(parentParent) &&
            !arkanalyzer_1.ts.isMethodDeclaration(parentParent) &&
            !arkanalyzer_1.ts.isArrowFunction(parentParent)) {
            return;
        }
        const parentParentParent = parentParent.parent;
        const parentParentParentParent = parentParentParent.parent;
        if (this.checkParentCallExpression(parentParentParent, parentParentParentParent, arkFile, positionInfo)) {
            return;
        }
        let isNumeric = false;
        const numeric = this.checkStatementsForParamName(child.parent.statements, paramName);
        if (numeric) {
            isNumeric = numeric;
        }
        const parameters = parentParent.parameters;
        const matchingParam = parameters.find(param => param.name.getText() === paramName && param.type === undefined);
        if (isNumeric) {
            return;
        }
        if (matchingParam && paramName !== '') {
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
    }
    checkParentCallExpression(parentParentParent, parentParentParentParent, arkFile, positionInfo) {
        if ((arkanalyzer_1.ts.isParenthesizedExpression(parentParentParent)) && parentParentParentParent.kind === arkanalyzer_1.ts.SyntaxKind.CallExpression) {
            if (arkanalyzer_1.ts.isCallExpression(parentParentParentParent)) {
                if (parentParentParentParent.arguments.length > 0) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return true;
                }
            }
            return true;
        }
        return false;
    }
    checkStatementsForParamName(statements, paramName) {
        return statements.some(param => {
            if (arkanalyzer_1.ts.isVariableStatement(param) && arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                return param.declarationList.declarations.some(dec => dec.name.getText() === paramName);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(param)) {
                return param.name && arkanalyzer_1.ts.isIdentifier(param.name) && param.name.getText() === paramName;
            }
            return false;
        });
    }
    check = (targetMethod) => {
        const stmts = targetMethod.getBody()?.getCfg().getStmts() ?? [];
        if (!this.getFileExtension(targetMethod.getDeclaringArkClass().getDeclaringArkFile().getName(), 'ts')) {
            return;
        }
        for (const stmt of stmts) {
            if (stmt instanceof arkanalyzer_1.ArkReturnStmt) {
                if (this.checkReturnStatementBlock(stmt, targetMethod)) {
                    return;
                }
            }
        }
    };
    checkReturnStatementBlock(stmt, targetMethod) {
        if (stmt.getOp()) {
            const type = stmt.getOp().getType();
            if (type instanceof arkanalyzer_1.ClassType && !this.isAllowedClassType(type)) {
                return true;
            }
            if (this.isUnionType(type)) {
                return true;
            }
        }
        if (this.analyzeReturnStmt(stmt)) {
            return true;
        }
        this.checkReturnType(stmt, targetMethod.getCode() ?? '');
        return false;
    }
    isAllowedClassType(type) {
        const className = type.getClassSignature().getClassName();
        return className === 'Map' || className === 'Set';
    }
    isUnionType(type) {
        return type instanceof arkanalyzer_1.UnionType;
    }
    checkReturnStatement(node, foundAnyKeyword) {
        if (!arkanalyzer_1.ts.isReturnStatement(node)) {
            return;
        }
        const expr = node.expression;
        if (!expr || !arkanalyzer_1.ts.isAsExpression(expr)) {
            return;
        }
        const typeRef = expr.type;
        if (!arkanalyzer_1.ts.isTypeReferenceNode(typeRef)) {
            return;
        }
        if (typeRef.typeArguments?.some(typeArg => arkanalyzer_1.ts.isArrayTypeNode(typeArg) && typeArg.elementType.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword)) {
            return;
        }
        if (typeRef.typeArguments?.some(typeArg => typeArg.kind !== arkanalyzer_1.ts.SyntaxKind.AnyKeyword)) {
            foundAnyKeyword.value = true;
        }
    }
    checkExpressionStatement(node, foundAnyKeyword) {
        if (arkanalyzer_1.ts.isExpressionStatement(node) || arkanalyzer_1.ts.isReturnStatement(node)) {
            if (node.expression && arkanalyzer_1.ts.isArrayLiteralExpression(node.expression)) {
                if (node.expression.elements.length === 0) {
                    foundAnyKeyword.value = true;
                }
            }
            else if (node.expression && arkanalyzer_1.ts.isNewExpression(node.expression)) {
                if (arkanalyzer_1.ts.isIdentifier(node.expression.expression) && node.expression.expression.getText() === 'Array' &&
                    node.expression.arguments?.length === 0) {
                    foundAnyKeyword.value = true;
                }
            }
        }
    }
    analyzeReturnStmt(stmt) {
        const code = stmt.getOriginalText() || '';
        const asRoot = arkanalyzer_1.AstTreeUtils.getASTNode('example.ts', code);
        const foundAnyKeyword = { value: false };
        arkanalyzer_1.ts.forEachChild(asRoot, node => {
            this.checkReturnStatement(node, foundAnyKeyword);
            this.checkExpressionStatement(node, foundAnyKeyword);
        });
        return foundAnyKeyword.value;
    }
    checkReturnType(stmt, methodCode) {
        if (stmt.getOp().getType().getTypeString().includes('any')) {
            if (!this.checkUnknownBeforeBrace(methodCode)) {
                const code = stmt.getOriginalText() || '';
                const asRoot = arkanalyzer_1.AstTreeUtils.getASTNode('example.ts', code);
                let des = this.metaData.description;
                arkanalyzer_1.ts.forEachChild(asRoot, node => {
                    des = this.checkReturnOrExpressionStatement(node, des);
                });
                this.addIssueReport(stmt, des);
            }
        }
    }
    checkReturnOrExpressionStatement(node, des) {
        if (arkanalyzer_1.ts.isReturnStatement(node) || arkanalyzer_1.ts.isExpressionStatement(node)) {
            if (node.expression && arkanalyzer_1.ts.isAsExpression(node.expression)) {
                if (arkanalyzer_1.ts.isArrayLiteralExpression(node.expression.expression) && node.expression?.type?.getText() === 'any[]') {
                    des = 'Unsafe return of an `any[]` typed value.';
                }
                if (node.expression?.type?.getText() === 'readonly any[]') {
                    des = 'Unsafe return of an `any[]` typed value.';
                }
                if (arkanalyzer_1.ts.isTypeReferenceNode(node.expression.type) && node.expression.type.typeName.getText() === 'Array') {
                    des = 'Unsafe return of an `any[]` typed value.';
                }
            }
            else if (node.expression && arkanalyzer_1.ts.isNewExpression(node.expression)) {
                if (arkanalyzer_1.ts.isIdentifier(node.expression.expression) && node.expression.expression.getText() === 'Set') {
                    des = 'Unsafe return of type `Set<any>` from function with return type `Set<string>`.';
                }
                if (arkanalyzer_1.ts.isIdentifier(node.expression.expression) && node.expression.expression.getText() === 'Array') {
                    des = 'Unsafe return of an `any[]` typed value.';
                }
            }
        }
        return des;
    }
    checkUnknownBeforeBrace(code) {
        return this.regex.test(code);
    }
    getFileExtension(filePath, filetype) {
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
    }
    addIssueReport(stmt, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        const defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, message, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
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
    addArkIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    getLineAndColumn(stmt) {
        const originalPositions = stmt.getOriginPositionInfo();
        if (originalPositions) {
            const line = originalPositions.getLineNo();
            const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
            if (arkFile) {
                let startCol = originalPositions.getColNo();
                const endCol = originalPositions.getColNo();
                const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
                return { line, startCol, endCol, filePath: filePath };
            }
            else {
                logger.debug('originStmt or arkFile is null');
            }
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.NoUnsafeReturnCheck = NoUnsafeReturnCheck;
