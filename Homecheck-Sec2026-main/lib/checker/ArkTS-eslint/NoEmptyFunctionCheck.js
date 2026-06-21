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
exports.NoEmptyFunctionCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoEmptyFunctionCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-empty-function.md",
    description: "Unexpected empty arrow function",
};
class NoEmptyFunctionCheck {
    defaultOptions = [{
            allow: [],
        },];
    metaData = gMetaData;
    defects = [];
    issues = [];
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchfileBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchfileBuildCb];
    }
    check = (targetField) => {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const results = this.checkNoEmptyFunction(sourceFile);
        results.forEach(result => {
            this.addIssueReport(result.line, result.character, result.endCol, targetField.getFilePath(), result.message);
        });
    };
    checkNoEmptyFunction(sourceFile) {
        const results = [];
        const visit = (node) => {
            if ((lib_1.ts.isFunctionDeclaration(node) ||
                lib_1.ts.isFunctionExpression(node) ||
                lib_1.ts.isArrowFunction(node) ||
                lib_1.ts.isMethodDeclaration(node) ||
                lib_1.ts.isConstructorDeclaration(node) ||
                lib_1.ts.isGetAccessor(node) ||
                lib_1.ts.isSetAccessor(node))
                &&
                    this.isMethodEmpty(node) &&
                !this.isAllowedEmptyFunction(node)) {
                const bodyStartPos = node.body?.getStart();
                const bodyEndPos = node.body?.getEnd();
                if (!bodyStartPos)
                    return;
                if (!bodyEndPos)
                    return;
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(bodyStartPos);
                const { character: endChar } = sourceFile.getLineAndCharacterOfPosition(bodyEndPos);
                let message = 'Unexpected empty function';
                message = this.getErrorMessage(node);
                results.push({
                    line: line + 1,
                    character: character + 1,
                    message: message,
                    endCol: endChar + 1,
                });
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return results;
    }
    isAsyncFunction(node) {
        return (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node)) &&
            node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword);
    }
    isAsyncMethod(node) {
        return lib_1.ts.isMethodDeclaration(node) &&
            node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword);
    }
    isMethodEmpty = (node) => {
        if (!node.body)
            return true;
        const fullBodyText2 = node.body.getText();
        // 修改后的参数检查逻辑
        if (lib_1.ts.isConstructorDeclaration(node) && node.parameters.length > 0) {
            const parameterString = node.parameters
                .map(param => param.getText())
                .join(', ');
            if (this.isStandaloneModifier(parameterString)) {
                return false;
            }
        }
        if (this.isCurlyBracketsEnclosed(fullBodyText2)) {
            const fullBodyText = node.body.getText();
            const startIndex = fullBodyText.indexOf('{');
            const endIndex = fullBodyText.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1)
                return true;
            const innerContent = fullBodyText.slice(startIndex + 1, endIndex);
            return innerContent.trim().length === 0 &&
                (lib_1.ts.isBlock(node.body) ? node.body.statements.length === 0 : true);
        }
    };
    isStandaloneModifier(str) {
        // 使用单词边界匹配独立的关键字
        const modifierRegex = /\b(private|public|protected|readonly)\b/;
        return modifierRegex.test(str);
    }
    isCurlyBracketsEnclosed(str) {
        if (typeof str !== 'string' || str.length < 2) {
            return false;
        }
        return str.startsWith('{') && str.endsWith('}');
    }
    isAllowedEmptyFunction = (node) => {
        const options = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const allowed = options[0].allow || [];
        if (lib_1.ts.isConstructorDeclaration(node)) {
            if (allowed.includes('constructors')) {
                return true;
            }
            else {
                const accessibility = node.modifiers?.find(modifier => modifier.kind === lib_1.ts.SyntaxKind.PrivateKeyword ||
                    modifier.kind === lib_1.ts.SyntaxKind.ProtectedKeyword);
                if (accessibility) {
                    if ((accessibility.kind === lib_1.ts.SyntaxKind.PrivateKeyword && allowed.includes('private-constructors')) ||
                        (accessibility.kind === lib_1.ts.SyntaxKind.ProtectedKeyword && allowed.includes('protected-constructors'))) {
                        return true;
                    }
                }
            }
        }
        if ((lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node)) && !node.asteriskToken?.getText().includes('*') && !this.isAsyncFunction(node)) {
            if (allowed.includes('functions')) {
                return true;
            }
        }
        if ((lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node)) && node.asteriskToken?.getText().includes('*')) {
            if (allowed.includes('generatorFunctions')) {
                return true;
            }
        }
        if ((lib_1.ts.isMethodDeclaration(node) || lib_1.ts.isMethodSignature(node)) && !node.asteriskToken?.getText().includes('*') && !this.isAsyncMethod(node)) {
            if (allowed.includes('methods')) {
                return true;
            }
        }
        if ((lib_1.ts.isMethodDeclaration(node) || lib_1.ts.isMethodSignature(node)) && node.asteriskToken?.getText().includes('*')) {
            if (allowed.includes('generatorMethods')) {
                return true;
            }
        }
        if (lib_1.ts.isMethodDeclaration(node)) {
            if (node.getText().startsWith("@") && allowed.includes('decoratedFunctions')) {
                return true;
            }
        }
        if (lib_1.ts.isMethodDeclaration(node) && node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.OverrideKeyword) && allowed.includes('overrideMethods')) {
            return true;
        }
        if (this.isAsyncFunction(node)) {
            if (allowed.includes('asyncFunctions')) {
                return true;
            }
        }
        if (this.isAsyncMethod(node)) {
            if (allowed.includes('asyncMethods')) {
                return true;
            }
        }
        if (lib_1.ts.isArrowFunction(node)) {
            if (allowed.includes('arrowFunctions')) {
                return true;
            }
        }
        if (lib_1.ts.isGetAccessor(node)) {
            if (allowed.includes('getters')) {
                return true;
            }
        }
        if (lib_1.ts.isSetAccessor(node)) {
            if (allowed.includes('setters')) {
                return true;
            }
        }
        return false;
    };
    getErrorMessage(node) {
        if (lib_1.ts.isArrowFunction(node)) {
            return this.handleArrowFunction(node);
        }
        if (lib_1.ts.isFunctionExpression(node)) {
            return this.handleFunctionExpression(node);
        }
        if (lib_1.ts.isMethodDeclaration(node)) {
            return this.handleMethodDeclaration(node);
        }
        if (lib_1.ts.isFunctionDeclaration(node)) {
            return this.handleFunctionDeclaration(node);
        }
        if (lib_1.ts.isGetAccessor(node) || lib_1.ts.isSetAccessor(node)) {
            return this.handleAccessor(node);
        }
        if (lib_1.ts.isConstructorDeclaration(node)) {
            return 'Unexpected empty constructor.';
        }
        return 'Unexpected empty function.';
    }
    // 辅助函数：获取静态前缀
    getStaticPrefix(node) {
        const isStatic = node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.StaticKeyword) ?? false;
        return isStatic ? 'static ' : '';
    }
    // 辅助函数：获取节点名称
    getNameText(nameNode) {
        if (!nameNode) {
            return '';
        }
        if (lib_1.ts.isIdentifier(nameNode)) {
            return nameNode.text;
        }
        if (lib_1.ts.isStringLiteralLike(nameNode)) {
            return nameNode.text;
        }
        if (lib_1.ts.isNumericLiteral(nameNode)) {
            return nameNode.text;
        }
        if (lib_1.ts.isComputedPropertyName(nameNode) && lib_1.ts.isStringLiteralLike(nameNode.expression)) {
            return nameNode.expression.text;
        }
        return '';
    }
    // 处理箭头函数
    handleArrowFunction(node) {
        const staticPrefix = this.getStaticPrefix(node);
        if (node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
            return `Unexpected empty ${staticPrefix}async arrow function.`;
        }
        if (lib_1.ts.isPropertyDeclaration(node.parent) || lib_1.ts.isPropertyAssignment(node.parent)) {
            const isStatic = lib_1.ts.isPropertyDeclaration(node.parent)
                ? this.getStaticPrefix(node.parent)
                : '';
            const methodName = this.getNameText(node.parent.name);
            return methodName
                ? `Unexpected empty ${isStatic}method '${methodName}'.`
                : `Unexpected empty ${isStatic}method.`;
        }
        return `Unexpected empty ${staticPrefix}arrow function.`;
    }
    // 处理函数表达式
    handleFunctionExpression(node) {
        const staticPrefix = this.getStaticPrefix(node);
        const funcName = this.getNameText(node.name);
        // 类属性中的函数表达式
        if (lib_1.ts.isPropertyDeclaration(node.parent) && lib_1.ts.isClassDeclaration(node.parent.parent)) {
            const isStatic = this.getStaticPrefix(node.parent);
            const methodName = this.getNameText(node.parent.name);
            return methodName
                ? `Unexpected empty ${isStatic}method '${methodName}'.`
                : `Unexpected empty ${isStatic}method.`;
        }
        // 对象字面量中的函数表达式
        if (lib_1.ts.isPropertyAssignment(node.parent) && lib_1.ts.isObjectLiteralExpression(node.parent.parent)) {
            const methodName = this.getNameText(node.parent.name);
            if (node.asteriskToken) {
                return methodName
                    ? `Unexpected empty generator method '${methodName}'.`
                    : `Unexpected empty generator method.`;
            }
            return methodName
                ? `Unexpected empty method '${methodName}'.`
                : `Unexpected empty method.`;
        }
        // 普通函数表达式
        if (node.asteriskToken) {
            return `Unexpected empty ${staticPrefix}generator function.`;
        }
        if (node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
            return funcName
                ? `Unexpected empty ${staticPrefix}async function '${funcName}'.`
                : `Unexpected empty ${staticPrefix}async function.`;
        }
        if (funcName) {
            return `Unexpected empty ${staticPrefix}function '${funcName}'.`;
        }
        return `Unexpected empty ${staticPrefix}function.`;
    }
    // 处理方法声明
    handleMethodDeclaration(node) {
        const staticPrefix = this.getStaticPrefix(node);
        const methodName = this.getNameText(node.name);
        if (node.asteriskToken) {
            return `Unexpected empty ${staticPrefix}generator method '${methodName}'.`;
        }
        if (node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
            return methodName
                ? `Unexpected empty ${staticPrefix}async method '${methodName}'.`
                : `Unexpected empty ${staticPrefix}async method.`;
        }
        return methodName
            ? `Unexpected empty ${staticPrefix}method '${methodName}'.`
            : `Unexpected empty ${staticPrefix}method.`;
    }
    // 处理函数声明
    handleFunctionDeclaration(node) {
        const staticPrefix = this.getStaticPrefix(node);
        const funcName = this.getNameText(node.name);
        if (node.asteriskToken) {
            return funcName
                ? `Unexpected empty ${staticPrefix}generator function '${funcName}'.`
                : `Unexpected empty ${staticPrefix}generator function.`;
        }
        if (node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
            return funcName
                ? `Unexpected empty ${staticPrefix}async function '${funcName}'.`
                : `Unexpected empty ${staticPrefix}async function.`;
        }
        return funcName
            ? `Unexpected empty ${staticPrefix}function '${funcName}'.`
            : `Unexpected empty ${staticPrefix}function.`;
    }
    // 处理访问器
    handleAccessor(node) {
        const staticPrefix = this.getStaticPrefix(node);
        const propertyName = this.getNameText(node.name);
        if (lib_1.ts.isGetAccessor(node)) {
            return `Unexpected empty ${staticPrefix}getter '${propertyName}'.`;
        }
        return propertyName
            ? `Unexpected empty ${staticPrefix}setter '${propertyName}'.`
            : `Unexpected empty ${staticPrefix}setter.`;
    }
    async addIssueReport(line, startCol, endCol, filePath, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const description = message;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoEmptyFunctionCheck = NoEmptyFunctionCheck;
