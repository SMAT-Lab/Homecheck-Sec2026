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
exports.NoUnsafeArgumentCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const CheckerUtils_1 = require("../../utils/checker/CheckerUtils");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeArgumentCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-unsafe-argument.md",
    description: "Unsafe argument of type `any` assigned to a parameter of type `string`."
};
class NoUnsafeArgumentCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
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
            if (arkanalyzer_1.ts.isCallExpression(child)) {
                this.checkArkCallExpression(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isNewExpression(child)) {
                this.checkNewExpression(child, sourceFile, targetFile);
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
    findFunctionDeclaration(node) {
        if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            return node;
        }
        if (node.parent) {
            return this.findFunctionDeclaration(node.parent);
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
    checkArgumentType(arg, child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isIdentifier(arg)) {
            return;
        }
        let functionDeclaration = this.findFunctionDeclaration(child);
        if (functionDeclaration) {
            for (let param of functionDeclaration.parameters) {
                if (param.type?.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword && arg.getText() === param.name.getText()) {
                    return;
                }
                else if (arg.getText() === 'undefined') {
                    return;
                }
            }
        }
        let positionInfo = this.getPositionInfo(arg, sourceFile);
        this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unsafe argument of type `any` assigned to a parameter of type `string | undefined`.');
    }
    checkNewExpression(child, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isIdentifier(child.expression)) {
            let name = child.expression.getText();
            if (name === 'RegExp') {
                child.arguments?.forEach((arg) => {
                    this.checkArgumentType(arg, child, sourceFile, arkFile);
                });
            }
        }
    }
    checkArrowFunctionParameters(arg, positionInfo, arkFile) {
        let arrowFunction = this.findArrowFunction(arg);
        if (!arrowFunction) {
            return false;
        }
        for (const param of arrowFunction.parameters) {
            if (arkanalyzer_1.ts.isIdentifier(param.name)) {
                if (param?.type?.kind === arkanalyzer_1.ts.SyntaxKind.NumberKeyword) {
                    return true;
                }
                let paramName = param.name.getText();
                if (paramName === arg.getText()) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return true;
                }
            }
        }
        return false;
    }
    checkThisKeywordPropertyAccess(arg, arkFile, positionInfo) {
        if (!arkanalyzer_1.ts.isIdentifier(arg.name) || arg.expression.kind !== arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            return false;
        }
        const classDeclaration = this.findClassDeclaration(arg);
        if (classDeclaration) {
            const member = classDeclaration.members.find(member => arkanalyzer_1.ts.isPropertyDeclaration(member) && member?.name?.getText() === arg?.name?.getText());
            if (member) {
                return true;
            }
        }
        this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        return true;
    }
    checkCallExpressionArguments(child, sourceFile, arkFile) {
        for (const arg of child.arguments) {
            let positionInfo = this.getPositionInfo(arg, sourceFile);
            if (arkanalyzer_1.ts.isIdentifier(arg)) {
                if (this.checkArrowFunctionParameters(arg, positionInfo, arkFile)) {
                    return true;
                }
            }
            else if (arkanalyzer_1.ts.isPropertyAccessExpression(arg)) {
                if (this.checkThisKeywordPropertyAccess(arg, arkFile, positionInfo)) {
                    return true;
                }
            }
            else if (arg.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
                let classDeclaration = this.findClassDeclaration(arg);
                if (classDeclaration) {
                    return true;
                }
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                return true;
            }
            else if (arkanalyzer_1.ts.isCallExpression(arg) && arkanalyzer_1.ts.isIdentifier(arg.expression)) {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                return true;
            }
        }
        return false;
    }
    checkVariableStatementsForArguments(sourceFile, child, arkFile, name) {
        if (!sourceFile) {
            return;
        }
        for (const param of sourceFile.statements) {
            if (!arkanalyzer_1.ts.isVariableStatement(param) || !arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                continue;
            }
            if (this.checkVariableDeclarationsForArguments(param.declarationList.declarations, name, child, sourceFile, arkFile)) {
                return;
            }
        }
    }
    checkVariableDeclarationsForArguments(declarations, name, child, sourceFile, arkFile) {
        for (const dec of declarations) {
            if (!arkanalyzer_1.ts.isVariableDeclaration(dec) || dec.name.getText() !== name) {
                continue;
            }
            for (const arg of child.arguments) {
                if (this.checkFunctionDeclarationParameters(arg, sourceFile, child, arkFile)) {
                    return true;
                }
            }
        }
        return false;
    }
    checkFunctionDeclarationParameters(arg, sourceFile, child, arkFile) {
        if (!arkanalyzer_1.ts.isIdentifier(arg)) {
            return false;
        }
        const positionInfo = this.getPositionInfo(arg, sourceFile);
        const functionDeclaration = this.findFunctionDeclaration(child);
        if (functionDeclaration) {
            for (const param of functionDeclaration.parameters) {
                if (param.type === undefined) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
                    return true;
                }
            }
        }
        return false;
    }
    checkFunctionDeclarationParametersForArrayTypes(functionDeclaration, child, sourceFile, arkFile, name) {
        const arrayTypes = ['Uint8Array', 'Uint16Array', 'Uint32Array',
            'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'U'];
        functionDeclaration.parameters.forEach(param => {
            if (!arkanalyzer_1.ts.isParameter(param) || !arkanalyzer_1.ts.isIdentifier(param.name) || !param.type || param.name.getText() !== name) {
                return;
            }
            const foundArg = child.arguments.find(arg => arkanalyzer_1.ts.isIdentifier(arg));
            if (!foundArg) {
                return;
            }
            const positionInfo = this.getPositionInfo(foundArg, sourceFile);
            if (param.type?.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword) {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
            }
            if (arkanalyzer_1.ts.isTypeReferenceNode(param.type) && arkanalyzer_1.ts.isIdentifier(param.type.typeName)) {
                const typeName = param.type.typeName.getText();
                const type = arrayTypes.find(type => type === typeName);
                if (typeName === 'U') {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unsafe argument of type `any` assigned to a parameter of type `number & T`.');
                }
                if (type) {
                    this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unsafe argument of type `any` assigned to a parameter of type `number`.');
                }
            }
            else if (arkanalyzer_1.ts.isUnionTypeNode(param.type)) {
                param.type.types.forEach(type => {
                    this.checkUnionTypeNodeForArrayType(type, arkFile, positionInfo);
                });
            }
        });
    }
    checkUnionTypeNodeForArrayType(type, arkFile, positionInfo) {
        if (arkanalyzer_1.ts.isArrayTypeNode(type) && arkanalyzer_1.ts.isTypeReferenceNode(type.elementType) && arkanalyzer_1.ts.isIdentifier(type.elementType.typeName)) {
            if (type.elementType.typeName.getText() === 'T') {
                this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unsafe argument of type `any` assigned to a parameter of type `T`.');
            }
        }
    }
    checkVariableStatementsForIncludesOrIndexOf(sourceFile, child, arkFile, name) {
        if (!sourceFile) {
            return;
        }
        sourceFile.statements.forEach(param => {
            if (!arkanalyzer_1.ts.isVariableStatement(param) || !arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                return;
            }
            param.declarationList.declarations.forEach(dec => {
                if (!arkanalyzer_1.ts.isVariableDeclaration(dec) || dec.name.getText() !== name) {
                    return;
                }
                if (!this.isValidVariableDeclarationType(dec)) {
                    return;
                }
                if (dec.type && arkanalyzer_1.ts.isArrayTypeNode(dec.type) && dec.type.elementType?.getText() !== 'string') {
                    return;
                }
                this.checkArgumentsForIssueReport(child, sourceFile, arkFile);
            });
        });
    }
    isValidVariableDeclarationType(dec) {
        return dec.type?.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword ||
            dec.type?.kind === arkanalyzer_1.ts.SyntaxKind.ArrayType ||
            dec.type?.kind === arkanalyzer_1.ts.SyntaxKind.TypeOperator;
    }
    checkArgumentsForIssueReport(child, sourceFile, arkFile) {
        child.arguments.forEach(arg => {
            if (!arkanalyzer_1.ts.isIdentifier(arg)) {
                return;
            }
            const positionInfo = this.getPositionInfo(arg, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        });
    }
    checkTestMethodArguments(child, sourceFile, arkFile) {
        child.arguments.forEach(arg => {
            if (!arkanalyzer_1.ts.isIdentifier(arg)) {
                return;
            }
            const positionInfo = this.getPositionInfo(arg, sourceFile);
            if (this.isArgumentDefinedInVariableStatements(arg, sourceFile)) {
                return;
            }
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description);
        });
    }
    isArgumentDefinedInVariableStatements(arg, sourceFile) {
        for (const param of sourceFile.statements) {
            if (!arkanalyzer_1.ts.isVariableStatement(param) || !arkanalyzer_1.ts.isVariableDeclarationList(param.declarationList)) {
                continue;
            }
            for (const declarationListElement of param.declarationList.declarations) {
                if (arkanalyzer_1.ts.isVariableDeclaration(declarationListElement) &&
                    declarationListElement.name.getText() === arg.getText()) {
                    return true;
                }
            }
        }
        return false;
    }
    handlePropertyAccessExpression(child, sourceFile, arkFile, name) {
        if (!arkanalyzer_1.ts.isPropertyAccessExpression(child.expression)) {
            return;
        }
        if (!arkanalyzer_1.ts.isIdentifier(child.expression.name)) {
            return;
        }
        if (arkanalyzer_1.ts.isIdentifier(child.expression.name)) {
            let methodName = child.expression.name.getText();
            if (methodName === 'log' && name === 'console') {
                if (this.checkCallExpressionArguments(child, sourceFile, arkFile)) {
                    return;
                }
            }
            if (methodName === 'test') {
                this.checkVariableStatementsForArguments(sourceFile, child, arkFile, name);
            }
            if (methodName === 'indexOf') {
                let functionDeclaration = this.findFunctionDeclaration(child);
                if (functionDeclaration) {
                    this.checkFunctionDeclarationParametersForArrayTypes(functionDeclaration, child, sourceFile, arkFile, name);
                }
            }
            if (methodName === 'includes' || methodName === 'indexOf') {
                if (sourceFile) {
                    this.checkVariableStatementsForIncludesOrIndexOf(sourceFile, child, arkFile, name);
                }
            }
        }
    }
    checkArkCallExpression(child, sourceFile, arkFile) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(child.expression)) {
            if (arkanalyzer_1.ts.isIdentifier(child.expression.expression)) {
                let name = child.expression.expression.getText();
                this.handlePropertyAccessExpression(child, sourceFile, arkFile, name);
            }
            else if (arkanalyzer_1.ts.isParenthesizedExpression(child.expression.expression)) {
                let methodName = child.expression.name.getText();
                if (methodName === 'test') {
                    this.checkTestMethodArguments(child, sourceFile, arkFile);
                }
            }
        }
        else if (arkanalyzer_1.ts.isIdentifier(child.expression)) {
            let name = child.expression.getText();
            if (name === 'RegExp') {
                this.checkRegExpArguments(child, sourceFile, arkFile);
            }
        }
    }
    checkRegExpArguments(child, sourceFile, arkFile) {
        child.arguments.forEach(arg => {
            if (!arkanalyzer_1.ts.isIdentifier(arg)) {
                return;
            }
            const positionInfo = this.getPositionInfo(arg, sourceFile);
            this.addArkIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unsafe argument of type `any` assigned to a parameter of type `string | undefined`.');
        });
    }
    check = (targetMethod) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        const stmts = targetMethod.getBody()?.getCfg().getStmts() ?? [];
        if (!this.getFileExtension(targetMethod.getDeclaringArkClass().getDeclaringArkFile().getName(), 'ts')) {
            return;
        }
        for (const stmt of stmts) {
            const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            this.checkInvokeArguments(stmt, invokeExpr, severity, targetMethod);
        }
    };
    checkInvokeArguments(stmt, invokeExpr, severity, targetMethod) {
        for (let idx in invokeExpr.getArgs()) {
            let local = invokeExpr.getArgs()[idx];
            if (local.getType() instanceof arkanalyzer_1.FunctionType) {
                break;
            }
            let localType = local.getType().getTypeString();
            if (local.getName) {
                localType = this.handleExtendedParameter(local, targetMethod);
            }
            this.checkLocalTypeForAny(stmt, invokeExpr, idx, localType, severity);
        }
    }
    checkLocalTypeForAny(stmt, invokeExpr, idx, localType, severity) {
        if (localType.includes('any')) {
            const parameterType = invokeExpr.getMethodSignature().getMethodSubSignature().getParameterTypes()[idx];
            if (parameterType && parameterType.getTypeString() !== localType) {
                let message = 'Unsafe spread of an `any` type.';
                if (localType === 'any[]') {
                    message = 'Unsafe spread of an `any` array type.';
                }
                else if (localType.includes('Set<any>')) {
                    message = 'Unsafe argument of type `Set<any>` assigned to a parameter of type `Set<string>`.';
                }
                else if (localType.includes('Map<any,string>')) {
                    message = 'Unsafe argument of type `Map<any, string>` assigned to a parameter of type `Map<string, string>`.';
                }
                this.addIssueReport(stmt, message, Number(idx) + 1, severity);
            }
        }
    }
    handleExtendedParameter(local, targetMethod) {
        let name = local.getName() || '';
        let isExtend = name.startsWith('...');
        if (isExtend) {
            name = name.slice(3);
            let method = targetMethod.getDeclaringArkClass().getDeclaringArkFile().getClasses()[0].getMethods()[0];
            let bodyLocal = method.getBody()?.getLocals().get(name);
            if (bodyLocal?.getType().getTypeString().includes('any')) {
                return bodyLocal.getType().getTypeString();
            }
        }
        return local.getType().getTypeString();
    }
    getFileExtension(filePath, filetype) {
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
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
    addIssueReport(stmt, message, index, severity) {
        const warnInfo = this.getLineAndColumn(stmt, index);
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, message, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndColumn(stmt, index) {
        const originalPositions = stmt.getOperandOriginalPositions();
        if (originalPositions[index]) {
            const line = originalPositions[index].getFirstLine();
            const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
            if (arkFile) {
                let startCol = originalPositions[index].getFirstCol();
                const endCol = originalPositions[index].getLastCol();
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
exports.NoUnsafeArgumentCheck = NoUnsafeArgumentCheck;
