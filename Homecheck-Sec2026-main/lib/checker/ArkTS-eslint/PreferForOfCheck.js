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
exports.PreferForOfCheck = void 0;
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
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferForOfCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/prefer-for-of.md",
    description: "Enforce the use of `for-of` loop over the standard `for` loop where possible",
};
class PreferForOfCheck {
    metaData = gMetaData;
    defects = [];
    issues = [];
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    filePath = "";
    registerMatchers() {
        const matchfileBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchfileBuildCb];
    }
    check = (targetField) => {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        this.filePath = targetField.getFilePath();
        this.checkForOfUsage(sourceFile);
    };
    checkForOfUsage(sourceFile) {
        const results = [];
        const visitNode = (node) => {
            if (lib_1.ts.isForStatement(node)) {
                this.checkForStatement(node, sourceFile);
            }
            lib_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return results;
    }
    isSingleVariableDeclaration(node) {
        return (lib_1.ts.isVariableDeclarationList(node) &&
            node.declarations.length === 1 &&
            lib_1.ts.isIdentifier(node.declarations[0].name));
    }
    isZeroInitialized(node) {
        return (node.initializer !== undefined &&
            lib_1.ts.isNumericLiteral(node.initializer) &&
            node.initializer.text === '0');
    }
    isLessThanLengthExpression(node, indexName) {
        if (lib_1.ts.isBinaryExpression(node) &&
            node.operatorToken.kind === lib_1.ts.SyntaxKind.LessThanToken &&
            lib_1.ts.isIdentifier(node.left) &&
            node.left.text === indexName &&
            lib_1.ts.isPropertyAccessExpression(node.right) &&
            lib_1.ts.isIdentifier(node.right.name) &&
            node.right.name.text === 'length') {
            return node.right.expression;
        }
        return null;
    }
    isIncrement(node, indexName) {
        return this.checkPlusPlusIncrement(node, indexName) ||
            this.checkCompoundAssignment(node, indexName);
    }
    checkPlusPlusIncrement(node, indexName) {
        return (lib_1.ts.isPrefixUnaryExpression(node) || lib_1.ts.isPostfixUnaryExpression(node)) &&
            node.operator === lib_1.ts.SyntaxKind.PlusPlusToken &&
            lib_1.ts.isIdentifier(node.operand) &&
            node.operand.text === indexName;
    }
    checkCompoundAssignment(node, indexName) {
        if (!lib_1.ts.isBinaryExpression(node)) {
            return false;
        }
        return this.checkPlusEquals(node, indexName) ||
            this.checkAssignmentWithBinaryExpression(node, indexName);
    }
    checkPlusEquals(node, indexName) {
        return node.operatorToken.kind === lib_1.ts.SyntaxKind.PlusEqualsToken &&
            lib_1.ts.isIdentifier(node.left) &&
            node.left.text === indexName &&
            lib_1.ts.isNumericLiteral(node.right) &&
            node.right.text === '1';
    }
    checkAssignmentWithBinaryExpression(node, indexName) {
        if (node.operatorToken.kind !== lib_1.ts.SyntaxKind.EqualsToken) {
            return false;
        }
        if (!lib_1.ts.isBinaryExpression(node.right)) {
            return false;
        }
        const { left, right, operatorToken } = node.right;
        return operatorToken.kind === lib_1.ts.SyntaxKind.PlusToken && ((lib_1.ts.isIdentifier(left) && left.text === indexName &&
            lib_1.ts.isNumericLiteral(right) && right.text === '1') ||
            (lib_1.ts.isNumericLiteral(left) && left.text === '1' &&
                lib_1.ts.isIdentifier(right) && right.text === indexName));
    }
    isIndexOnlyUsedWithArray(body, indexName, arrayExpression, sourceFile) {
        const arrayText = arrayExpression.getText(sourceFile);
        let indexUsedOutsideArrayAccess = false;
        const checkNode = (node, outerScope) => {
            this.handleVariableDeclaration(node, indexName, outerScope);
            if (this.handleElementAccess(node, arrayText, indexName, sourceFile)) {
                return;
            }
            indexUsedOutsideArrayAccess ||= this.handleAssignment(node, arrayText, indexName, sourceFile);
            indexUsedOutsideArrayAccess ||= this.checkIdentifierUsage(node, indexName, outerScope);
            const parentScope = new Set(outerScope);
            lib_1.ts.forEachChild(node, (childNode) => checkNode(childNode, parentScope));
        };
        checkNode(body, new Set());
        return !indexUsedOutsideArrayAccess;
    }
    handleVariableDeclaration(node, indexName, outerScope) {
        if (lib_1.ts.isVariableDeclarationList(node)) {
            for (const declaration of node.declarations) {
                if (lib_1.ts.isIdentifier(declaration.name) && declaration.name.text === indexName) {
                    outerScope.add(indexName);
                }
            }
        }
    }
    handleElementAccess(node, arrayText, indexName, sourceFile) {
        if (lib_1.ts.isElementAccessExpression(node)) {
            if (lib_1.ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
                return true;
            }
            const objectText = node.expression.getText(sourceFile);
            return objectText === arrayText &&
                lib_1.ts.isIdentifier(node.argumentExpression) &&
                node.argumentExpression.text === indexName;
        }
        return false;
    }
    handleAssignment(node, arrayText, indexName, sourceFile) {
        if (lib_1.ts.isBinaryExpression(node) &&
            node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken &&
            lib_1.ts.isElementAccessExpression(node.left)) {
            const objectText = node.left.expression.getText(sourceFile);
            return objectText === arrayText &&
                lib_1.ts.isIdentifier(node.left.argumentExpression) &&
                node.left.argumentExpression.text === indexName;
        }
        return false;
    }
    checkIdentifierUsage(node, indexName, outerScope) {
        return lib_1.ts.isIdentifier(node) &&
            node.text === indexName &&
            !outerScope.has(indexName);
    }
    checkForStatement(node, sourceFile) {
        if (!this.isValidInitializer(node.initializer)) {
            return;
        }
        const indexName = this.getIndexNameFromDeclaration(node.initializer);
        if (!indexName) {
            return;
        }
        const { isValidCondition, arrayExpression } = this.checkCondition(node.condition, indexName);
        if (!isValidCondition || !this.checkIncrementor(node.incrementor, indexName)) {
            return;
        }
        if (this.shouldReportIssue(node.statement, indexName, arrayExpression, sourceFile)) {
            this.generateIssueReport(node, sourceFile);
        }
    }
    isValidInitializer(initializer) {
        return !!initializer &&
            lib_1.ts.isVariableDeclarationList(initializer) &&
            this.isSingleVariableDeclaration(initializer) &&
            this.isZeroInitialized(initializer.declarations[0]);
    }
    getIndexNameFromDeclaration(initializer) {
        const name = initializer.declarations[0].name;
        return lib_1.ts.isIdentifier(name) ? name.text : null;
    }
    checkCondition(condition, indexName) {
        return {
            isValidCondition: condition !== undefined,
            arrayExpression: condition ? this.isLessThanLengthExpression(condition, indexName) : null
        };
    }
    checkIncrementor(incrementor, indexName) {
        return !!incrementor && this.isIncrement(incrementor, indexName);
    }
    shouldReportIssue(statement, indexName, arrayExpression, sourceFile) {
        return !!arrayExpression &&
            this.isIndexOnlyUsedWithArray(statement, indexName, arrayExpression, sourceFile);
    }
    generateIssueReport(node, sourceFile) {
        const startPos = node.getStart(sourceFile, true);
        const endPos = node.getEnd();
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, startPos);
        const { character: endChar } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, endPos);
        const message = 'Expected a `for-of` loop instead of a `for` loop with this simple iteration.';
        this.addIssueReport(line + 1, character + 1, endChar + 1, this.filePath, message);
    }
    async addIssueReport(line, startCol, endCol, filePath, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const description = message;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.PreferForOfCheck = PreferForOfCheck;
