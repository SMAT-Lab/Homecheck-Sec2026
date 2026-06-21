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
exports.NoDynamicDeleteCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Index_1 = require("../../Index");
;
;
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoDynamicDeleteCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: "docs/no-dynamic-delete.md",
    description: "Do not delete dynamically computed property keys."
};
class NoDynamicDeleteCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    classMatcher = {
        file: [this.fileMatcher],
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.classMatcher]
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    issueMap = new Map();
    check = (targetField) => {
        if (this.getFileExtension(targetField.getName()) !== '.ets') {
            this.processNonEtsFile(targetField);
        }
    };
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    processNonEtsFile(targetField) {
        const variableNameArray = this.checkVariableName(targetField);
        const deleteExpressions = this.findDeleteExpressions(targetField);
        this.processMatchingExpressions(targetField, variableNameArray, deleteExpressions);
    }
    findDeleteExpressions(targetField) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const deleteExpressions = [];
        function traverse(node) {
            if (lib_1.ts.isDeleteExpression(node)) {
                const text = node.getText();
                if (text) {
                    deleteExpressions.push(text);
                }
            }
            lib_1.ts.forEachChild(node, childNode => traverse(childNode));
        }
        traverse(sourceFile);
        return deleteExpressions;
    }
    processMatchingExpressions(targetField, variableNames, deleteExpressions) {
        if (variableNames.length === 0 || deleteExpressions.length === 0) {
            return;
        }
        ;
        for (const deleteExpression of deleteExpressions) {
            this.processSingleExpression(targetField, variableNames, deleteExpression);
        }
        this.reportSortedIssues();
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => Index_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    processSingleExpression(targetField, variableNames, expression) {
        for (const variableName of variableNames) {
            if (expression.includes(variableName) || this.dynamicDeletePattern(expression)) {
                this.processMatchingVariables(targetField, expression, variableName);
            }
        }
    }
    dynamicDeletePattern(code) {
        return /delete\s+[\w.]+(\[.*?\])+/g.test(code);
    }
    processMatchingVariables(targetField, expression, variableName) {
        const deleteProperties = this.extractPropertyKeysFromDeleteExpressions(expression);
        if (deleteProperties.length === 0) {
            return;
        }
        ;
        for (const deleteProperty of deleteProperties) {
            this.getDeletePropertyPosition(targetField, expression, deleteProperty);
        }
    }
    getDeletePropertyPosition(targetFile, deleteExpressionText, propertyName) {
        const sourceFile = this.getSourceFile(targetFile);
        const foundPositions = [];
        this.traverseAST(sourceFile, (node) => {
            const position = this.handleDeleteExpression(node, targetFile, deleteExpressionText, propertyName);
            position && foundPositions.push(position);
        });
        return foundPositions.length > 0 ? foundPositions : null;
    }
    getSourceFile(targetFile) {
        const code = targetFile.getCode();
        return lib_1.AstTreeUtils.getASTNode('temp.ts', code);
    }
    traverseAST(sourceFile, callback) {
        const visitor = (node) => {
            callback(node);
            lib_1.ts.forEachChild(node, visitor);
        };
        visitor(sourceFile);
    }
    handleDeleteExpression(node, targetFile, deleteExpressionText, propertyName) {
        if (!lib_1.ts.isDeleteExpression(node) || node.getText() !== deleteExpressionText) {
            return null;
        }
        const expression = node.expression;
        if (lib_1.ts.isElementAccessExpression(expression)) {
            return this.processElementAccess(expression, targetFile, propertyName);
        }
        return null;
    }
    processElementAccess(expression, targetFile, propertyName) {
        const argumentExpression = expression.argumentExpression;
        const { pos, end, fixText } = this.calculateFixPosition(argumentExpression, propertyName);
        return this.reportAndCreateFix(argumentExpression, targetFile, propertyName, pos, end, fixText);
    }
    calculateFixPosition(argumentExpression, propertyName) {
        const argText = argumentExpression.getText();
        const index = propertyName.indexOf(argText);
        if (index === 0) {
            return {
                pos: argumentExpression.getStart(),
                end: argumentExpression.getEnd(),
                fixText: propertyName
            };
        }
        return this.handleComplexFixCase(argumentExpression, propertyName);
    }
    handleComplexFixCase(argumentExpression, propertyName) {
        if (lib_1.ts.isBinaryExpression(argumentExpression)) {
            return {
                pos: argumentExpression.getStart(),
                end: argumentExpression.getEnd(),
                fixText: propertyName
            };
        }
        return {
            pos: argumentExpression.getStart() - 1,
            end: argumentExpression.getEnd() + 1,
            fixText: `.${propertyName}`
        };
    }
    reportAndCreateFix(argumentExpression, targetFile, propertyName, pos, end, fixText) {
        const propertyNameStart = this.getPropertyNameStart(argumentExpression, propertyName);
        if (propertyNameStart === -1) {
            return null;
        }
        ;
        const positionInfo = this.getPositionInfo(argumentExpression, propertyNameStart);
        const defect = this.addIssueReport(targetFile, positionInfo);
        if (defect) {
            const fix = this.ruleFix(pos, end, fixText);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
        return { line: positionInfo.line, character: positionInfo.character };
    }
    getPropertyNameStart(argumentExpression, propertyName) {
        const argText = argumentExpression.getText();
        const position = lib_1.ts.isStringLiteral(argumentExpression) ?
            argText.indexOf(propertyName) :
            argText.indexOf(propertyName) + 1;
        return position !== -1 ? argumentExpression.getStart() + position : -1;
    }
    getPositionInfo(argumentExpression, propertyNameStart) {
        const sourceFile = argumentExpression.getSourceFile();
        const position = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, propertyNameStart);
        return { line: position.line + 1, character: position.character };
    }
    extractPropertyKeysFromDeleteExpressions(code) {
        const sourceFile = lib_1.AstTreeUtils.getASTNode('temp.ts', code);
        const propertyKeys = [];
        const isAlphabetic = this.createAlphabeticChecker();
        const visit = (node) => {
            if (lib_1.ts.isDeleteExpression(node)) {
                this.processDeleteExpression(node, propertyKeys, isAlphabetic);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return propertyKeys;
    }
    createAlphabeticChecker() {
        return (str) => {
            return /^[A-Za-z]+$/.test(str);
        };
    }
    processDeleteExpression(node, propertyKeys, isAlphabetic) {
        const expression = node.expression;
        if (lib_1.ts.isElementAccessExpression(expression)) {
            this.handleElementAccess(expression.argumentExpression, propertyKeys, isAlphabetic);
        }
    }
    handleElementAccess(argument, propertyKeys, isAlphabetic) {
        if (lib_1.ts.isStringLiteral(argument)) {
            this.handleStringLiteral(argument, propertyKeys, isAlphabetic);
        }
        else if (lib_1.ts.isIdentifier(argument)) {
            this.handleIdentifier(argument, propertyKeys, isAlphabetic);
        }
        else if (lib_1.ts.isPropertyAccessExpression(argument)) {
            propertyKeys.push(argument.getText());
        }
        else {
            this.handleComplexExpression(argument, propertyKeys, isAlphabetic);
        }
    }
    handleComplexExpression(expr, propertyKeys, isAlphabetic) {
        const text = expr.getText();
        if (lib_1.ts.isCallExpression(expr) || lib_1.ts.isBinaryExpression(expr) || this.strictArrayPattern(text)) {
            propertyKeys.push(text);
        }
        else if (/^[+-]/.test(text)) {
            this.handleSpecialPrefix(text, propertyKeys, isAlphabetic);
        }
    }
    strictArrayPattern(code) {
        return /\[([a-zA-Z_$][\w$]*)\]/g.test(code);
    }
    handleSpecialPrefix(text, propertyKeys, isAlphabetic) {
        const target = text.substring(1);
        if (isAlphabetic(target)) {
            propertyKeys.push(text);
        }
    }
    createTraverseHandler(variableNames) {
        return (node) => {
            if (!lib_1.ts.isVariableStatement(node)) {
                return;
            }
            ;
            for (const declaration of node.declarationList.declarations) {
                const name = declaration.name.getText().trim();
                if (name) {
                    variableNames.push(name);
                }
                ;
            }
        };
    }
    checkVariableName(targetField) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const variableNames = [];
        const traverse = this.createTraverseHandler(variableNames);
        lib_1.ts.forEachChild(sourceFile, child => this.deepTraverse(child, traverse));
        return variableNames;
    }
    deepTraverse(node, callback) {
        callback(node);
        lib_1.ts.forEachChild(node, child => this.deepTraverse(child, callback));
    }
    ruleFix(pos, end, fixText) {
        return { range: [pos, end], text: fixText };
    }
    handleStringLiteral(node, propertyKeys, isAlphabetic) {
        if (isAlphabetic(node.text) && !node.text.includes('+') && !node.text.includes('-')) {
            propertyKeys.push(node.text);
        }
    }
    handleIdentifier(node, propertyKeys, isAlphabetic) {
        if (isAlphabetic(node.getText())) {
            propertyKeys.push(node.getText());
        }
    }
    getLineAndColumn(arkfile, lineColumn) {
        if (arkfile) {
            const originPath = arkfile.getFilePath();
            return { line: lineColumn.line, startCol: lineColumn.character, endCol: lineColumn.character, filePath: originPath };
        }
        else {
            logger.debug('arkFile is null');
        }
        return null;
    }
    addIssueReport(arkFile, lineAndColumn) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, lineAndColumn);
        this.metaData.description = this.metaData.description;
        if (warnInfo) {
            const filePath = arkFile.getFilePath();
            let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
            this.defects.push(defects);
            return defects;
        }
        return null;
    }
}
exports.NoDynamicDeleteCheck = NoDynamicDeleteCheck;
