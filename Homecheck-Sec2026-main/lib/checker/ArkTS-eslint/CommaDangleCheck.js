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
exports.CommaDangleCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, "CommaDangleCheck");
class CommaDangleCheck {
    metaData = {
        severity: 2,
        ruleDocPath: "docs/comma-dangle.md",
        description: "Require or disallow trailing commas",
    };
    issues = [];
    defects = [];
    rule;
    Special = /,\s*,/;
    Trailing1 = /,\s*\]/;
    Trailing2 = /,\s*}/;
    CommasAndSpaces = /[\[\]\s,\n\r]/g;
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [matchFileCb];
    }
    getRuleOption(type) {
        const option = this.rule.option?.[0];
        if (typeof option === 'string') {
            return option;
        }
        return typeof option === 'object' ? option[type] || 'never' : 'never';
    }
    check = (target) => {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const visit = (node) => {
            if (lib_1.ts.isArrayLiteralExpression(node)) {
                this.checkTrailingComma(node, target, 'arrays');
            }
            else if (lib_1.ts.isObjectLiteralExpression(node)) {
                this.checkTrailingComma(node, target, 'objects');
            }
            if (lib_1.ts.isEnumDeclaration(node)) {
                const ruleOption = this.getRuleOption('enums');
                this.checkEnumTrailingComma(node, target, ruleOption);
            }
            if (lib_1.ts.isFunctionDeclaration(node)) {
                this.checkFunction(node, target);
            }
            if (lib_1.ts.isTupleTypeNode(node)) {
                const ruleOption = this.getRuleOption('tuples');
                this.checkTupleTrailingComma(node, target, ruleOption);
            }
            if (lib_1.ts.isImportDeclaration(node)) {
                const ruleOption = this.getRuleOption('imports');
                this.checkImportExportTrailingComma(node, target, ruleOption);
            }
            if (lib_1.ts.isExportDeclaration(node)) {
                const ruleOption = this.getRuleOption('exports');
                this.checkImportExportTrailingComma(node, target, ruleOption);
            }
            if (lib_1.ts.isCallExpression(node)) {
                this.checkFunctionTrailingComma(node, target);
            }
            if (lib_1.ts.isNewExpression(node)) {
                this.checkFunctionTrailingComma(node, target);
            }
            if (lib_1.ts.isObjectBindingPattern(node)) {
                this.checkObjectBindingPattern(node, target, 'objects');
            }
            if (lib_1.ts.isArrowFunction(node)) {
                this.checkArrowFunctionComma(node, target);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(sourceFile, visit);
        this.issues.sort((a, b) => {
            if (a.defect.reportLine !== b.defect.reportLine) {
                return a.defect.reportLine - b.defect.reportLine;
            }
            return a.defect.reportColumn - b.defect.reportColumn;
        });
    };
    checkFunction(node, target) {
        this.checkFunctionTrailingComma(node, target);
        if (node.typeParameters) {
            const genericRuleOption = this.getRuleOption('generics');
            if (genericRuleOption !== 'ignore') {
                this.checkFunctionGenericComma(node, target);
            }
        }
    }
    findTrailingCommaPos(lastElement, node) {
        const sourceText = lastElement.getSourceFile().getFullText();
        let commaPos = -1;
        let column = -1;
        for (let i = lastElement.getEnd(); i < node.getEnd(); i++) {
            if (sourceText[i] === ',') {
                let foundClosing = false;
                for (let j = i + 1; j < node.getEnd(); j++) {
                    if (!/[\s\r\n]/.test(sourceText[j])) {
                        if (sourceText[j] === '}' || sourceText[j] === ']' || sourceText[j] === '>' || sourceText[j] === ')') {
                            foundClosing = true;
                        }
                        break;
                    }
                }
                if (foundClosing) {
                    commaPos = i;
                    const lineStart = sourceText.lastIndexOf('\n', i) + 1;
                    column = i - lineStart + 1;
                    break;
                }
            }
        }
        return { pos: commaPos, column };
    }
    checkTrailingComma(node, arkFile, type) {
        const elements = lib_1.ts.isArrayLiteralExpression(node)
            ? node.elements
            : node.properties;
        if (elements.length === 0) {
            return;
        }
        if (lib_1.ts.isArrayLiteralExpression(node) && this.shouldSkipArrayCheck(node)) {
            return;
        }
        const trailingCommaInfo = this.getTrailingCommaInfo(node, elements, type);
        this.processTrailingCommaViolation(node, arkFile, type, trailingCommaInfo);
    }
    shouldSkipArrayCheck(node) {
        if (this.isArrayWithOnlyCommasAndSpaces(node)) {
            return true;
        }
        const nodeText = node.getText();
        if (this.isSpecialSpacedCommaCase(nodeText)) {
            return true;
        }
        if (this.hasConsecutiveCommasInArray(nodeText)) {
            return true;
        }
        return false;
    }
    getTrailingCommaInfo(node, elements, type) {
        const lastElement = elements[elements.length - 1];
        const sourceFile = lastElement.getSourceFile();
        const nodeText = node.getText();
        const hasTrailingComma = type === 'arrays'
            ? this.Trailing1.test(nodeText)
            : this.Trailing2.test(nodeText);
        const lastElementPos = lastElement.getEnd();
        const closeBracketPos = node.getEnd();
        const lastElementLine = sourceFile.getLineAndCharacterOfPosition(lastElementPos).line;
        const closeBracketLine = sourceFile.getLineAndCharacterOfPosition(closeBracketPos).line;
        const isMultiline = closeBracketLine > lastElementLine;
        return {
            lastElement,
            hasTrailingComma,
            isMultiline
        };
    }
    processTrailingCommaViolation(node, arkFile, type, info) {
        const context = {
            hasTrailingComma: info.hasTrailingComma,
            isMultiline: info.isMultiline
        };
        const violation = this.checkTrailingCommaViolation(this.getRuleOption(type), context);
        if (violation.hasViolation) {
            this.reportTrailingCommaViolation(node, arkFile, info, violation.message);
        }
    }
    reportTrailingCommaViolation(node, arkFile, info, message) {
        const sourceFile = info.lastElement.getSourceFile();
        const pos = info.lastElement.getEnd();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        const commaInfo = this.findTrailingCommaPos(info.lastElement, node);
        const column = commaInfo.column === -1 ? character : commaInfo.column;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line + 1, column, column + 1, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        let fix;
        if (info.hasTrailingComma) {
            const commaInfo = this.findTrailingCommaPos(info.lastElement, node);
            if (commaInfo.pos !== -1) {
                fix = { range: [commaInfo.pos, commaInfo.pos + 1], text: '' };
            }
            else {
                fix = { range: [info.lastElement.getEnd(), info.lastElement.getEnd()], text: '' };
            }
        }
        else {
            fix = { range: [info.lastElement.getEnd(), info.lastElement.getEnd()], text: ',' };
        }
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    isSpecialSpacedCommaCase(text) {
        if (this.Special.test(text)) {
            return false;
        }
        const lastClosingBracket = text.lastIndexOf(']');
        if (lastClosingBracket === -1) {
            return false;
        }
        const lastComma = text.lastIndexOf(',', lastClosingBracket);
        if (lastComma === -1) {
            return false;
        }
        const textBetweenLastCommaAndBracket = text.substring(lastComma + 1, lastClosingBracket).trim();
        if (textBetweenLastCommaAndBracket === '') {
            return false;
        }
        const prevComma = text.lastIndexOf(',', lastComma - 1);
        if (prevComma === -1) {
            return false;
        }
        if (prevComma > 0 && text[prevComma - 1] === ' ') {
            const contentBeforePrevComma = text.substring(0, prevComma - 1).trim();
            if (contentBeforePrevComma.length > 0 &&
                contentBeforePrevComma[contentBeforePrevComma.length - 1] !== ',' &&
                contentBeforePrevComma[contentBeforePrevComma.length - 1] !== '[') {
                return textBetweenLastCommaAndBracket.length > 0;
            }
        }
        return false;
    }
    isArrayWithOnlyCommasAndSpaces(node) {
        const text = node.getText();
        const contentWithoutCommasAndSpaces = text.replace(this.CommasAndSpaces, '');
        return contentWithoutCommasAndSpaces.length === 0;
    }
    checkEnumTrailingComma(node, arkFile, option) {
        if (node.members.length === 0) {
            return;
        }
        this.checkInvalidEnumValues(node, arkFile);
    }
    checkInvalidEnumValues(node, arkFile) {
        if (node.members.length === 0) {
            return;
        }
        const option = this.getRuleOption('enums');
        const sourceFile = node.getSourceFile();
        const lastMember = node.members[node.members.length - 1];
        const lastMemberEnd = lastMember.getEnd();
        const textBetweenLastMemberAndCloseBrace = sourceFile.getFullText().substring(lastMemberEnd, node.getEnd() - 1);
        const hasTrailingComma = /,\s*$/m.test(textBetweenLastMemberAndCloseBrace);
        const isMultiline = this.isMultiline(node);
        let hasViolation = false;
        let message = '';
        switch (option) {
            case 'never':
                if (hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
            case 'always':
                if (!hasTrailingComma) {
                    hasViolation = true;
                    message = 'Missing trailing comma.';
                }
                break;
            case 'always-multiline':
                if (isMultiline && !hasTrailingComma) {
                    hasViolation = true;
                    message = 'Missing trailing comma.';
                }
                else if (!isMultiline && hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
            case 'only-multiline':
                if (!isMultiline && hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
        }
        if (hasViolation) {
            this.reportInvalidEnumValue(node, arkFile, message);
        }
    }
    reportInvalidEnumValue(node, arkFile, message) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const enumKeywordPos = node.getStart();
        const ePos = enumKeywordPos;
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(ePos);
        const lineText = sourceFile.getFullText().split('\n')[line];
        const severity = this.rule.alert ?? this.metaData.severity;
        let adjustedCharacter = character;
        if (node.modifiers && node.modifiers.length > 0) {
            const enumIndex = lineText.indexOf('enum');
            adjustedCharacter = enumIndex;
        }
        const defect = new Defects_1.Defects(line + 1, adjustedCharacter + 1, adjustedCharacter + 2, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    extractGenericInfo(parent, lastParam, sourceFile) {
        const nodeText = sourceFile.getFullText().slice(parent.getFullStart(), parent.getEnd());
        const nodeFullStart = parent.getFullStart();
        const openAngleIndex = nodeText.indexOf('<');
        if (openAngleIndex === -1) {
            return null;
        }
        const closeAngleIndex = this.findMatchingCloseAngle(nodeText, openAngleIndex);
        if (closeAngleIndex === -1) {
            return null;
        }
        const genericText = nodeText.substring(openAngleIndex + 1, closeAngleIndex);
        const lastParamEnd = lastParam.getEnd() - nodeFullStart;
        const textAfterLastParam = nodeText.substring(lastParamEnd, closeAngleIndex);
        const hasTrailingComma = /,\s*$/m.test(textAfterLastParam);
        const isMultiline = genericText.split('\n').length > 1;
        return {
            nodeText,
            nodeFullStart,
            openAngleIndex,
            closeAngleIndex,
            genericText,
            lastParamEnd,
            textAfterLastParam,
            hasTrailingComma,
            isMultiline
        };
    }
    checkGenericViolationRules(option, genericInfo) {
        if (!genericInfo) {
            return { hasViolation: false, message: '' };
        }
        const genericContext = {
            hasTrailingComma: genericInfo.hasTrailingComma,
            isMultiline: genericInfo.isMultiline
        };
        return this.checkTrailingCommaViolation(option, genericContext);
    }
    reportGenericViolation(genericInfo, message, arkFile) {
        const openAnglePos = genericInfo.nodeFullStart + genericInfo.openAngleIndex;
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(openAnglePos);
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line + 1, character + 1, character + 2, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        const fix = this.createGenericFix(genericInfo);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    createGenericFix(genericInfo) {
        if (genericInfo.hasTrailingComma) {
            const textToSearch = genericInfo.textAfterLastParam;
            const match = textToSearch.match(/,/);
            if (match && match.index !== undefined) {
                const commaPos = genericInfo.nodeFullStart + genericInfo.lastParamEnd + match.index;
                return { range: [commaPos, commaPos + 1], text: '' };
            }
            const lastParamPos = genericInfo.nodeFullStart + genericInfo.lastParamEnd;
            return { range: [lastParamPos, lastParamPos], text: '' };
        }
        else {
            const lastParamPos = genericInfo.nodeFullStart + genericInfo.lastParamEnd;
            return { range: [lastParamPos, lastParamPos], text: ',' };
        }
    }
    checkFunctionGenericComma(node, arkFile) {
        if (!node.typeParameters || node.typeParameters.length === 0) {
            return;
        }
        const genericRuleOption = this.getRuleOption('generics');
        if (genericRuleOption === 'ignore') {
            return;
        }
        const lastTypeParam = node.typeParameters[node.typeParameters.length - 1];
        const sourceFile = node.getSourceFile();
        const genericInfo = this.extractGenericInfo(node, lastTypeParam, sourceFile);
        if (!genericInfo) {
            return;
        }
        const genericViolation = this.checkGenericViolationRules(genericRuleOption, genericInfo);
        if (genericViolation.hasViolation) {
            this.reportGenericViolation(genericInfo, genericViolation.message, arkFile);
        }
    }
    checkArrowGenericComma(node, arkFile) {
        const genericRuleOption = this.getRuleOption('generics');
        if (genericRuleOption === 'ignore' || !node.typeParameters || node.typeParameters.length === 0) {
            return;
        }
        const lastTypeParam = node.typeParameters[node.typeParameters.length - 1];
        const sourceFile = node.getSourceFile();
        const genericInfo = this.extractGenericInfo(node, lastTypeParam, sourceFile);
        if (!genericInfo) {
            return;
        }
        const genericViolation = this.checkGenericViolationRules(genericRuleOption, genericInfo);
        if (genericViolation.hasViolation) {
            this.reportGenericViolation(genericInfo, genericViolation.message, arkFile);
        }
    }
    checkTupleTrailingComma(node, arkFile, option) {
        if (!this.shouldCheckTuple(node)) {
            return;
        }
        const tupleText = node.getText();
        const contentWithoutCommasAndSpaces = tupleText.replace(this.CommasAndSpaces, '');
        if (contentWithoutCommasAndSpaces.length === 0) {
            return;
        }
        if (this.isSpecialSpacedCommaCase(tupleText)) {
            return;
        }
        const tupleContext = this.getTupleContext(node);
        const violation = this.checkTupleViolation(tupleContext, option);
        if (violation.hasViolation) {
            this.reportTupleViolation(node, tupleContext, violation.message, arkFile);
        }
    }
    shouldCheckTuple(node) {
        return node.elements.length > 0;
    }
    getTupleContext(node) {
        const lastElement = node.elements[node.elements.length - 1];
        const tupleText = node.getText();
        const hasTrailingComma = this.Trailing1.test(tupleText);
        const isMultiline = this.isMultiline(node);
        return {
            lastElement,
            tupleText,
            hasTrailingComma,
            isMultiline
        };
    }
    checkTupleViolation(context, option) {
        return this.checkTrailingCommaViolation(option, {
            hasTrailingComma: context.hasTrailingComma,
            isMultiline: context.isMultiline
        });
    }
    reportTupleViolation(node, context, message, arkFile) {
        const sourceFile = context.lastElement.getSourceFile();
        const tupleStart = node.getStart();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(tupleStart);
        const bracketPos = node.getStart();
        const bracketCol = sourceFile.getLineAndCharacterOfPosition(bracketPos).character + 1;
        const defect = this.createTupleDefect(line + 1, bracketCol, message, arkFile);
        const fix = this.createTupleFix(context, node);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    createTupleDefect(line, column, message, arkFile) {
        return new Defects_1.Defects(line, column, column + 1, message, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
    }
    createTupleFix(context, node) {
        if (context.hasTrailingComma) {
            const commaInfo = this.findTrailingCommaPos(context.lastElement, node);
            if (commaInfo.pos !== -1) {
                return { range: [commaInfo.pos, commaInfo.pos + 1], text: '' };
            }
            return { range: [context.lastElement.getEnd(), context.lastElement.getEnd()], text: '' };
        }
        return { range: [context.lastElement.getEnd(), context.lastElement.getEnd()], text: ',' };
    }
    hasTrailingComma(node, lastElement) {
        const sourceText = node.getSourceFile().getFullText();
        const textBetween = sourceText.substring(lastElement.getEnd(), node.getEnd());
        return /,\s*[}>)\]]/.test(textBetween);
    }
    isMultiline(node) {
        const sourceFile = node.getSourceFile();
        let startPos;
        let endPos;
        let openBracketPos;
        let closeBracketPos;
        if (lib_1.ts.isArrayLiteralExpression(node)) {
            if (node.elements.length === 0) {
                return false;
            }
            startPos = node.elements[0].getStart();
            endPos = node.elements[node.elements.length - 1].getEnd();
            openBracketPos = node.getStart();
            closeBracketPos = node.getEnd();
        }
        else if (lib_1.ts.isObjectLiteralExpression(node)) {
            if (node.properties.length === 0) {
                return false;
            }
            startPos = node.properties[0].getStart();
            endPos = node.properties[node.properties.length - 1].getEnd();
            openBracketPos = node.getStart();
            closeBracketPos = node.getEnd();
        }
        else if (lib_1.ts.isEnumDeclaration(node)) {
            if (node.members.length === 0) {
                return false;
            }
            startPos = node.members[0].getStart();
            endPos = node.members[node.members.length - 1].getEnd();
            openBracketPos = node.members.pos;
            closeBracketPos = node.members.end;
        }
        else if (lib_1.ts.isTupleTypeNode(node)) {
            if (node.elements.length === 0) {
                return false;
            }
            startPos = node.elements[0].getStart();
            endPos = node.elements[node.elements.length - 1].getEnd();
            openBracketPos = node.getStart();
            closeBracketPos = node.getEnd();
        }
        else {
            return false;
        }
        const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line;
        const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line;
        const openBracketLine = sourceFile.getLineAndCharacterOfPosition(openBracketPos).line;
        const closeBracketLine = sourceFile.getLineAndCharacterOfPosition(closeBracketPos).line;
        return closeBracketLine !== openBracketLine || endLine !== startLine || startLine !== openBracketLine;
    }
    checkImportExportTrailingComma(node, arkFile, option) {
        let elements;
        if (lib_1.ts.isImportDeclaration(node)) {
            elements = node.importClause?.namedBindings && lib_1.ts.isNamedImports(node.importClause.namedBindings)
                ? node.importClause.namedBindings.elements
                : undefined;
        }
        else {
            elements = node.exportClause && lib_1.ts.isNamedExports(node.exportClause)
                ? node.exportClause.elements
                : undefined;
        }
        if (!elements || elements.length === 0) {
            return;
        }
        const lastElement = elements[elements.length - 1];
        const hasTrailingComma = this.hasTrailingComma(node, lastElement);
        const isMultiline = this.isMultiline(node);
        this.checkAndReportViolation(option, hasTrailingComma, isMultiline, lastElement, arkFile);
    }
    hasFunctionTrailingComma(node, lastElement) {
        const sourceText = node.getSourceFile().getFullText();
        const textBetween = sourceText.substring(lastElement.getEnd(), node.getEnd());
        return /,\s*[)]/.test(textBetween);
    }
    checkFunctionTrailingComma(node, arkFile) {
        const option = this.getRuleOption('functions');
        if (lib_1.ts.isCallExpression(node)) {
            this.checkCallExpressionComma(node, arkFile, option);
            return;
        }
        if (lib_1.ts.isNewExpression(node)) {
            this.checkNewExpressionComma(node, arkFile, option);
            return;
        }
        if (lib_1.ts.isFunctionDeclaration(node)) {
            this.checkFunctionDeclarationComma(node, arkFile, option);
            return;
        }
    }
    checkCallExpressionComma(node, arkFile, option) {
        const args = node.arguments;
        if (args.length === 0) {
            return;
        }
        const lastArg = args[args.length - 1];
        if (this.isReduceMethodCall(node)) {
            this.checkReduceMethodComma(node, arkFile, option);
            return;
        }
        if (lib_1.ts.isObjectLiteralExpression(lastArg)) {
            this.checkTrailingComma(lastArg, arkFile, 'objects');
            return;
        }
        const hasTrailingComma = this.hasFunctionTrailingComma(node, lastArg);
        const isMultiline = this.isMultiline(node);
        this.checkAndReportViolation(option, hasTrailingComma, isMultiline, lastArg, arkFile);
    }
    isReduceMethodCall(node) {
        if (lib_1.ts.isPropertyAccessExpression(node.expression)) {
            const methodName = node.expression.name.getText();
            return methodName === 'reduce';
        }
        const nodeText = node.getText();
        if (nodeText.includes('.reduce<')) {
            return true;
        }
        if (node.typeArguments && node.typeArguments.length > 0) {
            const expressionText = node.expression.getText();
            if (expressionText.endsWith('.reduce')) {
                return true;
            }
        }
        return false;
    }
    checkReduceMethodComma(node, arkFile, option) {
        if (node.arguments.length === 0) {
            return;
        }
        const sourceFile = node.getSourceFile();
        const fullText = sourceFile.getFullText();
        const nodeStart = node.getStart();
        const nodeEnd = node.getEnd();
        const nodeText = fullText.substring(nodeStart, nodeEnd);
        const lines = nodeText.split('\n');
        const isMultiline = lines.length > 1;
        const callText = node.getText();
        const lastClosingParenPos = callText.lastIndexOf(')');
        if (lastClosingParenPos === -1) {
            return;
        }
        const textBeforeClosingParen = callText.substring(0, lastClosingParenPos).trim();
        const hasTrailingComma = textBeforeClosingParen.endsWith(',');
        if (isMultiline) {
            const context = {
                hasTrailingComma: hasTrailingComma,
                isMultiline: true
            };
            const violation = this.checkTrailingCommaViolation(option, context);
            if (violation.hasViolation) {
                let commaPos;
                if (hasTrailingComma) {
                    commaPos = nodeStart + textBeforeClosingParen.length - 1;
                }
                else {
                    const lastParam = node.arguments[node.arguments.length - 1];
                    commaPos = lastParam.getEnd();
                }
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(commaPos);
                const severity = this.rule.alert ?? this.metaData.severity;
                const defect = new Defects_1.Defects(line + 1, character + 1, character + 2, violation.message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
                const fix = hasTrailingComma ? { range: [commaPos, commaPos + 1], text: '' } : { range: [commaPos, commaPos], text: ',' };
                this.issues.push(new Defects_1.IssueReport(defect, fix));
                DefectsList_1.RuleListUtil.push(defect);
            }
        }
        else {
            const lastArg = node.arguments[node.arguments.length - 1];
            const hasNormalTrailingComma = this.hasFunctionTrailingComma(node, lastArg);
            this.checkAndReportViolation(option, hasNormalTrailingComma, false, lastArg, arkFile);
        }
    }
    checkNewExpressionComma(node, arkFile, option) {
        const args = node.arguments;
        if (!args || args.length === 0) {
            return;
        }
        const lastArg = args[args.length - 1];
        const hasTrailingComma = this.hasFunctionTrailingComma(node, lastArg);
        const isMultiline = this.isMultiline(node);
        this.checkAndReportViolation(option, hasTrailingComma, isMultiline, lastArg, arkFile);
    }
    checkFunctionDeclarationComma(node, arkFile, option) {
        const functionText = node.getText();
        const paramMatch = functionText.match(/\(([^)]*)\)/);
        if (paramMatch && paramMatch[1].trim()) {
            const paramText = paramMatch[1].trim();
            const lastParamMatch = paramText.match(/,\s*$/);
            const parameters = node.parameters;
            if (parameters.length > 0) {
                const lastParam = parameters[parameters.length - 1];
                const hasTrailingComma = lastParamMatch !== null;
                const isMultiline = paramText.includes('\n');
                this.checkAndReportViolation(option, hasTrailingComma, isMultiline, lastParam, arkFile);
            }
        }
    }
    checkAndReportViolation(option, hasTrailingComma, isMultiline, lastElement, arkFile) {
        const violation = this.checkViolation(option, hasTrailingComma, isMultiline);
        if (violation.hasViolation) {
            this.reportViolation(violation.message, lastElement, hasTrailingComma, arkFile);
        }
    }
    checkViolation(option, hasTrailingComma, isMultiline) {
        const message = 'never';
        const violationCheckers = {
            'never': () => this.checkNeverOption(hasTrailingComma),
            'always': () => this.checkAlwaysOption(hasTrailingComma),
            'always-multiline': () => this.checkAlwaysMultilineOption(hasTrailingComma, isMultiline),
            'only-multiline': () => this.checkOnlyMultilineOption(hasTrailingComma, isMultiline)
        };
        const checker = violationCheckers[option] || violationCheckers[message];
        return checker();
    }
    checkNeverOption(hasTrailingComma) {
        return {
            hasViolation: hasTrailingComma,
            message: 'Unexpected trailing comma.'
        };
    }
    checkAlwaysOption(hasTrailingComma) {
        return {
            hasViolation: !hasTrailingComma,
            message: 'Missing trailing comma.'
        };
    }
    checkAlwaysMultilineOption(hasTrailingComma, isMultiline) {
        if (isMultiline && !hasTrailingComma) {
            return {
                hasViolation: true,
                message: 'Missing trailing comma.'
            };
        }
        if (!isMultiline && hasTrailingComma) {
            return {
                hasViolation: true,
                message: 'Unexpected trailing comma.'
            };
        }
        return {
            hasViolation: false,
            message: ''
        };
    }
    checkOnlyMultilineOption(hasTrailingComma, isMultiline) {
        return {
            hasViolation: !isMultiline && hasTrailingComma,
            message: 'Unexpected trailing comma.'
        };
    }
    reportViolation(message, lastElement, hasTrailingComma, arkFile) {
        const { line, column } = this.getViolationPosition(lastElement);
        const defect = this.createViolationDefect(line, column, message, arkFile);
        const fix = this.createViolationFix(lastElement, hasTrailingComma);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getViolationPosition(lastElement) {
        const sourceFile = lastElement.getSourceFile();
        const pos = lastElement.getEnd();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        return {
            line: line + 1,
            column: character + 1
        };
    }
    createViolationDefect(line, column, message, arkFile) {
        return new Defects_1.Defects(line, column, column + 1, message, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
    }
    createViolationFix(lastElement, hasTrailingComma) {
        if (hasTrailingComma) {
            const commaInfo = this.findTrailingCommaPos(lastElement, lastElement.parent);
            if (commaInfo.pos !== -1) {
                return { range: [commaInfo.pos, commaInfo.pos + 1], text: '' };
            }
            return { range: [lastElement.getEnd(), lastElement.getEnd()], text: '' };
        }
        return { range: [lastElement.getEnd(), lastElement.getEnd()], text: ',' };
    }
    checkTrailingCommaViolation(option, context) {
        let hasViolation = false;
        let message = '';
        switch (option) {
            case 'never':
                if (context.hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
            case 'always':
                if (!context.hasTrailingComma) {
                    hasViolation = true;
                    message = 'Missing trailing comma.';
                }
                break;
            case 'always-multiline':
                if (context.isMultiline && !context.hasTrailingComma) {
                    hasViolation = true;
                    message = 'Missing trailing comma.';
                }
                else if (!context.isMultiline && context.hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
            case 'only-multiline':
                if (!context.isMultiline && context.hasTrailingComma) {
                    hasViolation = true;
                    message = 'Unexpected trailing comma.';
                }
                break;
        }
        return { hasViolation, message };
    }
    checkObjectBindingPattern(node, arkFile, type) {
        const elements = node.elements;
        if (elements.length === 0) {
            return;
        }
        const lastElement = elements[elements.length - 1];
        const sourceFile = lastElement.getSourceFile();
        const nodeText = node.getText();
        const hasTrailingComma = this.Trailing2.test(nodeText);
        const lastElementPos = lastElement.getEnd();
        const closeBracketPos = node.getEnd();
        const lastElementLine = sourceFile.getLineAndCharacterOfPosition(lastElementPos).line;
        const closeBracketLine = sourceFile.getLineAndCharacterOfPosition(closeBracketPos).line;
        const isMultiline = closeBracketLine > lastElementLine;
        const context = {
            hasTrailingComma: hasTrailingComma,
            isMultiline: isMultiline
        };
        const violation = this.checkTrailingCommaViolation(this.getRuleOption(type), context);
        if (violation.hasViolation) {
            const pos = lastElement.getEnd();
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            const severity = this.rule.alert ?? this.metaData.severity;
            const defect = new Defects_1.Defects(line + 1, character + 1, character + 2, violation.message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
            let fix;
            if (hasTrailingComma) {
                const commaInfo = this.findTrailingCommaPos(lastElement, node);
                if (commaInfo.pos !== -1) {
                    fix = { range: [commaInfo.pos, commaInfo.pos + 1], text: '' };
                }
                else {
                    fix = { range: [lastElement.getEnd(), lastElement.getEnd()], text: '' };
                }
            }
            else {
                fix = { range: [lastElement.getEnd(), lastElement.getEnd()], text: ',' };
            }
            this.issues.push(new Defects_1.IssueReport(defect, fix));
            DefectsList_1.RuleListUtil.push(defect);
        }
    }
    hasConsecutiveCommasInArray(text) {
        if (text.indexOf(',,') !== -1) {
            return true;
        }
        const match = text.match(/,\s+,/g);
        if (match) {
            return true;
        }
        return false;
    }
    checkArrowFunctionComma(node, arkFile) {
        this.checkArrowParamComma(node, arkFile);
        this.checkArrowGenericComma(node, arkFile);
    }
    checkArrowParamComma(node, arkFile) {
        if (node.parameters.length === 0) {
            return;
        }
        const arrowInfo = this.getArrowFunctionParamInfo(node);
        if (!arrowInfo) {
            return;
        }
        this.processArrowParamTrailingCommaViolation(node, arkFile, arrowInfo);
    }
    getArrowFunctionParamInfo(node) {
        const lastParam = node.parameters[node.parameters.length - 1];
        const sourceFile = lastParam.getSourceFile();
        const nodeText = sourceFile.getFullText().slice(node.getFullStart(), node.getEnd());
        const nodeFullStart = node.getFullStart();
        const openParenIndex = nodeText.indexOf('(');
        const closeParenIndex = this.findMatchingCloseParen(nodeText, openParenIndex);
        if (openParenIndex === -1 || closeParenIndex === -1) {
            return null;
        }
        const paramText = nodeText.substring(openParenIndex, closeParenIndex + 1);
        const lastParamEnd = lastParam.getEnd() - nodeFullStart;
        const textAfterLastParam = nodeText.substring(lastParamEnd, closeParenIndex);
        const hasParamTrailingComma = /,\s*$/m.test(textAfterLastParam);
        const isParamMultiline = paramText.split('\n').length > 1;
        let commaIndex = undefined;
        if (hasParamTrailingComma) {
            const match = textAfterLastParam.match(/,/);
            if (match && match.index !== undefined) {
                commaIndex = match.index;
            }
        }
        return {
            lastParam,
            hasTrailingComma: hasParamTrailingComma,
            isMultiline: isParamMultiline,
            nodeFullStart,
            lastParamEnd,
            textToSearch: nodeText.substring(lastParamEnd, closeParenIndex),
            commaIndex
        };
    }
    processArrowParamTrailingCommaViolation(node, arkFile, info) {
        if (!info) {
            return;
        }
        const paramRuleOption = this.getRuleOption('functions');
        const paramContext = {
            hasTrailingComma: info.hasTrailingComma,
            isMultiline: info.isMultiline
        };
        const paramViolation = this.checkTrailingCommaViolation(paramRuleOption, paramContext);
        if (!paramViolation.hasViolation) {
            return;
        }
        this.reportArrowParamCommaViolation(node, arkFile, info, paramViolation.message);
    }
    reportArrowParamCommaViolation(node, arkFile, info, message) {
        const sourceFile = node.getSourceFile();
        if (info.hasTrailingComma && info.commaIndex !== undefined) {
            const commaPos = info.nodeFullStart + info.lastParamEnd + info.commaIndex;
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(commaPos);
            const severity = this.rule.alert ?? this.metaData.severity;
            const defect = new Defects_1.Defects(line + 1, character + 1, character + 2, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
            const fix = info.hasTrailingComma
                ? { range: [commaPos, commaPos + 1], text: '' }
                : { range: [commaPos, commaPos], text: ',' };
            this.issues.push(new Defects_1.IssueReport(defect, fix));
            DefectsList_1.RuleListUtil.push(defect);
            return;
        }
        const pos = info.lastParam.getEnd();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line + 1, character + 1, character + 2, message, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        const fix = info.hasTrailingComma
            ? { range: [pos, pos + 1], text: '' }
            : { range: [pos, pos], text: ',' };
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    findMatchingCloseParen(text, openIndex) {
        if (openIndex === -1 || text[openIndex] !== '(') {
            return -1;
        }
        let depth = 1;
        for (let i = openIndex + 1; i < text.length; i++) {
            if (text[i] === '(') {
                depth++;
            }
            else if (text[i] === ')') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }
    findMatchingCloseAngle(text, openIndex) {
        if (openIndex === -1 || text[openIndex] !== '<') {
            return -1;
        }
        let depth = 1;
        for (let i = openIndex + 1; i < text.length; i++) {
            if (text[i] === '<') {
                depth++;
            }
            else if (text[i] === '>') {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        return -1;
    }
}
exports.CommaDangleCheck = CommaDangleCheck;
