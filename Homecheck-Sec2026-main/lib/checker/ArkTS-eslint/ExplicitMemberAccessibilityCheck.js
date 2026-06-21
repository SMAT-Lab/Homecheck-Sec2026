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
exports.ExplicitMemberAccessibilityCheck = void 0;
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License");
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
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Utils_1 = require("../../utils/common/Utils");
const Defects_1 = require("../../model/Defects");
const defaultText = 'explicit';
const defaultOptions = { accessibility: defaultText };
const docsPath = 'docs/explicit-member-accessibility.md';
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'KeywordSpacingCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: docsPath,
    description: 'is better written in dot notation.',
};
//强制或禁止在 TypeScript 类的成员（属性、方法）上使用显式的访问修饰符
class ExplicitMemberAccessibilityCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        let options = this.rule.option[0] || defaultOptions;
        let mergedOptions = {
            ...defaultOptions,
            ...options,
        };
        this.issueMap.clear();
        const targetFilePath = targetFile.getFilePath();
        const astRoot = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        for (let child of astRoot.statements) {
            this.loopNode(targetFilePath, astRoot, child, mergedOptions, []);
        }
        this.reportSortedIssues();
    };
    loopNode(targetFilePath, sourceFile, aNode, mergedOptions, alloct = []) {
        const defaultText = 'explicit';
        const baseCheck = mergedOptions.accessibility ?? defaultText;
        const overrides = mergedOptions.overrides ?? {};
        const ctorCheck = overrides.constructors ?? baseCheck;
        const accessorCheck = overrides.accessors ?? baseCheck;
        const methodCheck = overrides.methods ?? baseCheck;
        const propCheck = overrides.properties ?? baseCheck;
        const paramPropCheck = overrides.parameterProperties ?? baseCheck;
        const ignoredMethodNames = new Set(mergedOptions.ignoredMethodNames ?? []);
        const children = aNode.getChildren();
        for (const child of children) {
            if (lib_1.ts.isMethodDeclaration(child) ||
                lib_1.ts.isConstructorDeclaration(child) ||
                lib_1.ts.isGetAccessorDeclaration(child) ||
                lib_1.ts.isSetAccessorDeclaration(child)) {
                this.checkMethodAccessibilityModifier(targetFilePath, sourceFile, child, baseCheck, ignoredMethodNames, methodCheck, ctorCheck, accessorCheck);
            }
            if (lib_1.ts.isParameterPropertyDeclaration(child, child.parent)) {
                //处理构造方法参数属性
                this.checkParameterPropertyAccessibilityModifier(targetFilePath, sourceFile, child, paramPropCheck);
            }
            if (lib_1.ts.isPropertyDeclaration(child)) {
                this.checkPropertyAccessibilityModifier(targetFilePath, sourceFile, child, propCheck);
            }
            if (child.getChildren().length > 0) {
                this.loopNode(targetFilePath, sourceFile, child, mergedOptions, alloct); // 递归时传递 alloct
            }
        }
        return alloct;
    }
    addIssueReport(targetFilePath, line, startCol, endCol, name, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, targetFilePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        return defect;
    }
    //辅助函数1  检查 函数或方法的参数 是否具有合适的访问权限修饰符。
    checkParameterPropertyAccessibilityModifier(targetFilePath, sourceFile, node, paramPropCheck) {
        const nodeName = node.name.getText();
        if (paramPropCheck === 'explicit' &&
            !node.modifiers?.some((modifier) => modifier.kind === lib_1.ts.SyntaxKind.PublicKeyword ||
                modifier.kind === lib_1.ts.SyntaxKind.PrivateKeyword ||
                modifier.kind === lib_1.ts.SyntaxKind.ProtectedKeyword)) {
            const position = lib_1.LineColPosition.buildFromNode(node, sourceFile);
            const message = `Missing accessibility modifier on parameter property ${nodeName}.`;
            const defect = this.addIssueReport(targetFilePath, position.getLineNo(), position.getColNo(), position.getColNo() + nodeName.length, nodeName, message);
            defect.fixable = false;
            this.issueMap.set(defect.fixKey, { defect, fix: undefined });
        }
        else if (paramPropCheck === 'no-public' &&
            node.modifiers?.some((modifier) => modifier.kind === lib_1.ts.SyntaxKind.PublicKeyword) &&
            node.modifiers?.some((modifier) => modifier.kind === lib_1.ts.SyntaxKind.ReadonlyKeyword)) {
            const position = lib_1.LineColPosition.buildFromNode(node, sourceFile);
            const message = `Public accessibility modifier on parameter property ${nodeName}.`;
            const defect = this.addIssueReport(targetFilePath, position.getLineNo(), position.getColNo(), position.getColNo() + nodeName.length, nodeName, message);
            const fixText = node.getText().substring(6);
            let fix = this.ruleFix(node.getStart(), node.getEnd(), fixText);
            defect.fixable = true;
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    //辅助函数2 检查 方法 的访问权限修饰符。
    checkMethodAccessibilityModifier(targetFilePath, sourceFile, methodDefinition, baseCheck, ignoredMethodNames, methodCheck, ctorCheck, accessorCheck) {
        // 跳过私有方法 (检查 methodDefinition 的修饰符)
        const hasPrivateModifier = methodDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PrivateKeyword);
        if (hasPrivateModifier) {
            return;
        }
        let check = baseCheck;
        let message = `err`;
        // 获取方法名称
        let methodName = '';
        const isComputedPropertyName = methodDefinition.name?.kind === lib_1.ts.SyntaxKind.ComputedPropertyName;
        isComputedPropertyName ? methodName = methodDefinition.name.expression.getText() : methodName = methodDefinition.name?.text ?? 'constructor';
        // 根据 methodDefinition.kind 判断方法类型
        const checkRsult = this.getAccessibilityCheckAndMessage(methodDefinition, methodName, baseCheck, methodCheck, ctorCheck, accessorCheck);
        check = checkRsult.check;
        message = checkRsult.message;
        if (check === 'off' || methodName.startsWith('#') || ignoredMethodNames.has(methodName) ||
            lib_1.ts.isObjectLiteralExpression(methodDefinition.parent) || lib_1.ts.isInterfaceDeclaration(methodDefinition.parent)) {
            return;
        }
        const hasPublicModifier = methodDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PublicKeyword);
        const hascModifier = methodDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PublicKeyword || mod.kind === lib_1.ts.SyntaxKind.ProtectedKeyword ||
            mod.kind === lib_1.ts.SyntaxKind.PrivateKeyword);
        if (check === 'no-public' && hasPublicModifier) {
            const position = lib_1.LineColPosition.buildFromNode(methodDefinition, sourceFile);
            message = message.replace('Missing', 'Public');
            const fixText = methodDefinition.getText().substring(6);
            this.execFix(position, targetFilePath, message, fixText, methodName, methodDefinition, '');
        }
        else if (check === 'explicit' && !hascModifier) {
            const position = lib_1.LineColPosition.buildFromNode(methodDefinition, sourceFile);
            const fixText = 'public ';
            this.execFix(position, targetFilePath, message, fixText, methodName, methodDefinition, undefined);
        }
    }
    getAccessibilityCheckAndMessage(methodDefinition, methodName, baseCheck, methodCheck, ctorCheck, accessorCheck) {
        let check = baseCheck;
        let message;
        switch (methodDefinition.kind) {
            case lib_1.ts.SyntaxKind.MethodDeclaration:
                check = methodCheck;
                message = `Missing accessibility modifier on method definition ${methodName}.`;
                break;
            case lib_1.ts.SyntaxKind.Constructor:
                check = ctorCheck;
                message = `Missing accessibility modifier on method definition constructor.`;
                break;
            case lib_1.ts.SyntaxKind.GetAccessor:
                check = accessorCheck;
                message = `Missing accessibility modifier on get property accessor ${methodName}.`;
                break;
            case lib_1.ts.SyntaxKind.SetAccessor:
                check = accessorCheck;
                message = `Missing accessibility modifier on set property accessor ${methodName}.`;
                break;
            default:
                check = baseCheck;
                message = '';
        }
        return { check, message };
    }
    // 辅助函数3 类的属性 的访问权限修饰符
    checkPropertyAccessibilityModifier(targetFilePath, sourceFile, propertyDefinition, propCheck // 假定 propCheck 作为参数传递
    ) {
        const propertyName = this.getNameFromMember1(propertyDefinition); // 使用辅助函数提取属性名称
        if (!propertyName || propertyName.startsWith('#') || propertyDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PrivateKeyword)) {
            return;
        }
        const type = propertyDefinition.type;
        const hasPublicModifier = propertyDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PublicKeyword);
        const hasPrivateModifier = propertyDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.PrivateKeyword);
        const hasProtectedModifier = propertyDefinition.modifiers?.some((mod) => mod.kind === lib_1.ts.SyntaxKind.ProtectedKeyword);
        if (propCheck === 'no-public' && hasPublicModifier) {
            const position = lib_1.LineColPosition.buildFromNode(propertyDefinition, sourceFile);
            const message = `Public accessibility modifier on class property ${propertyName}.`;
            const fixText = propertyDefinition.getText().substring(6);
            this.execFix(position, targetFilePath, message, fixText, propertyName, propertyDefinition, type);
        }
        else if (propCheck === 'explicit' &&
            !hasPublicModifier &&
            !hasPrivateModifier &&
            !hasProtectedModifier) {
            const position = lib_1.LineColPosition.buildFromNode(propertyDefinition, sourceFile);
            const message = `Missing accessibility modifier on class property ${propertyName}.`;
            const fixText = 'public ';
            this.execFix(position, targetFilePath, message, fixText, propertyName, propertyDefinition, undefined);
        }
    }
    getNameFromMember1(propertyDefinition) {
        let name = '';
        // 判断属性类型
        if (lib_1.ts.isPropertyDeclaration(propertyDefinition) ||
            lib_1.ts.isMethodDeclaration(propertyDefinition)) {
            // 如果是属性声明或者方法声明，直接访问name
            const isComputedPropertyName = propertyDefinition.name.kind === lib_1.ts.SyntaxKind.ComputedPropertyName;
            isComputedPropertyName ? name = propertyDefinition.name.expression.getText() : name = propertyDefinition.name.text;
        }
        else if (lib_1.ts.isGetAccessorDeclaration(propertyDefinition) ||
            lib_1.ts.isSetAccessorDeclaration(propertyDefinition)) {
            // 如果是获取器或设置器，直接访问name
            name = propertyDefinition.name.text;
        }
        // 处理计算属性（例如 [key]）
        else if (propertyDefinition &&
            lib_1.ts.isComputedPropertyName(propertyDefinition)) {
            name = propertyDefinition.expression.getText(); // 获取计算属性的名称
        }
        else {
            // 如果没有匹配到任何类型，可以抛出一个错误或处理其它情况
            throw new Error('Unexpected property or method type');
        }
        return name;
    }
    ruleFix(pos, end, text) {
        return { range: [pos, end], text: text };
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries()).sort(([keyA], [keyB]) => Utils_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    execFix(position, targetFilePath, message, fixText, propertyName, propertyDefinition, type) {
        const defect = this.addIssueReport(targetFilePath, position.getLineNo(), position.getColNo(), position.getColNo() + propertyName?.length, propertyName, message);
        let fix = this.ruleFix(propertyDefinition.getStart(), propertyDefinition.getStart(), fixText);
        defect.fixable = true;
        if (type === undefined) {
            fix = undefined;
            defect.fixable = false;
        }
        ;
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
}
exports.ExplicitMemberAccessibilityCheck = ExplicitMemberAccessibilityCheck;
