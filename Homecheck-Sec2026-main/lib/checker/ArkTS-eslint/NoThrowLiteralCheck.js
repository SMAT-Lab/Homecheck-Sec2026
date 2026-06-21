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
exports.NoThrowLiteralCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoThrowLiteralCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-throw-literal.md",
    description: "Expected an error object to be thrown.",
};
class NoThrowLiteralCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    allowThrowingAny = false;
    allowThrowingUnknown = false;
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (arkFile) => {
        if (this.rule && this.rule.option) {
            const option = this.rule.option;
            if (option.length > 0) {
                this.allowThrowingAny = option[0].allowThrowingAny;
                this.allowThrowingUnknown = option[0].allowThrowingUnknown;
            }
        }
        const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(asRoot);
        if (sourceFileObject == undefined) {
            return;
        }
        this.loopNode(arkFile, asRoot, sourceFileObject);
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isThrowStatement(child)) {
                this.processThrowAST(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    processThrowAST(child, sourceFile, arkFile) {
        let positionInfo = this.getPositionInfo(child.expression, sourceFile);
        if (child.expression && arkanalyzer_1.ts.isPropertyAccessExpression(child.expression)) {
            this.handlePropertyAccessExpression(child.expression, sourceFile, arkFile, positionInfo);
        }
        if (child.expression && arkanalyzer_1.ts.isCallExpression(child.expression)) {
            this.handleCallExpression(child.expression, sourceFile, arkFile, positionInfo);
        }
        if (child.expression && arkanalyzer_1.ts.isIdentifier(child.expression)) {
            this.handleIdentifier(child.expression, sourceFile, arkFile, positionInfo);
            this.handleThrowStatementInBlock(child, arkFile, positionInfo);
        }
        if (child.expression && arkanalyzer_1.ts.isNewExpression(child.expression)) {
            this.handleNewExpression(child.expression, sourceFile, arkFile, positionInfo);
        }
        if (child.expression && (arkanalyzer_1.ts.isAsExpression(child.expression) ||
            arkanalyzer_1.ts.isTypeAssertionExpression(child.expression) || arkanalyzer_1.ts.isSatisfiesExpression(child.expression))) {
            const typeNode = child.expression.type;
            if (arkanalyzer_1.ts.isTypeReferenceNode(typeNode) && arkanalyzer_1.ts.isIdentifier(typeNode.typeName) && typeNode.typeName.getText() !== 'Error') {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
        }
        if (child.expression && arkanalyzer_1.ts.isPrefixUnaryExpression(child.expression)) {
            if (arkanalyzer_1.ts.isNumericLiteral(child.expression.operand)) {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
        }
        this.handleOtherExpressions(child.expression, sourceFile, arkFile, positionInfo);
    }
    handleThrowStatementInBlock(child, arkFile, positionInfo) {
        if (arkanalyzer_1.ts.isBlock(child.parent) && child.expression.getText() !== 'e') {
            if (arkanalyzer_1.ts.isIfStatement(child.parent.parent)) {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
            this.checkCatchClauseThrowExpression(child, arkFile, positionInfo);
        }
    }
    checkCatchClauseThrowExpression(child, arkFile, positionInfo) {
        if (arkanalyzer_1.ts.isCatchClause(child.parent.parent)) {
            const identifier = child.expression.getText();
            const variableDeclaration = child.parent.parent.variableDeclaration;
            if (variableDeclaration && arkanalyzer_1.ts.isVariableDeclaration(variableDeclaration) && arkanalyzer_1.ts.isIdentifier(variableDeclaration.name)) {
                if (variableDeclaration.name.getText() !== identifier) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                }
            }
        }
    }
    handlePropertyAccessExpression(expression, sourceFile, arkFile, positionInfo) {
        const name = expression.name.getText();
        const className = this.getClassNameFromExpression(expression.expression);
        if (!className) {
            return;
        }
        const variableDeclaration = this.findVariableDeclaration(sourceFile, className);
        if (!variableDeclaration) {
            return;
        }
        const initializer = variableDeclaration.initializer;
        if (!initializer || !arkanalyzer_1.ts.isObjectLiteralExpression(initializer)) {
            return;
        }
        for (const property of initializer.properties) {
            if (arkanalyzer_1.ts.isPropertyAssignment(property) && property.name.getText() === name) {
                if (this.isCommonKind(property.initializer.kind)) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    break;
                }
            }
        }
    }
    getClassNameFromExpression(expression) {
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            return expression.getText();
        }
        return '';
    }
    findVariableDeclaration(sourceFile, className) {
        for (const node of sourceFile.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(node)) {
                const declaration = node.declarationList.declarations
                    .find(decl => decl.name.getText() === className);
                if (declaration) {
                    return declaration;
                }
            }
        }
        return undefined;
    }
    handleCallExpression(expression, sourceFile, arkFile, positionInfo) {
        const name = expression.expression.getText();
        const functionDeclaration = this.findFunctionDeclaration(sourceFile, name);
        if (!functionDeclaration) {
            return;
        }
        for (const childNode of functionDeclaration.body.statements) {
            if (arkanalyzer_1.ts.isReturnStatement(childNode) && childNode.expression) {
                if (this.isCommonKind(childNode.expression.kind)) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    break;
                }
            }
        }
    }
    findFunctionDeclaration(sourceFile, name) {
        for (const node of sourceFile.statements) {
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) && node.name?.getText() === name) {
                return node;
            }
        }
        return undefined;
    }
    handleIdentifier(expression, sourceFile, arkFile, positionInfo) {
        let name = expression.getText();
        this.checkVariableDeclarations(name, sourceFile, arkFile, positionInfo);
        this.checkFunctionParameters(name, expression, arkFile, positionInfo);
        this.checkUndefined(name, arkFile, positionInfo);
    }
    checkVariableDeclarations(name, sourceFile, arkFile, positionInfo) {
        for (const node of sourceFile.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(node)) {
                this.processVariableDeclarationByName(node, name, arkFile, positionInfo);
            }
        }
    }
    processVariableDeclarationByName(node, name, arkFile, positionInfo) {
        for (let declaration of node.declarationList.declarations) {
            const nameText = declaration.name.getText();
            if (nameText === name) {
                this.checkDeclarationInitializer(declaration, arkFile, positionInfo);
                this.checkDeclarationType(declaration, arkFile, positionInfo);
                this.checkNewExpression(declaration, arkFile, positionInfo);
                break;
            }
        }
    }
    checkDeclarationInitializer(declaration, arkFile, positionInfo) {
        if (declaration.initializer && this.isCommonKind(declaration.initializer.kind)) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
        if (declaration.initializer && arkanalyzer_1.ts.isAsExpression(declaration.initializer)) {
            this.checkAsExpression(declaration.initializer, arkFile, positionInfo);
        }
    }
    checkAsExpression(asExpression, arkFile, positionInfo) {
        if (asExpression.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword && !this.allowThrowingAny) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
        else if (asExpression.type.kind === arkanalyzer_1.ts.SyntaxKind.UnknownKeyword && !this.allowThrowingUnknown) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
    }
    checkDeclarationType(declaration, arkFile, positionInfo) {
        if (declaration.type) {
            if (declaration.type.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword) {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
            else if (declaration.type.kind === arkanalyzer_1.ts.SyntaxKind.UnknownKeyword && !this.allowThrowingUnknown) {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
        }
    }
    checkNewExpression(declaration, arkFile, positionInfo) {
        if (declaration.initializer && arkanalyzer_1.ts.isNewExpression(declaration.initializer)) {
            let name = declaration.initializer.expression.getText();
            if (!name.includes('Error')) {
                this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
        }
    }
    checkFunctionParameters(name, expression, arkFile, positionInfo) {
        if (expression.parent && expression.parent.parent && arkanalyzer_1.ts.isFunctionDeclaration(expression.parent.parent)) {
            expression.parent.parent.parameters.forEach((param) => {
                if (param.name.getText() === name) {
                    this.checkParameterType(param, arkFile, positionInfo);
                }
            });
        }
    }
    checkParameterType(param, arkFile, positionInfo) {
        if (param.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword && !this.allowThrowingAny) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
        else if (param.type.kind === arkanalyzer_1.ts.SyntaxKind.UnknownKeyword && !this.allowThrowingUnknown) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
    }
    checkUndefined(name, arkFile, positionInfo) {
        if (name === 'undefined') {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Do not throw undefined.');
        }
    }
    handleNewExpression(expression, sourceFile, arkFile, positionInfo) {
        if (expression.expression && arkanalyzer_1.ts.isIdentifier(expression.expression)) {
            let name = expression.expression.getText();
            for (const node of sourceFile.statements) {
                if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                    this.checkClassDeclaration(node, name, arkFile, positionInfo);
                }
            }
        }
    }
    checkClassDeclaration(node, name, arkFile, positionInfo) {
        if (node.name?.getText() !== name) {
            return;
        }
        if (!node.heritageClauses) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            return;
        }
        for (const heritageClause of node.heritageClauses) {
            if (!arkanalyzer_1.ts.isHeritageClause(heritageClause)) {
                continue;
            }
            for (const type of heritageClause.types) {
                if (arkanalyzer_1.ts.isExpressionWithTypeArguments(type) && !type.expression.getText().includes('Error')) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return;
                }
            }
        }
    }
    handleOtherExpressions(expression, sourceFile, arkFile, positionInfo) {
        if (expression.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword ||
            expression.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword ||
            expression.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
        if (arkanalyzer_1.ts.isTemplateExpression(expression) ||
            arkanalyzer_1.ts.isBinaryExpression(expression) ||
            arkanalyzer_1.ts.isNumericLiteral(expression) ||
            arkanalyzer_1.ts.isStringLiteral(expression) ||
            arkanalyzer_1.ts.isObjectLiteralExpression(expression)) {
            this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
            if (arkanalyzer_1.ts.isBinaryExpression(expression.expression)) {
                if (arkanalyzer_1.ts.isStringLiteral(expression.expression.right)) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                }
            }
        }
        if (arkanalyzer_1.ts.isAsExpression(expression)) {
            if (expression.type) {
                if (expression.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword && !this.allowThrowingAny) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                }
                else if (expression.type.kind === arkanalyzer_1.ts.SyntaxKind.UnknownKeyword && !this.allowThrowingUnknown) {
                    this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                }
            }
        }
    }
    isCommonKind(kind) {
        const excludedKinds = [
            arkanalyzer_1.ts.SyntaxKind.StringLiteral,
            arkanalyzer_1.ts.SyntaxKind.FalseKeyword,
            arkanalyzer_1.ts.SyntaxKind.TrueKeyword,
            arkanalyzer_1.ts.SyntaxKind.NumericLiteral,
            arkanalyzer_1.ts.SyntaxKind.BigIntLiteral
        ];
        return kind === undefined ? false : (excludedKinds.includes(kind));
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
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoThrowLiteralCheck = NoThrowLiteralCheck;
