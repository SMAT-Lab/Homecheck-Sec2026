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
exports.UnifiedSignaturesCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UnifiedSignaturesCheck');
class UnifiedSignaturesCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/unified-signatures.md',
        description: 'Function overloads can be unified into a single signature.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    defaultOption = [{}];
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        this.defaultOption = this.rule && this.rule.option[0] ? this.rule.option : [{}];
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.checkBodyForOverloadMethods(sourceFile);
    };
    checkBodyForOverloadMethods(sourceFile) {
        const lineAndersonColumn = [];
        this.visit(sourceFile, lineAndersonColumn, sourceFile);
        return lineAndersonColumn;
    }
    ;
    visit(node, lineAndersonColumn, sourceFile) {
        let members = this.getNodeMembers(node);
        if (members) {
            if (lib_1.ts.isSourceFile(node)) {
                this.processSourceFileNode(node, members, sourceFile);
            }
            else {
                this.processNonSourceFileNode(node, members, sourceFile);
            }
        }
        lib_1.ts.forEachChild(node, (n) => this.visit(n, lineAndersonColumn, sourceFile));
    }
    ;
    // 处理源文件节点
    processSourceFileNode(node, members, sourceFile) {
        // 收集所有函数声明
        const functionDeclarations = [];
        members.forEach(member => {
            if (lib_1.ts.isFunctionDeclaration(member)) {
                functionDeclarations.push(member);
            }
        });
        // 按名称分组
        const functionGroups = new Map();
        functionDeclarations.forEach(func => {
            const name = func.name && lib_1.ts.isIdentifier(func.name) ? func.name.text : null;
            if (!name) {
                return;
            }
            if (!functionGroups.has(name)) {
                functionGroups.set(name, []);
            }
            functionGroups.get(name).push(func);
        });
        // 处理每个函数组
        functionGroups.forEach((funcs, name) => {
            if (funcs.length > 1) {
                this.checkFunctionGroup(funcs, node, sourceFile);
            }
        });
    }
    ;
    // 检查函数组中的重载
    checkFunctionGroup(funcs, node, sourceFile) {
        // 提取方法信息
        const methods = [];
        funcs.forEach(func => {
            const method = this.getMemberMethod(func, sourceFile);
            if (method) {
                methods.push(method);
            }
        });
        // 计算有实现的方法数量
        const implementedMethodsCount = methods.filter(method => method.hasImplementation).length;
        // 检查是否可以统一
        this.checkMethodPairsForUnification(methods, node, methods.length - implementedMethodsCount);
    }
    ;
    // 检查方法对是否可以统一
    checkMethodPairsForUnification(methods, node, implementedMethodsCount) {
        for (let i = 0; i < methods.length; i++) {
            for (let j = i + 1; j < methods.length; j++) {
                const method1 = methods[i];
                const method2 = methods[j];
                const unificationResult = this.canUnifyMethods(method1, method2, implementedMethodsCount);
                if (unificationResult.canUnify) {
                    this.addIssueReport(method2.line, unificationResult.paramInfo.character, method2.endCol, node.getSourceFile().fileName, unificationResult.reason);
                }
            }
        }
    }
    ;
    // 处理非源文件节点
    processNonSourceFileNode(node, members, sourceFile) {
        const accessors = new Map();
        members.forEach((member) => {
            const method = this.getMemberMethod(member, sourceFile);
            if (method == null) {
                return;
            }
            // 处理访问器
            if (method.isAccessor) {
                this.processAccessorMethod(method, accessors, node);
            }
        });
    }
    ;
    // 处理访问器方法
    processAccessorMethod(method, accessors, node) {
        const accessorName = method.name;
        if (!accessors.has(accessorName)) {
            accessors.set(accessorName, {});
        }
        const accessorInfo = accessors.get(accessorName);
        if (method.accessorType === 'get') {
            accessorInfo.get = method;
        }
        else if (method.accessorType === 'set') {
            accessorInfo.set = method;
        }
        // 如果同时存在 get 和 set 访问器，检查是否可以统一
        if (accessorInfo.get && accessorInfo.set) {
            this.checkAccessorPairUnification(accessorInfo, accessorName, node);
            // 清除已处理的访问器，避免重复报告
            accessors.delete(accessorName);
        }
    }
    ;
    // 检查访问器对是否可以统一
    checkAccessorPairUnification(accessorInfo, accessorName, node) {
        logger.debug(`Found matching get/set accessors for: ${accessorName}`);
        // 检查 get 和 set 访问器是否有实现
        if (accessorInfo.get.hasImplementation || accessorInfo.set.hasImplementation) {
            return;
        }
        // 检查 get 和 set 访问器是否可以统一
        const unificationResult = this.canUnifyMethods(accessorInfo.get, accessorInfo.set, 2);
        if (unificationResult.canUnify) {
            this.addIssueReport(accessorInfo.set.line, unificationResult.paramInfo.character, accessorInfo.set.endCol, node.getSourceFile().fileName, unificationResult.reason);
        }
    }
    ;
    getMemberMethod(member, sourceFile) {
        const position = member.getStart();
        const endPosition = member.getEnd();
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, position);
        const { line: endLine, character: endChar } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, endPosition);
        if (lib_1.ts.isFunctionDeclaration(member) || lib_1.ts.isMethodDeclaration(member) || lib_1.ts.isMethodSignature(member)) {
            return this.getFunctionOrMethodInfo(member, sourceFile, line, character, endChar);
        }
        else if (lib_1.ts.isGetAccessorDeclaration(member)) {
            return this.getGetAccessorInfo(member, sourceFile, line, character, endChar);
        }
        else if (lib_1.ts.isSetAccessorDeclaration(member)) {
            return this.getSetAccessorInfo(member, sourceFile, line, character, endChar);
        }
        return null;
    }
    ;
    // 处理函数声明或方法声明
    getFunctionOrMethodInfo(member, sourceFile, line, character, endChar) {
        const name = member.name && lib_1.ts.isIdentifier(member.name) ? member.name.text : null;
        if (!name) {
            return null;
        }
        // 检查是否是私有字段方法（以#开头）
        if (name.startsWith('#')) {
            return null;
        }
        const parameters = this.extractParameters(member, sourceFile);
        const isStatic = member.modifiers?.some(modifier => modifier.kind === lib_1.ts.SyntaxKind.StaticKeyword) || false;
        const hasImplementation = lib_1.ts.isMethodSignature(member) ? false : member.body !== undefined;
        return {
            name,
            static: isStatic,
            line: line + 1,
            character: character + 1,
            endCol: endChar + 1,
            isAccessor: false,
            parameters,
            node: member,
            hasImplementation
        };
    }
    // 处理getter访问器
    getGetAccessorInfo(member, sourceFile, line, character, endChar) {
        const name = member.name && lib_1.ts.isIdentifier(member.name) ? member.name.text : null;
        if (!name) {
            return null;
        }
        // 检查是否是私有字段访问器（以#开头）
        if (name.startsWith('#')) {
            return null;
        }
        const isStatic = member.modifiers?.some(modifier => modifier.kind === lib_1.ts.SyntaxKind.StaticKeyword) || false;
        // 提取 get 访问器的参数
        const parameters = this.extractParameters(member, sourceFile);
        const hasImplementation = member.body !== undefined;
        return {
            name,
            static: isStatic,
            line: line + 1,
            character: character + 1,
            endCol: endChar + 1,
            isAccessor: true,
            accessorType: 'get',
            parameters,
            node: member,
            hasImplementation
        };
    }
    // 处理setter访问器
    getSetAccessorInfo(member, sourceFile, line, character, endChar) {
        const name = member.name && lib_1.ts.isIdentifier(member.name) ? member.name.text : null;
        if (!name) {
            return null;
        }
        // 检查是否是私有字段访问器（以#开头）
        if (name.startsWith('#')) {
            return null;
        }
        const isStatic = member.modifiers?.some(modifier => modifier.kind === lib_1.ts.SyntaxKind.StaticKeyword) || false;
        // 提取 set 访问器的参数
        const parameters = this.extractParameters(member, sourceFile);
        const hasImplementation = member.body !== undefined;
        return {
            name,
            static: isStatic,
            line: line + 1,
            character: character + 1,
            endCol: endChar + 1,
            isAccessor: true,
            accessorType: 'set',
            parameters,
            node: member,
            hasImplementation
        };
    }
    extractParameters(member, sourceFile) {
        const parameters = [];
        if (member.parameters) {
            member.parameters.forEach(param => {
                const name = param.name && lib_1.ts.isIdentifier(param.name) ? param.name.text : '';
                const type = param.type ? param.type.getText() : 'any';
                const isOptional = param.questionToken !== undefined;
                const isRest = param.dotDotDotToken !== undefined;
                // 获取参数的位置信息
                const position = param.getStart();
                const endPosition = param.getEnd();
                const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, position);
                const { character: endChar } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, endPosition);
                parameters.push({
                    name,
                    type,
                    isOptional,
                    isRest,
                    line: line + 1,
                    character: character + 1,
                    endCol: endChar + 1
                });
            });
        }
        return parameters;
    }
    ;
    getNodeMembers(node) {
        if (lib_1.ts.isModuleDeclaration(node)) {
            return this.getModuleDeclarationMembers(node);
        }
        else if (lib_1.ts.isInterfaceDeclaration(node) || lib_1.ts.isClassDeclaration(node) || lib_1.ts.isTypeLiteralNode(node) || lib_1.ts.isTypeAliasDeclaration(node)) {
            return this.getTypeOrClassMembers(node);
        }
        else if (lib_1.ts.isSourceFile(node)) {
            return Array.from(node.statements);
        }
        return undefined;
    }
    ;
    getModuleDeclarationMembers(node) {
        return node.body && lib_1.ts.isModuleBlock(node.body) ? Array.from(node.body.statements) : undefined;
    }
    ;
    getTypeOrClassMembers(node) {
        let members = [];
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            members = this.getTypeAliasMembers(node);
        }
        else {
            // 对于接口、类或类型字面量，直接获取成员
            members = Array.from(node.members);
        }
        // 处理接口中的方法重载
        if (lib_1.ts.isInterfaceDeclaration(node) || lib_1.ts.isClassDeclaration(node) || lib_1.ts.isTypeAliasDeclaration(node)) {
            this.processMethodOverloads(members, node);
        }
        return members;
    }
    ;
    getTypeAliasMembers(node) {
        if (node.type && lib_1.ts.isTypeLiteralNode(node.type)) {
            // 如果类型别名的类型是类型字面量，获取其成员
            return Array.from(node.type.members);
        }
        return [];
    }
    ;
    processMethodOverloads(members, node) {
        // 收集所有方法声明
        const methodDeclarations = this.collectMethodDeclarations(members);
        // 按名称分组
        const methodGroups = this.groupMethodsByName(methodDeclarations);
        // 处理每个方法组
        this.checkOverloadMethodGroups(methodGroups, node);
    }
    ;
    collectMethodDeclarations(members) {
        const methodDeclarations = [];
        members.forEach(member => {
            if (lib_1.ts.isMethodSignature(member) || lib_1.ts.isMethodDeclaration(member)) {
                // 检查是否是私有字段方法（以#开头）
                const name = member.name && lib_1.ts.isIdentifier(member.name) ? member.name.text : null;
                if (name && name.startsWith('#')) {
                    return;
                }
                methodDeclarations.push(member);
            }
        });
        return methodDeclarations;
    }
    ;
    groupMethodsByName(methodDeclarations) {
        const methodGroups = new Map();
        methodDeclarations.forEach(method => {
            const name = method.name && lib_1.ts.isIdentifier(method.name) ? method.name.text : null;
            if (!name) {
                return;
            }
            if (!methodGroups.has(name)) {
                methodGroups.set(name, []);
            }
            methodGroups.get(name).push(method);
        });
        return methodGroups;
    }
    ;
    checkOverloadMethodGroups(methodGroups, node) {
        methodGroups.forEach((methods, name) => {
            if (methods.length > 1) {
                // 提取方法信息
                const methodInfos = this.extractMethodInfos(methods, node);
                // 计算有实现的方法数量
                const implementedMethodsCount = methodInfos.filter(method => method.hasImplementation).length;
                // 检查方法是否可以统一
                this.checkMethodPairsForUnification(methodInfos, node, methodInfos.length - implementedMethodsCount);
            }
        });
    }
    ;
    extractMethodInfos(methods, node) {
        const methodInfos = [];
        methods.forEach(method => {
            const methodInfo = this.getMemberMethod(method, node.getSourceFile());
            if (methodInfo) {
                methodInfos.push(methodInfo);
            }
        });
        return methodInfos;
    }
    ;
    addIssueReport(line, startCol, endCol, filePath, unificationReason) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let description = unificationReason ? unificationReason : this.metaData.description;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    canUnifyMethods(method1, method2, number) {
        // 基本验证检查
        const basicValidation = this.performBasicMethodValidation(method1, method2);
        if (!basicValidation.isValid) {
            return { canUnify: false, reason: basicValidation.reason };
        }
        // 检查返回类型是否兼容
        const returnTypeCheck = this.checkReturnTypeCompatibility(method1, method2);
        if (!returnTypeCheck.isCompatible) {
            return { canUnify: false, reason: returnTypeCheck.reason };
        }
        // 检查参数数量
        const paramCountResult = this.checkParameterCountCompatibility(method1, method2);
        if (!paramCountResult.isCompatible) {
            return { canUnify: false, reason: paramCountResult.reason };
        }
        // 根据参数数量相等或相差1的情况进行不同的检查
        if (method1.parameters.length === method2.parameters.length) {
            return this.checkMethodsWithSameParamCount(method1, method2, number);
        }
        else {
            return this.checkMethodsWithDifferentParamCount(method1, method2);
        }
    }
    ;
    // 检查参数数量差异
    checkParameterCountCompatibility(method1, method2) {
        const paramCountDiff = Math.abs(method1.parameters.length - method2.parameters.length);
        if (paramCountDiff >= 2) {
            return {
                isCompatible: false,
                reason: 'Parameter count difference is too large to unify'
            };
        }
        return { isCompatible: true, reason: '' };
    }
    // 执行基本的方法验证
    performBasicMethodValidation(method1, method2) {
        // 检查静态/实例方法
        if (method1.static !== method2.static) {
            return { isValid: false, reason: 'Cannot unify static and instance methods' };
        }
        // 检查方法实现
        if (method1.hasImplementation || method2.hasImplementation) {
            return { isValid: false, reason: 'Cannot unify methods with implementation' };
        }
        // 检查参数信息
        if (!method1.parameters || !method2.parameters) {
            return { isValid: false, reason: 'Missing parameter information' };
        }
        return { isValid: true, reason: '' };
    }
    ;
    // 检查返回类型兼容性
    checkReturnTypeCompatibility(method1, method2) {
        const returnType1 = this.getReturnType(method1.node);
        const returnType2 = this.getReturnType(method2.node);
        const hasExplicitReturn1 = this.hasExplicitReturnType(method1.node);
        const hasExplicitReturn2 = this.hasExplicitReturnType(method2.node);
        // 特殊处理get/set访问器的默认返回类型情况
        if (method1.isAccessor && method2.isAccessor && method1.accessorType !== method2.accessorType) {
            return this.checkAccessorsReturnTypeCompatibility(method1, method2, returnType1, returnType2);
        }
        else if (returnType1 && returnType2) {
            // 检查普通方法的返回类型
            if (hasExplicitReturn1 && hasExplicitReturn2 && returnType1 !== returnType2) {
                return { isCompatible: false, reason: 'Return types are different' };
            }
            // 检查返回类型显式性不匹配
            if ((hasExplicitReturn1 && !hasExplicitReturn2) || (!hasExplicitReturn1 && hasExplicitReturn2)) {
                return { isCompatible: false, reason: 'Cannot unify explicit return type with implicit return type' };
            }
        }
        return { isCompatible: true, reason: '' };
    }
    ;
    // 检查访问器返回类型兼容性
    checkAccessorsReturnTypeCompatibility(method1, method2, returnType1, returnType2) {
        const isGetter1 = method1.accessorType === 'get';
        // 检查是否是默认类型情况
        const getterMethod = isGetter1 ? method1 : method2;
        const getterNode = getterMethod.node;
        // 只有在默认类型情况下允许类型不匹配
        const isGetterDefault = !getterNode.type && (returnType1 === 'any' || returnType2 === 'any');
        const isSetterDefault = returnType1 === 'void' || returnType2 === 'void';
        if (!(isGetterDefault && isSetterDefault)) {
            return { isCompatible: false, reason: 'Accessor return types are incompatible' };
        }
        // 在默认类型情况下，允许统一
        return { isCompatible: true, reason: '' };
    }
    ;
    // 检查具有相同参数数量的方法
    checkMethodsWithSameParamCount(method1, method2, number) {
        // 检查是否有剩余参数
        const hasRestParam = method1.parameters.some(p => p.isRest) || method2.parameters.some(p => p.isRest);
        if (hasRestParam) {
            return { canUnify: false, reason: 'Cannot unify methods with rest parameters when parameter count is the same' };
        }
        // 检查是否有可选参数
        const hasOptionalParam = method1.parameters.some(p => p.isOptional) || method2.parameters.some(p => p.isOptional);
        if (hasOptionalParam) {
            return { canUnify: false, reason: 'Cannot unify methods with optional parameters when parameter count is the same' };
        }
        // 检查是否可以合并为联合类型
        const canMergeAsUnion = this.canMergeAsUnionType(method1, method2, number);
        if (canMergeAsUnion.canMerge) {
            return {
                canUnify: true,
                reason: `${canMergeAsUnion.details}`,
                paramInfo: {
                    ...canMergeAsUnion.paramInfo,
                    methodIndex: 0
                }
            };
        }
        return { canUnify: false, reason: 'Cannot unify methods with same parameter count' };
    }
    ;
    // 检查具有不同参数数量的方法
    checkMethodsWithDifferentParamCount(method1, method2) {
        // 确定哪个方法有更多参数
        const longerMethod = method1.parameters.length > method2.parameters.length ? method1 : method2;
        const shorterMethod = method1.parameters.length > method2.parameters.length ? method2 : method1;
        // 确保两个方法都有参数且参数不为空
        if (longerMethod.parameters.length > 0 && shorterMethod.parameters.length > 0) {
            // 检查第一个参数是否相同
            const firstParam1 = longerMethod.parameters[0];
            const firstParam2 = shorterMethod.parameters[0];
            if (firstParam1.name !== firstParam2.name || firstParam1.type !== firstParam2.type) {
                return { canUnify: false, reason: 'First parameters are different' };
            }
        }
        // 检查是否可以合并为可选参数或剩余参数
        const canMergeAsOptional = this.canMergeAsOptionalOrRest(method1, method2);
        if (canMergeAsOptional.canMerge) {
            return {
                canUnify: true,
                reason: canMergeAsOptional.details,
                paramInfo: {
                    ...canMergeAsOptional.paramInfo,
                    methodIndex: method1.parameters.length > method2.parameters.length ? 0 : 1
                }
            };
        }
        return { canUnify: false, reason: 'Cannot unify methods with different parameter count' };
    }
    ;
    hasExplicitReturnType(node) {
        if (!node) {
            return false;
        }
        ;
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isMethodDeclaration(node) || lib_1.ts.isMethodSignature(node)) {
            return node.type !== undefined;
        }
        else if (lib_1.ts.isGetAccessorDeclaration(node)) {
            return node.type !== undefined;
        }
        else if (lib_1.ts.isSetAccessorDeclaration(node)) {
            // 设置器总是有明确的void返回类型
            return true;
        }
        return false;
    }
    ;
    getReturnType(node) {
        if (!node) {
            return null;
        }
        ;
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isMethodDeclaration(node) || lib_1.ts.isMethodSignature(node)) {
            return node.type ? node.type.getText() : 'void';
        }
        else if (lib_1.ts.isGetAccessorDeclaration(node)) {
            return node.type ? node.type.getText() : 'any';
        }
        else if (lib_1.ts.isSetAccessorDeclaration(node)) {
            return 'void';
        }
        return null;
    }
    ;
    // 辅助方法：检查类型是否为泛型数组类型
    isGenericArrayType(type) {
        // 简单判断是否符合 T[] 格式
        return /^[A-Z](\[\])+$/.test(type);
    }
    ;
    // 添加新的辅助方法: 检查类型是否为泛型类型(包括单字母泛型和泛型数组)
    isGenericType(type) {
        // 检查单字母泛型(如T)或泛型数组(如T[])
        return /^[A-Z](\[\])*$/.test(type);
    }
    ;
    canMergeAsUnionType(method1, method2, number) {
        // 检查参数长度是否匹配
        if (!method1.parameters || !method2.parameters || method1.parameters.length !== method2.parameters.length) {
            return { canMerge: false, details: '' };
        }
        // 检查交叉依赖和类型兼容性
        if (!this.areParametersCompatibleForUnion(method1.parameters, method2.parameters)) {
            return { canMerge: false, details: '' };
        }
        // 查找参数差异
        const differences = this.findParameterDifferences(method1.parameters, method2.parameters);
        // 分析差异并生成报告
        return this.analyzeDifferencesForUnion(differences, method1, number);
    }
    ;
    // 检查参数是否兼容合并为联合类型
    areParametersCompatibleForUnion(params1, params2) {
        // 检查是否存在参数间的交叉依赖关系
        if (params1.length >= 2) {
            const paramDiffs = this.collectParameterTypeDifferences(params1, params2);
            // 检查交叉依赖
            if (paramDiffs.length >= 2 && this.hasCrossDependency(paramDiffs, params1, params2)) {
                return false;
            }
        }
        // 检查泛型兼容性
        return this.checkGenericCompatibility(params1, params2);
    }
    ;
    // 收集参数类型差异
    collectParameterTypeDifferences(params1, params2) {
        const paramDiffs = [];
        for (let i = 0; i < params1.length; i++) {
            const param1 = params1[i];
            const param2 = params2[i];
            if (param1.type !== param2.type) {
                paramDiffs.push({
                    pos: i,
                    type1: param1.type,
                    type2: param2.type
                });
            }
        }
        return paramDiffs;
    }
    // 检查参数之间是否存在交叉依赖
    hasCrossDependency(paramDiffs, params1, params2) {
        for (let i = 0; i < paramDiffs.length; i++) {
            for (let j = i + 1; j < paramDiffs.length; j++) {
                const diff1 = paramDiffs[i];
                const diff2 = paramDiffs[j];
                // 检查交叉模式: A的type1对应B的type2，A的type2对应B的type1
                if ((diff1.type1 === diff2.type2 && diff1.type2 === diff2.type1) ||
                    (diff1.type1 === params1[diff2.pos].type && diff1.type2 === params2[diff2.pos].type)) {
                    return true;
                }
            }
        }
        return false;
    }
    ;
    // 检查泛型类型兼容性
    checkGenericCompatibility(params1, params2) {
        for (let i = 0; i < params1.length; i++) {
            const param1 = params1[i];
            const param2 = params2[i];
            // 检查是否一个是泛型而另一个不是泛型
            const isParam1Generic = this.isGenericType(param1.type);
            const isParam2Generic = this.isGenericType(param2.type);
            if (isParam1Generic !== isParam2Generic) {
                return false;
            }
        }
        return true;
    }
    ;
    // 查找参数差异
    findParameterDifferences(params1, params2) {
        const differences = [];
        for (let i = 0; i < params1.length; i++) {
            const param1 = params1[i];
            const param2 = params2[i];
            // 检查参数类型是否不同或可选性不同
            if (param1.type !== param2.type || param1.isOptional !== param2.isOptional) {
                differences.push({
                    index: i,
                    type1: param1.type,
                    type2: param2.type,
                    isOptional1: param1.isOptional,
                    isOptional2: param2.isOptional,
                    line: param2.line,
                    character: param2.character,
                    endCol: param2.endCol,
                    name: param2.name,
                    methodIndex: 0,
                    hasDifferentNames: param1.name !== param2.name
                });
            }
        }
        return differences;
    }
    ;
    // 分析差异并生成报告
    analyzeDifferencesForUnion(differences, method1, number) {
        if (differences.length > 0) {
            const hasDifferentNames = differences.some(diff => diff.hasDifferentNames);
            if (this.defaultOption[0].ignoreDifferentlyNamedParameters && hasDifferentNames) {
                return { canMerge: false, details: '' };
            }
            const details = this.generateUnionMergeDetails(differences, method1, number);
            return {
                canMerge: true,
                details,
                paramInfo: {
                    line: differences[0].line,
                    character: differences[0].character,
                    endCol: differences[0].endCol,
                    name: differences[0].name,
                    type1: differences[0].type1,
                    type2: differences[0].type2,
                    isOptional1: differences[0].isOptional1,
                    isOptional2: differences[0].isOptional2,
                    methodIndex: differences[0].methodIndex
                }
            };
        }
        return { canMerge: false, details: '' };
    }
    ;
    // 生成联合类型合并详情
    generateUnionMergeDetails(differences, method1, number) {
        return differences.map(diff => {
            if (diff.isOptional1 !== diff.isOptional2) {
                return `These overloads can be combined into one signature taking '${diff.type1} | ${diff.type2}'.`;
            }
            else {
                return number > 2 ?
                    `This overload and the one on line ${method1.line} can be combined into one signature taking '${diff.type1} | ${diff.type2}'.` :
                    `These overloads can be combined into one signature taking '${diff.type1} | ${diff.type2}'.`;
            }
        }).join(', ');
    }
    ;
    canMergeAsOptionalOrRest(method1, method2) {
        // 基本验证检查
        if (!method1.parameters || !method2.parameters) {
            return { canMerge: false, details: '' };
        }
        // 检查是否涉及泛型数组类型的特殊情况
        if (this.hasSpecialGenericArrayCase(method1, method2)) {
            return { canMerge: false, details: '' };
        }
        // 确定参数较长和较短的方法
        const { longerMethod, shorterMethod } = this.identifyMethodsByParamLength(method1, method2);
        // 检查是否可以通过可选参数合并
        const optionalMergeResult = this.checkOptionalParameterMerge(longerMethod, shorterMethod, method1, method2);
        if (optionalMergeResult.canMerge) {
            return optionalMergeResult;
        }
        // 检查是否可以通过参数重排序合并
        return this.checkParameterReorderingMerge(method1, method2);
    }
    ;
    // 检查是否存在泛型数组的特殊情况
    hasSpecialGenericArrayCase(method1, method2) {
        if (method1.parameters.length === 0 && method2.parameters.length === 1) {
            return this.isGenericArrayType(method2.parameters[0].type);
        }
        else if (method2.parameters.length === 0 && method1.parameters.length === 1) {
            return this.isGenericArrayType(method1.parameters[0].type);
        }
        return false;
    }
    ;
    // 确定哪个方法有更多参数
    identifyMethodsByParamLength(method1, method2) {
        return method1.parameters.length > method2.parameters.length
            ? { longerMethod: method1, shorterMethod: method2 }
            : { longerMethod: method2, shorterMethod: method1 };
    }
    // 检查是否可以通过可选参数合并
    checkOptionalParameterMerge(longerMethod, shorterMethod, originalMethod1, originalMethod2) {
        // 检查前面的参数是否相同
        if (!this.haveIdenticalPrefixParameters(longerMethod, shorterMethod)) {
            return { canMerge: false, details: '' };
        }
        // 检查多出的参数
        const extraParam = longerMethod.parameters[longerMethod.parameters.length - 1];
        // 检查是否可以作为可选参数
        if (!extraParam.isRest) {
            return {
                canMerge: true,
                details: `These overloads can be combined into one signature with an optional parameter.`,
                paramInfo: {
                    line: extraParam.line,
                    character: extraParam.character,
                    endCol: extraParam.endCol,
                    name: extraParam.name,
                    isRest: false,
                    methodIndex: originalMethod1.parameters.length > originalMethod2.parameters.length ? 0 : 1
                }
            };
        }
        // 检查是否可以作为剩余参数
        if (extraParam.isRest) {
            return {
                canMerge: true,
                details: `These overloads can be combined into one signature with an optional parameter.`,
                paramInfo: {
                    line: extraParam.line,
                    character: extraParam.character,
                    endCol: extraParam.endCol,
                    name: extraParam.name,
                    isRest: true,
                }
            };
        }
        return { canMerge: false, details: '' };
    }
    ;
    // 检查前面的参数是否完全相同
    haveIdenticalPrefixParameters(longerMethod, shorterMethod) {
        for (let i = 0; i < shorterMethod.parameters.length; i++) {
            const param1 = longerMethod.parameters[i];
            const param2 = shorterMethod.parameters[i];
            if (param1.name !== param2.name || param1.type !== param2.type) {
                return false;
            }
        }
        return true;
    }
    ;
    // 检查是否可以通过参数重排序合并
    checkParameterReorderingMerge(method1, method2) {
        // 检查参数集合是否相同但顺序不同
        if (!this.hasSameParametersInDifferentOrder(method1, method2)) {
            return { canMerge: false, details: '' };
        }
        // 找到第一个不同的参数
        for (let i = 0; i < method1.parameters.length; i++) {
            const param1 = method1.parameters[i];
            const param2 = method2.parameters[i];
            if (param1.name !== param2.name) {
                return {
                    canMerge: true,
                    details: `Parameters can be reordered to match the other overload`,
                    paramInfo: {
                        line: param2.line,
                        character: param2.character,
                        endCol: param2.endCol,
                        name: param2.name,
                        isRest: false,
                        isReordered: true,
                    }
                };
            }
        }
        return { canMerge: false, details: '' };
    }
    ;
    // 检查参数名称集合是否相同但顺序不同
    hasSameParametersInDifferentOrder(method1, method2) {
        const paramNames1 = method1.parameters.map(p => p.name);
        const paramNames2 = method2.parameters.map(p => p.name);
        return paramNames1.length === paramNames2.length &&
            paramNames1.every(name => paramNames2.includes(name)) &&
            paramNames2.every(name => paramNames1.includes(name));
    }
}
exports.UnifiedSignaturesCheck = UnifiedSignaturesCheck;
;
;
;
