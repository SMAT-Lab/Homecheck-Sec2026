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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnboundMethodCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
class UnboundMethodCheck {
    rule;
    defects = [];
    issues = [];
    sourceFile;
    currentClassName = null; // 新增：记录当前遍历的类名
    promiseTemArray = ['all', 'resolve', 'reject', 'race', 'allSettled', 'any'];
    defaultOptions = [
        {
            ignoreStatic: false,
        }
    ];
    messageStr = 'Avoid referencing unbound methods which may cause unintentional scoping of `this`.\nIf your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.';
    shortMessageStr = 'Avoid referencing unbound methods which may cause unintentional scoping of `this`.';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/unbound-method.md',
        description: 'Avoid referencing unbound methods which may cause unintentional scoping of `this`.\nIf your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead.',
    };
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (targetField) => {
        this.defaultOptions = this.rule && this.rule.option && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = targetField.getFilePath();
        const myInvalidPositions = this.checkUnboundMethod(targetField, this.defaultOptions[0]);
        myInvalidPositions.forEach(pos => {
            this.addIssueReport(filePath, pos, severity);
        });
    };
    addIssueReport(filePath, pos, severity) {
        const defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    // 对错误位置进行排序并去重
    sortMyInvalidPositions(myInvalidPositions) {
        // 1. 先进行排序
        myInvalidPositions.sort((a, b) => a.line - b.line || a.character - b.character);
        // 2. 使用 reduce 进行去重
        const uniqueArrays = myInvalidPositions.reduce((acc, current) => {
            const lastItem = acc[acc.length - 1];
            // 检查是否与最后一个元素的三要素相同
            if (!lastItem ||
                lastItem.line !== current.line ||
                lastItem.character !== current.character ||
                lastItem.message !== current.message) {
                acc.push(current);
            }
            return acc;
        }, []);
        return uniqueArrays;
    }
    checkUnboundMethod(targetField, options) {
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const errors = [];
        // 1. 收集代码中的各种信息
        const variableToClassName = this.collectVariableToClassMapping(this.sourceFile);
        const objectMethodInfo = this.collectObjectMethodInfo(this.sourceFile);
        const classMethodInfo = this.collectClassMethodInfo(this.sourceFile);
        // 2. 检查未绑定方法使用
        this.findUnboundMethodReferences(this.sourceFile, variableToClassName, classMethodInfo, objectMethodInfo, options, errors);
        return errors;
    }
    // 收集变量名到类名的映射关系
    collectVariableToClassMapping(sourceFile) {
        const variableToClassName = new Map();
        const visitor = (node) => {
            if (arkanalyzer_1.ts.isVariableDeclaration(node) && node.initializer && arkanalyzer_1.ts.isNewExpression(node.initializer)) {
                const className = node.initializer.expression.getText(this.sourceFile);
                const varName = node.name.getText();
                variableToClassName.set(varName, className);
            }
            arkanalyzer_1.ts.forEachChild(node, visitor);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitor);
        return variableToClassName;
    }
    // 收集对象字面量中的方法信息
    collectObjectMethodInfo(sourceFile) {
        const objectMethodInfo = new Map();
        const visitor = (node) => {
            if (arkanalyzer_1.ts.isVariableDeclaration(node) &&
                node.initializer &&
                arkanalyzer_1.ts.isObjectLiteralExpression(node.initializer)) {
                const varName = node.name.getText();
                this.processObjectProperties(node.initializer.properties, varName, objectMethodInfo);
            }
            arkanalyzer_1.ts.forEachChild(node, visitor);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitor);
        return objectMethodInfo;
    }
    // 处理对象字面量中的属性
    processObjectProperties(properties, varName, objectMethodInfo) {
        properties.forEach(prop => {
            if (!this.isMethodLikeProperty(prop)) {
                return;
            }
            const methodName = prop.name?.getText(this.sourceFile);
            if (!methodName) {
                return;
            }
            const key = `${varName}.${methodName}`;
            const usesThis = this.isMethodDeclarationLike(prop) ? this.checkThisUsage(prop) : false;
            const hasThisVoid = this.isMethodDeclarationLike(prop) ? this.checkThisVoidAnnotation(prop) : false;
            objectMethodInfo.set(key, { usesThis, hasThisVoid });
        });
    }
    // 判断属性是否是方法或函数表达式
    isMethodLikeProperty(prop) {
        return arkanalyzer_1.ts.isMethodDeclaration(prop) ||
            (arkanalyzer_1.ts.isPropertyAssignment(prop) &&
                prop.initializer &&
                arkanalyzer_1.ts.isFunctionExpression(prop.initializer));
    }
    // 判断属性是否是方法声明或类似节点
    isMethodDeclarationLike(prop) {
        return arkanalyzer_1.ts.isMethodDeclaration(prop) || arkanalyzer_1.ts.isPropertyDeclaration(prop);
    }
    // 收集类方法信息
    collectClassMethodInfo(sourceFile) {
        const classMethodInfo = new Map();
        const visitor = (node) => {
            if (arkanalyzer_1.ts.isClassDeclaration(node) && node.name) {
                const className = node.name.getText();
                this.processClassMembers(node, classMethodInfo);
                // 为每个类的prototype也添加相同的方法信息
                node.members.forEach(member => {
                    if (!arkanalyzer_1.ts.isMethodDeclaration(member) && !arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                        return;
                    }
                    const methodName = member.name?.getText(this.sourceFile);
                    if (!methodName) {
                        return;
                    }
                    const isStatic = !!member.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                    const usesThis = this.checkThisUsage(member);
                    const hasThisVoid = this.checkThisVoidAnnotation(member);
                    // 计算isArrowFunc
                    const isArrowFunc = arkanalyzer_1.ts.isPropertyDeclaration(member) &&
                        !!member.initializer &&
                        arkanalyzer_1.ts.isArrowFunction(member.initializer);
                    // 为prototype添加方法信息
                    const prototypeKey = `${className}.prototype.${methodName}`;
                    classMethodInfo.set(prototypeKey, { isStatic, usesThis, hasThisVoid, isArrowFunc });
                });
            }
            arkanalyzer_1.ts.forEachChild(node, visitor);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitor);
        return classMethodInfo;
    }
    // 修改processClassMembers方法
    processClassMembers(classNode, classMethodInfo) {
        const className = classNode.name?.getText() || '';
        classNode.members.forEach(member => {
            // 只处理方法声明或箭头函数属性
            if (arkanalyzer_1.ts.isMethodDeclaration(member)) {
                // 处理方法
                const methodName = member.name.getText(this.sourceFile);
                const isStatic = !!member.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                const usesThis = this.checkThisUsage(member);
                const hasThisVoid = this.checkThisVoidAnnotation(member);
                const key = `${className}.${methodName}`;
                classMethodInfo.set(key, { isStatic, usesThis, hasThisVoid, isArrowFunc: false });
            }
            else if (arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                // 处理属性
                const methodName = member.name.getText(this.sourceFile);
                const isStatic = !!member.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                // 检查是否是箭头函数属性
                const isArrowFunc = member.initializer && arkanalyzer_1.ts.isArrowFunction(member.initializer);
                // 检查是否是传统函数表达式属性
                const isFunctionExpr = member.initializer && arkanalyzer_1.ts.isFunctionExpression(member.initializer);
                // 处理箭头函数和传统函数表达式
                if (isArrowFunc || isFunctionExpr) {
                    const usesThis = this.checkThisUsage(member);
                    const hasThisVoid = this.checkThisVoidAnnotation(member);
                    const key = `${className}.${methodName}`;
                    classMethodInfo.set(key, {
                        isStatic,
                        usesThis,
                        hasThisVoid,
                        isArrowFunc: !!isArrowFunc // 确保是布尔值类型
                    });
                }
            }
        });
    }
    // 查找未绑定的方法引用
    findUnboundMethodReferences(sourceFile, variableToClassName, classMethodInfo, objectMethodInfo, options, errors) {
        // 1. 收集所有定义的类名
        const definedClasses = this.collectDefinedClasses(sourceFile);
        // 2. 遍历AST查找未绑定方法引用
        const visitor = (node) => {
            // 进入类声明时记录类名
            if (arkanalyzer_1.ts.isClassDeclaration(node) && node.name) {
                const prevClassName = this.currentClassName;
                this.currentClassName = node.name.getText(); // 设置当前类名
                arkanalyzer_1.ts.forEachChild(node, visitor);
                this.currentClassName = prevClassName; // 恢复上一层类名
                return;
            }
            this.processNode(node, definedClasses, variableToClassName, classMethodInfo, objectMethodInfo, options, errors);
            arkanalyzer_1.ts.forEachChild(node, visitor);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitor);
    }
    // 收集定义的类名
    collectDefinedClasses(sourceFile) {
        const definedClasses = new Set();
        const visitor = (node) => {
            if (arkanalyzer_1.ts.isClassDeclaration(node) && node.name) {
                definedClasses.add(node.name.getText());
            }
            arkanalyzer_1.ts.forEachChild(node, visitor);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visitor);
        return definedClasses;
    }
    // 处理单个节点
    processNode(node, definedClasses, variableToClassName, classMethodInfo, objectMethodInfo, options, errors) {
        // 检查属性访问 (instance.method)
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node)) {
            this.processPropertyAccessExpression(node, definedClasses, variableToClassName, classMethodInfo, options, errors);
        }
        // 检查对象解构 (const {method} = instance)
        else if (arkanalyzer_1.ts.isObjectBindingPattern(node)) {
            this.checkObjectDestructuring(node, objectMethodInfo, classMethodInfo, errors);
        }
        // 检查赋值表达式 ({ method } = instance)
        else if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            this.checkAssignmentExpression(node, objectMethodInfo, classMethodInfo, errors);
        }
    }
    // 处理属性访问表达式
    processPropertyAccessExpression(node, definedClasses, variableToClassName, classMethodInfo, options, errors) {
        // 新增：检查是否包含可选链或括号表达式
        if (this.containsOptionalChainOrParenthesized(node)) {
            return; // 直接跳过包含可选链或复杂括号表达式的情况
        }
        const expressionText = node.expression.getText();
        const methodName = node.name.getText();
        // 新增：检查是否是嵌套属性访问
        if (this.isNestedPropertyAccess(node)) {
            // 只处理显式声明为方法的嵌套属性访问
            // 例如，对于 obj.prop.subprop，只有当 subprop 确实是方法时才处理
            if (!this.isExplicitlyDeclaredAsMethod(node)) {
                return;
            }
        }
        // 情况1: 类的静态方法访问 (Class.method)
        if (this.isClassStaticMethodAccess(node, expressionText, definedClasses)) {
            this.handleStaticMethodAccess(node, expressionText, methodName, options, errors);
        }
        // 情况2: 类实例方法访问 (new Class().method)
        else if (this.isNewInstanceMethodAccess(node, expressionText, definedClasses)) {
            this.handleInstanceMethodAccess(node, errors);
        }
        // 情况3: 普通实例方法访问 (instance.method)
        else {
            this.checkPropertyAccess(node, variableToClassName, classMethodInfo, options, errors);
        }
    }
    // 检查是否是嵌套属性访问 (a.b.c)
    isNestedPropertyAccess(node) {
        return arkanalyzer_1.ts.isPropertyAccessExpression(node.expression);
    }
    // 检查属性是否显式声明为方法
    isExplicitlyDeclaredAsMethod(node) {
        // 获取最深层级的属性名
        const propertyName = node.name.getText();
        // 检查是否有类型声明信息
        if (node.parent && arkanalyzer_1.ts.isVariableDeclaration(node.parent)) {
            // 获取代码的文本内容
            const sourceCode = this.sourceFile.getFullText();
            // 查找是否有类型声明包含该属性为函数或方法
            // 例如: declare const obj: { prop: { method: () => void } };
            const methodTypePattern = new RegExp(`${propertyName}\\s*:\\s*\\(.*\\)\\s*=>`);
            const functionTypePattern = new RegExp(`${propertyName}\\s*:\\s*function`);
            if (methodTypePattern.test(sourceCode) || functionTypePattern.test(sourceCode)) {
                return true; // 显式声明为方法
            }
            // 检查对应声明中是否包含这个属性名作为方法
            // 尝试查找"method: function" 或 "method() {" 模式
            const methodPattern1 = new RegExp(`${propertyName}\\s*:\\s*function`);
            const methodPattern2 = new RegExp(`${propertyName}\\s*\\(`);
            if (methodPattern1.test(sourceCode) || methodPattern2.test(sourceCode)) {
                return true; // 可能是方法声明
            }
        }
        // 检查直接使用模式
        const directCallPattern = new RegExp(`\\.${propertyName}\\(`);
        if (directCallPattern.test(this.sourceFile.getFullText())) {
            // 如果在代码中有直接调用，如 obj.method()，则认为是方法
            return true;
        }
        // 默认情况下，在多级属性访问中，假设这不是方法引用
        return false;
    }
    // 判断是否是类的静态方法访问
    isClassStaticMethodAccess(node, expressionText, definedClasses) {
        return arkanalyzer_1.ts.isIdentifier(node.expression) && definedClasses.has(expressionText);
    }
    // 处理静态方法访问
    handleStaticMethodAccess(node, expressionText, methodName, options, errors) {
        // 检查是否是静态方法访问
        const isStaticMethodAccess = this.isStaticMethodAccess(node, expressionText, methodName);
        if (isStaticMethodAccess && !options.ignoreStatic) {
            const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
            errors.push({
                line: sourcePos.line + 1,
                character: sourcePos.character + 1,
                endCol: sourcePos.character + node.getText().length + 1,
                message: this.messageStr
            });
        }
    }
    // 判断是否是new实例的方法访问
    isNewInstanceMethodAccess(node, expressionText, definedClasses) {
        if (!expressionText.startsWith('new ') || !expressionText.includes('(')) {
            return false;
        }
        const match = /new\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(expressionText);
        return !!(match && match[1] && definedClasses.has(match[1]));
    }
    // 处理实例方法访问
    handleInstanceMethodAccess(node, errors) {
        // 检查是否直接在实例上调用方法，这种情况不应报错
        if (this.isDirectMethodCall(node)) {
            return;
        }
        const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
        // 判断是否是函数表达式属性
        const isFunctionExpression = this.isPropertyAccessToFunctionExpression(node);
        errors.push({
            line: sourcePos.line + 1,
            character: sourcePos.character + 1,
            endCol: sourcePos.character + node.getText().length + 1,
            message: isFunctionExpression ? this.shortMessageStr : this.messageStr
        });
    }
    // 检查是否是直接在实例上调用的方法
    isDirectMethodCall(node) {
        // 检查父节点是否是函数调用表达式，并且当前节点是被调用函数
        if (arkanalyzer_1.ts.isCallExpression(node.parent) && node.parent.expression === node) {
            return true; // 例如: new MineB().reduce(...) 或 obj.method()
        }
        return false;
    }
    // 判断是否是静态方法访问
    isStaticMethodAccess(node, className, methodName) {
        // 以下情况不视为静态方法访问，直接返回false
        if (
        // 访问prototype属性
        methodName === 'prototype' ||
            // 计算属性名中使用的静态方法
            this.isInComputedPropertyName(node) ||
            // 静态箭头函数属性
            this.isStaticArrowFunctionProperty(className, methodName) ||
            // Promise继承的静态方法
            this.isInheritedStaticMethod(node, className, methodName) ||
            // 在extends子句中
            this.isInExtendsClause(node) ||
            // 静态方法内部访问静态属性
            this.isStaticPropertyInStaticMethod(node) ||
            // 静态方法内部调用其他静态方法
            this.isStaticMethodCallInStaticMethod(node) ||
            // 对象字面量或解构赋值中
            this.isInObjectLiteralOrDestructuring(node.parent) ||
            // 在prototype访问链中
            this.isInPrototypeChain(node)) {
            return false;
        }
        return true;
    }
    // 检查是否在extends子句中
    isInExtendsClause(node) {
        let currentNode = node;
        while (currentNode && currentNode.parent) {
            if (currentNode.parent.kind === arkanalyzer_1.ts.SyntaxKind.HeritageClause &&
                currentNode.parent.token === arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword) {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }
    // 检查是否是静态方法内部访问静态属性
    isStaticPropertyInStaticMethod(node) {
        if (!arkanalyzer_1.ts.isIdentifier(node.expression)) {
            return false;
        }
        // 检查是否在静态方法内部
        let isInStaticMethod = false;
        let currentMethod = node;
        while (currentMethod && currentMethod.parent) {
            if (arkanalyzer_1.ts.isMethodDeclaration(currentMethod) &&
                currentMethod.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword)) {
                isInStaticMethod = true;
                break;
            }
            currentMethod = currentMethod.parent;
        }
        if (!isInStaticMethod) {
            return false;
        }
        // 检查是否是方法调用表达式
        if (arkanalyzer_1.ts.isCallExpression(node.parent) && node.parent.expression === node) {
            // 在静态方法内部对其他静态方法的调用，应返回true表示这不是未绑定方法
            return true;
        }
        // 检查父节点不是调用表达式或调用表达式但当前节点不是callee
        const notMethodCall = !arkanalyzer_1.ts.isCallExpression(node.parent) ||
            (arkanalyzer_1.ts.isCallExpression(node.parent) && node.parent.expression !== node);
        return notMethodCall;
    }
    // 检查是否是静态方法内部调用其他静态方法
    isStaticMethodCallInStaticMethod(node) {
        // 检查是否是方法调用表达式
        if (!arkanalyzer_1.ts.isCallExpression(node.parent) || node.parent.expression !== node) {
            return false;
        }
        // 检查是否在静态方法内部
        let isInStaticMethod = false;
        let currentMethod = node;
        while (currentMethod && currentMethod.parent) {
            if (arkanalyzer_1.ts.isMethodDeclaration(currentMethod) &&
                currentMethod.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword)) {
                isInStaticMethod = true;
                break;
            }
            currentMethod = currentMethod.parent;
        }
        // 如果在静态方法内部，且是调用另一个静态方法，则视为合法使用
        return isInStaticMethod;
    }
    // 检查是否在对象字面量或解构赋值中
    isInObjectLiteralOrDestructuring(parent) {
        return arkanalyzer_1.ts.isObjectLiteralExpression(parent) ||
            (arkanalyzer_1.ts.isVariableDeclaration(parent) && arkanalyzer_1.ts.isObjectBindingPattern(parent.name));
    }
    // 检查是否在prototype访问链中
    isInPrototypeChain(node) {
        let current = node;
        while (current.parent) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(current.parent) &&
                current.parent.name.getText() === 'prototype') {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 检查节点是否在计算属性名中
    isInComputedPropertyName(node) {
        let current = node;
        while (current && current.parent) {
            // 检查是否在计算属性名内部
            if (arkanalyzer_1.ts.isComputedPropertyName(current.parent)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 检查属性访问是否是未绑定方法
    checkPropertyAccess(node, variableToClassName, classMethodInfo, options, errors) {
        // 跳过条件检查
        if (this.shouldSkipPropertyCheck(node)) {
            return;
        }
        // 获取类名和方法名
        const className = this.getClassNameFromExpression(node.expression, variableToClassName);
        if (!className) {
            return;
        }
        const methodName = node.name.getText();
        // 检查是否是方法引用
        if (!this.isPropertyMethodReference(node, className, methodName)) {
            return;
        }
        // 检查是否是类静态方法访问
        if (this.isDirectClassStaticAccess(node, options)) {
            // 如果是静态方法且不忽略静态方法，则报告错误
            if (!options.ignoreStatic && arkanalyzer_1.ts.isIdentifier(node.expression)) {
                const sourceCode = this.sourceFile.getFullText();
                const classPattern = new RegExp(`class\\s+${node.expression.getText()}\\s*\\{`);
                if (classPattern.test(sourceCode) && this.isUnboundContext(node.parent, node)) {
                    this.reportUnboundMethodError(node, errors);
                }
            }
            return;
        }
        // 检查实例方法
        const key = `${className}.${methodName}`;
        const methodInfo = classMethodInfo.get(key);
        // 未绑定上下文检查
        if (!this.isUnboundContext(node.parent, node)) {
            return;
        }
        // 豁免情况检查
        if (this.isExemptCase(methodInfo, options, node)) {
            return;
        }
        // 报告错误
        this.reportUnboundMethodError(node, errors);
    }
    // 检查是否应该跳过属性检查
    shouldSkipPropertyCheck(node) {
        // 检查是否包含可选链或括号表达式
        if (this.containsOptionalChainOrParenthesized(node)) {
            return true;
        }
        // 检查是否是非空断言后的属性访问
        if (this.isNonNullAssertionExpression(node.expression)) {
            return true;
        }
        // 检查是否是方法内部的this属性访问
        if (node.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            let current = node;
            while (current.parent) {
                if (arkanalyzer_1.ts.isMethodDeclaration(current.parent) ||
                    (arkanalyzer_1.ts.isPropertyDeclaration(current.parent) &&
                        current.parent.initializer &&
                        arkanalyzer_1.ts.isArrowFunction(current.parent.initializer))) {
                    return true;
                }
                current = current.parent;
            }
        }
        return false;
    }
    // 检查是否是直接的类静态方法访问
    isDirectClassStaticAccess(node, options) {
        if (!arkanalyzer_1.ts.isIdentifier(node.expression)) {
            return false;
        }
        // 直接在源代码中查找类声明
        const expressionText = node.expression.getText();
        const sourceCode = this.sourceFile.getFullText();
        const classPattern = new RegExp(`class\\s+${expressionText}\\s*\\{`);
        // 检查是否是类名且在未绑定上下文中
        return classPattern.test(sourceCode) && this.isUnboundContext(node.parent, node);
    }
    // 检查是否包含可选链或括号表达式
    containsOptionalChainOrParenthesized(node) {
        // 直接检查当前节点的文本，看是否包含 ?.
        const nodeText = node.getText();
        if (nodeText.includes('?.')) {
            return true;
        }
        // 检查表达式是否是括号表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(node.expression)) {
            // 检查括号内的表达式是否包含可选链
            const innerExpr = node.expression.expression;
            const innerText = innerExpr.getText();
            if (innerText.includes('?.')) {
                return true;
            }
            // 对于括号表达式中的复杂表达式，我们也直接跳过
            // 这样可以避免误报 (a?.b).c 这样的模式
            return true;
        }
        return false;
    }
    // 判断属性引用是否是方法引用
    isPropertyMethodReference(node, className, propertyName) {
        // 1. 快速检查 - 显而易见的方法场景
        if (this.isDirectMethodCall(node)) {
            return true; // 方法调用：foo.method()
        }
        if (this.isKnownGlobalMethod(className, propertyName)) {
            return true; // 已知的全局对象静态方法
        }
        // 2. 特殊处理 - 多级属性访问
        if (this.isNestedPropertyAccess(node) && !this.isExplicitlyDeclaredAsMethod(node)) {
            return false; // 多级属性访问，没有证据表明是方法
        }
        // 3. 上下文检查 - 赋值场景
        if (this.isInAssignmentContext(node)) {
            if (this.isAssignmentWithMethodDeclaration(node, className, propertyName)) {
                return true;
            }
        }
        // 4. 类定义检查
        const methodType = this.checkClassMemberType(className, propertyName);
        if (methodType !== null) {
            return methodType; // true表示是方法，false表示普通属性
        }
        // 5. 上下文推断
        return this.isInMethodReferenceContext(node);
    }
    // 检查是否是已知的全局对象方法
    isKnownGlobalMethod(className, propertyName) {
        return className === 'Promise' && this.promiseTemArray.includes(propertyName);
    }
    // 检查在赋值上下文中是否有方法声明
    isAssignmentWithMethodDeclaration(node, className, propertyName) {
        if (!arkanalyzer_1.ts.isBinaryExpression(node.parent)) {
            return false;
        }
        if (node.parent.operatorToken.kind !== arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            return false;
        }
        const foundMethod = this.findMethodInClassByName(className, propertyName);
        return !!foundMethod;
    }
    // 检查类成员的类型，返回null表示未找到成员
    checkClassMemberType(className, propertyName) {
        let classDecl;
        // 查找类声明
        const findClass = (node) => {
            if (arkanalyzer_1.ts.isClassDeclaration(node) &&
                node.name?.getText() === className) {
                classDecl = node;
                return;
            }
            if (!classDecl) {
                arkanalyzer_1.ts.forEachChild(node, findClass);
            }
        };
        findClass(this.sourceFile);
        if (!classDecl) {
            return null;
        }
        for (const member of classDecl.members) {
            if (!member.name || member.name.getText() !== propertyName) {
                continue;
            }
            // 是方法声明
            if (arkanalyzer_1.ts.isMethodDeclaration(member)) {
                return true;
            }
            // 是箭头函数属性
            if (arkanalyzer_1.ts.isPropertyDeclaration(member) &&
                member.initializer &&
                arkanalyzer_1.ts.isArrowFunction(member.initializer)) {
                return true;
            }
            // 既不是方法也不是箭头函数，是普通属性
            return false;
        }
        return null;
    }
    // 检查是否在赋值上下文中
    isInAssignmentContext(node) {
        const parent = node.parent;
        // 左侧赋值: instance.method = x
        if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
            parent.left === node) {
            return true;
        }
        // 右侧赋值: x = instance.method
        if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
            parent.right === node) {
            return true;
        }
        // 变量声明时赋值: let x = instance.method
        if (arkanalyzer_1.ts.isVariableDeclaration(parent) &&
            parent.initializer === node) {
            return true;
        }
        return false;
    }
    // 在类定义中查找方法
    findMethodInClassByName(className, methodName) {
        // 初始化结果变量
        let result = undefined;
        // 递归遍历源文件找到特定类及其方法
        const visitNode = (node) => {
            // 如果已找到结果，不再继续遍历
            if (result) {
                return;
            }
            // 如果是类声明且类名匹配
            if (this.isMatchingClass(node, className)) {
                // 在类成员中查找方法
                this.findMethodInClassMembers(node, methodName, (method) => {
                    result = method;
                });
                return;
            }
            // 继续遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        // 从源文件开始遍历
        visitNode(this.sourceFile);
        return result;
    }
    // 检查节点是否是匹配的类声明
    isMatchingClass(node, className) {
        return arkanalyzer_1.ts.isClassDeclaration(node) &&
            !!node.name &&
            node.name.getText() === className;
    }
    // 在类成员中查找特定名称的方法
    findMethodInClassMembers(classDecl, methodName, callback) {
        for (const member of classDecl.members) {
            if (this.isMatchingMethod(member, methodName)) {
                callback(member);
                return;
            }
        }
    }
    // 检查成员是否是匹配的方法声明
    isMatchingMethod(member, methodName) {
        return arkanalyzer_1.ts.isMethodDeclaration(member) &&
            !!member.name &&
            member.name.getText() === methodName;
    }
    // 检查是否在方法引用上下文中
    isInMethodReferenceContext(node) {
        const parent = node.parent;
        // 赋值表达式右侧
        if (arkanalyzer_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
            parent.right === node) {
            return true;
        }
        // 函数调用参数
        if (arkanalyzer_1.ts.isCallExpression(parent) &&
            parent.arguments.some(arg => arg === node)) {
            return true;
        }
        // 数组元素
        if (arkanalyzer_1.ts.isArrayLiteralExpression(parent) &&
            parent.elements.some(el => el === node)) {
            return true;
        }
        // 变量声明初始化
        if (arkanalyzer_1.ts.isVariableDeclaration(parent) &&
            parent.initializer === node) {
            return true;
        }
        // 返回语句
        if (arkanalyzer_1.ts.isReturnStatement(parent) &&
            parent.expression === node) {
            return true;
        }
        return false;
    }
    // 修改后的解构赋值检查逻辑
    checkObjectDestructuring(node, objectMethodInfo, classMethodInfo, errors) {
        // 1. 快速确认是否是有效的解构上下文
        const parent = node.parent;
        if (!this.isValidDestructuringContext(parent)) {
            return;
        }
        // 2. 获取初始化器表达式
        const initializer = this.getDestructuringInitializer(parent);
        if (!initializer) {
            return;
        }
        // 3. 获取解构上下文信息
        const contextInfo = this.getDestructuringContextInfo(initializer);
        // 4. 处理每个解构元素
        node.elements.forEach(element => {
            if (!arkanalyzer_1.ts.isBindingElement(element)) {
                return;
            }
            this.checkDestructuredElement(element, contextInfo, objectMethodInfo, classMethodInfo, errors);
        });
    }
    // 检查是否是有效的解构上下文
    isValidDestructuringContext(parent) {
        return arkanalyzer_1.ts.isVariableDeclaration(parent) || arkanalyzer_1.ts.isBinaryExpression(parent);
    }
    // 获取解构表达式的初始化器
    getDestructuringInitializer(parent) {
        if (arkanalyzer_1.ts.isVariableDeclaration(parent)) {
            return parent.initializer;
        }
        else if (arkanalyzer_1.ts.isBinaryExpression(parent)) {
            return parent.right;
        }
        return undefined;
    }
    // 获取解构上下文信息
    getDestructuringContextInfo(initializer) {
        const source = this.getClassNameFromExpression(initializer, this.collectVariableToClassMapping(this.sourceFile)) ||
            initializer.getText(this.sourceFile);
        const isNewExpression = arkanalyzer_1.ts.isNewExpression(initializer);
        const className = isNewExpression ? initializer.expression.getText(this.sourceFile) : '';
        const sourceText = initializer.getText(this.sourceFile);
        const isPromiseStatic = sourceText === 'Promise';
        return { source, isNewExpression, className, isPromiseStatic };
    }
    // 检查单个解构元素
    checkDestructuredElement(element, contextInfo, objectMethodInfo, classMethodInfo, errors) {
        // 1. 提取方法名
        const methodName = element.propertyName?.getText(this.sourceFile) || element.name.getText();
        const key = `${contextInfo.source}.${methodName}`;
        // 2. 特殊处理Promise静态方法
        if (contextInfo.isPromiseStatic && this.promiseTemArray.includes(methodName)) {
            this.reportDestructuringError(element, methodName, errors);
            return;
        }
        // 3. 检查已知的方法信息
        const methodInfo = classMethodInfo.get(key) || objectMethodInfo.get(key);
        if (methodInfo) {
            this.checkMethodInfoForUnbound(methodInfo, element, methodName, errors);
        }
        // 4. 检查类中的函数表达式属性
        else if (contextInfo.isNewExpression) {
            this.checkFunctionExpressionProperty(contextInfo.className, element, methodName, errors);
        }
    }
    // 检查方法信息是否表示未绑定方法
    checkMethodInfoForUnbound(methodInfo, element, methodName, errors) {
        // 箭头函数属性不会导致未绑定问题
        if ('isArrowFunc' in methodInfo && methodInfo.isArrowFunc) {
            return;
        }
        // this:void 注解的方法不会导致未绑定问题
        if (methodInfo.hasThisVoid) {
            return;
        }
        // 在解绑上下文中报告错误
        if (this.isUnboundContext(element, element)) {
            this.reportDestructuringError(element, methodName, errors);
        }
    }
    // 检查类中是否有函数表达式属性
    checkFunctionExpressionProperty(className, element, methodName, errors) {
        if (this.checkClassHasFunctionProperty(className, methodName)) {
            this.reportDestructuringError(element, methodName, errors);
        }
    }
    // 检查是否属于豁免情况
    isExemptCase(methodInfo, options, node) {
        // 如果是箭头函数属性则豁免
        if (methodInfo?.isArrowFunc) {
            return true;
        }
        // 静态方法且ignoreStatic为true
        if (methodInfo?.isStatic && options.ignoreStatic) {
            return true;
        }
        // 方法有this:void注解
        if (methodInfo?.hasThisVoid) {
            return true;
        }
        // 使用了bind等方式绑定this
        if (this.isBoundUsage(node)) {
            return true;
        }
        return false;
    }
    // 报告未绑定方法错误
    reportUnboundMethodError(node, errors) {
        const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
        // 判断是否是函数表达式属性
        const isFunctionExpression = this.isPropertyAccessToFunctionExpression(node);
        errors.push({
            line: sourcePos.line + 1,
            character: sourcePos.character + 1,
            endCol: sourcePos.character + node.getText().length + 1,
            message: isFunctionExpression ? this.shortMessageStr : this.messageStr
        });
    }
    // 报告解构中的未绑定方法错误
    reportDestructuringError(element, methodName, errors) {
        const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(element.getStart());
        // 检查父节点以获取类名信息
        const parent = element.parent;
        if (!parent || !arkanalyzer_1.ts.isObjectBindingPattern(parent)) {
            // 无法确定是否为函数表达式，使用完整消息
            errors.push({
                line: sourcePos.line + 1,
                character: sourcePos.character + 1,
                endCol: sourcePos.character + methodName.length + 1,
                message: this.messageStr
            });
            return;
        }
        // 尝试获取类名信息
        const declaration = parent.parent;
        let isFunctionExprProperty = false;
        if (arkanalyzer_1.ts.isVariableDeclaration(declaration) && declaration.initializer) {
            // 处理变量声明的情况: const { method } = instance
            isFunctionExprProperty = this.isInitializerWithFunctionExprProperty(declaration.initializer, methodName);
        }
        else if (arkanalyzer_1.ts.isBinaryExpression(declaration)) {
            // 处理赋值表达式的情况: ({ method } = instance)
            const binaryExpr = declaration;
            if (binaryExpr.right) {
                isFunctionExprProperty = this.isInitializerWithFunctionExprProperty(binaryExpr.right, methodName);
            }
        }
        errors.push({
            line: sourcePos.line + 1,
            character: sourcePos.character + 1,
            endCol: sourcePos.character + methodName.length + 1,
            message: isFunctionExprProperty ? this.shortMessageStr : this.messageStr
        });
    }
    // 检查初始化器是否包含函数表达式属性
    isInitializerWithFunctionExprProperty(initializer, propertyName) {
        // 处理 new 表达式: new Class()
        if (arkanalyzer_1.ts.isNewExpression(initializer)) {
            const className = initializer.expression.getText();
            return this.checkClassHasFunctionProperty(className, propertyName);
        }
        // 处理标识符: instance
        if (arkanalyzer_1.ts.isIdentifier(initializer)) {
            const variableName = initializer.getText();
            const variableToClassName = this.collectVariableToClassMapping(this.sourceFile);
            const className = variableToClassName.get(variableName);
            if (className) {
                return this.checkClassHasFunctionProperty(className, propertyName);
            }
        }
        return false;
    }
    // 检查方法是否使用this
    checkThisUsage(node) {
        let usesThis = false;
        const visit = (child) => {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
                usesThis = true;
            }
            arkanalyzer_1.ts.forEachChild(child, visit);
        };
        arkanalyzer_1.ts.forEachChild(node, visit);
        return usesThis;
    }
    // 检查方法是否有this: void注解
    checkThisVoidAnnotation(node) {
        if (arkanalyzer_1.ts.isMethodDeclaration(node)) {
            return node.parameters.some(p => p.name.getText() === 'this' &&
                p.type?.getText() === 'void');
        }
        return false;
    }
    // 判断是否在解绑上下文中使用（赋值、解构等）
    isUnboundContext(parentNode, currentExpr) {
        // 处理函数调用参数的情况（新增）
        if (arkanalyzer_1.ts.isCallExpression(parentNode)) {
            return parentNode.arguments.some(arg => arg === currentExpr);
        }
        // 处理赋值表达式的情况
        if (arkanalyzer_1.ts.isBinaryExpression(parentNode) &&
            parentNode.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            return currentExpr === parentNode.right;
        }
        // 处理变量声明的情况
        if (arkanalyzer_1.ts.isVariableDeclaration(parentNode)) {
            return true;
        }
        // 处理对象解构的情况
        return arkanalyzer_1.ts.isPropertyAssignment(parentNode) ||
            arkanalyzer_1.ts.isBindingElement(parentNode) ||
            arkanalyzer_1.ts.isSpreadAssignment(parentNode);
    }
    // 检查是否已正确绑定（如使用bind、箭头函数等）
    isBoundUsage(node) {
        let current = node.parent;
        while (current) {
            if (arkanalyzer_1.ts.isCallExpression(current)) {
                const expr = current.expression;
                if (arkanalyzer_1.ts.isPropertyAccessExpression(expr) &&
                    expr.name.getText() === 'bind') {
                    return true;
                }
            }
            if (arkanalyzer_1.ts.isArrowFunction(current) ||
                arkanalyzer_1.ts.isFunctionExpression(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 检查一个表达式是否是非空断言表达式
    isNonNullAssertionExpression(node) {
        // 直接非空断言 foo!
        if (arkanalyzer_1.ts.isNonNullExpression(node)) {
            return true;
        }
        // 多层非空断言 foo!!
        if (arkanalyzer_1.ts.isNonNullExpression(node) &&
            arkanalyzer_1.ts.isNonNullExpression(node.expression)) {
            return true;
        }
        // 带括号的非空断言 (foo!)
        if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            return this.isNonNullAssertionExpression(node.expression);
        }
        return false;
    }
    // 检查是否是继承自Promise的静态方法
    isInheritedStaticMethod(node, className, methodName) {
        // 1. 检查方法名是否在Promise静态方法列表中
        if (!this.promiseTemArray.includes(methodName)) {
            return false; // 不是Promise静态方法名
        }
        // 2. 检查使用上下文
        if (this.isInAssignmentContext(node)) {
            return true; // 在赋值上下文中使用
        }
        // 3. 检查类是否继承自Promise
        if (!arkanalyzer_1.ts.isIdentifier(node.expression)) {
            return false;
        }
        const classDecl = this.findClassDeclarationByName(className);
        return this.isClassInheritingPromise(classDecl);
    }
    // 查找类声明
    findClassDeclarationByName(className) {
        let classDecl;
        const findClass = (sourceNode) => {
            if (arkanalyzer_1.ts.isClassDeclaration(sourceNode) &&
                sourceNode.name?.getText() === className) {
                classDecl = sourceNode;
                return;
            }
            if (!classDecl) {
                arkanalyzer_1.ts.forEachChild(sourceNode, findClass);
            }
        };
        findClass(this.sourceFile);
        return classDecl;
    }
    // 检查类是否继承自Promise
    isClassInheritingPromise(classDecl) {
        if (!classDecl || !classDecl.heritageClauses) {
            return false;
        }
        for (const heritage of classDecl.heritageClauses) {
            if (heritage.token !== arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword) {
                continue;
            }
            for (const type of heritage.types) {
                const baseType = type.expression.getText();
                if (baseType === 'Promise' || baseType.startsWith('Promise<')) {
                    return true;
                }
                // 递归检查基类是否是Promise的后代
                if (this.isPromiseDescendant(baseType)) {
                    return true;
                }
            }
        }
        return false;
    }
    // 检查一个类是否是Promise的后代
    isPromiseDescendant(className) {
        // 查找类声明
        const classDecl = this.findClassDeclarationByName(className);
        return this.isClassInheritingPromise(classDecl);
    }
    // 检查是否是静态箭头函数属性
    isStaticArrowFunctionProperty(className, propertyName) {
        // 查找类声明
        let classDecl;
        const findClass = (sourceNode) => {
            if (arkanalyzer_1.ts.isClassDeclaration(sourceNode) &&
                sourceNode.name?.getText() === className) {
                classDecl = sourceNode;
                return;
            }
            arkanalyzer_1.ts.forEachChild(sourceNode, findClass);
        };
        findClass(this.sourceFile);
        // 检查类中是否有对应名称的静态箭头函数属性
        if (classDecl) {
            for (const member of classDecl.members) {
                if (arkanalyzer_1.ts.isPropertyDeclaration(member) &&
                    member.name.getText() === propertyName &&
                    member.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword) &&
                    member.initializer &&
                    arkanalyzer_1.ts.isArrowFunction(member.initializer)) {
                    return true;
                }
            }
        }
        return false;
    }
    // 专门检查赋值表达式中的解构情况
    checkAssignmentExpression(node, objectMethodInfo, classMethodInfo, errors) {
        // 检查括号内表达式
        const innerExpr = node.expression;
        // 情况1: 括号内是赋值表达式
        if (arkanalyzer_1.ts.isBinaryExpression(innerExpr) &&
            innerExpr.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            // 分别处理不同类型的左侧表达式
            if (arkanalyzer_1.ts.isObjectBindingPattern(innerExpr.left)) {
                // 对象解构模式 - 如 { unboundX } = ...
                this.processBindingPattern(innerExpr.left, innerExpr.right, classMethodInfo, errors);
            }
            else if (arkanalyzer_1.ts.isObjectLiteralExpression(innerExpr.left)) {
                // 对象字面量 - 可能是一种不同的解构语法
                this.processObjectLiteral(innerExpr.left, innerExpr.right, classMethodInfo, errors);
            }
            else if (arkanalyzer_1.ts.isParenthesizedExpression(innerExpr.left)) {
                // 括号内可能是对象绑定模式
                const innerExpression = innerExpr.left.expression;
                if (arkanalyzer_1.ts.isObjectBindingPattern(innerExpression)) {
                    this.processBindingPattern(innerExpression, innerExpr.right, classMethodInfo, errors);
                }
                else if (arkanalyzer_1.ts.isObjectLiteralExpression(innerExpression)) {
                    this.processObjectLiteral(innerExpression, innerExpr.right, classMethodInfo, errors);
                }
            }
        }
    }
    // 处理对象绑定模式
    processBindingPattern(pattern, initializer, classMethodInfo, errors) {
        // 获取类名或对象名
        const source = this.getClassNameFromExpression(initializer, this.collectVariableToClassMapping(this.sourceFile)) ||
            initializer.getText(this.sourceFile);
        // 检查是否是新建类实例的表达式
        const isNewExpression = arkanalyzer_1.ts.isNewExpression(initializer);
        const className = isNewExpression ? initializer.expression.getText(this.sourceFile) : '';
        // 检查每个绑定元素
        pattern.elements.forEach((element) => {
            if (!arkanalyzer_1.ts.isBindingElement(element)) {
                return;
            }
            const methodName = element.propertyName?.getText() || element.name.getText();
            const key = `${source}.${methodName}`;
            // 检查是否为类方法
            if (classMethodInfo.has(key)) {
                const methodInfo = classMethodInfo.get(key);
                // 如果是箭头函数属性，不需要报错
                if (methodInfo?.isArrowFunc) {
                    return;
                }
                // 找到实际位置并报告错误
                const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(element.getStart());
                errors.push({
                    line: sourcePos.line + 1,
                    character: sourcePos.character + 1,
                    endCol: sourcePos.character + methodName.length + 1,
                    message: this.messageStr
                });
            }
            // 当从classMethodInfo中找不到方法信息时，如果是new表达式，尝试直接查找类中是否有函数表达式属性
            else if (isNewExpression) {
                // 尝试在源代码中查找类定义
                if (this.checkClassHasFunctionProperty(className, methodName)) {
                    // 如果找到了函数表达式属性，报告错误
                    const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(element.getStart());
                    errors.push({
                        line: sourcePos.line + 1,
                        character: sourcePos.character + 1,
                        endCol: sourcePos.character + methodName.length + 1,
                        message: this.messageStr
                    });
                }
            }
        });
    }
    // 处理对象字面量表达式
    processObjectLiteral(literal, initializer, classMethodInfo, errors) {
        // 获取类名或对象名
        const source = this.getClassNameFromExpression(initializer, this.collectVariableToClassMapping(this.sourceFile)) ||
            initializer.getText(this.sourceFile);
        const isNewExpression = arkanalyzer_1.ts.isNewExpression(initializer); // 检查是否是new表达式，用于判断函数表达式
        const className = isNewExpression ? initializer.expression.getText(this.sourceFile) : '';
        literal.properties.forEach(prop => {
            let propName = '';
            if (arkanalyzer_1.ts.isPropertyAssignment(prop)) {
                propName = prop.name.getText();
            }
            else if (arkanalyzer_1.ts.isShorthandPropertyAssignment(prop)) {
                propName = prop.name.getText();
            }
            else {
                return;
            }
            const key = `${source}.${propName}`;
            // 检查是否为类方法
            if (classMethodInfo.has(key)) {
                const methodInfo = classMethodInfo.get(key);
                // 如果是箭头函数属性，不需要报错
                if (methodInfo?.isArrowFunc) {
                    return;
                }
                const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(prop.name.getStart());
                let isFunctionExpression = false;
                if (isNewExpression) {
                    // 直接检查类中是否有对应名称的函数表达式属性
                    isFunctionExpression = this.checkClassHasFunctionProperty(className, propName);
                }
                errors.push({
                    line: sourcePos.line + 1,
                    character: sourcePos.character + 1,
                    endCol: sourcePos.character + propName.length + 1,
                    message: isFunctionExpression ? this.shortMessageStr : this.messageStr
                });
            }
            else if (isNewExpression) { // 额外处理：当从classMethodInfo中找不到方法信息时，检查类中是否有函数表达式属性
                if (this.checkClassHasFunctionProperty(className, propName)) {
                    const sourcePos = this.sourceFile.getLineAndCharacterOfPosition(prop.name.getStart());
                    errors.push({
                        line: sourcePos.line + 1,
                        character: sourcePos.character + 1,
                        endCol: sourcePos.character + propName.length + 1,
                        message: this.shortMessageStr
                    });
                }
            }
        });
    }
    // 获取表达式中的类名
    getClassNameFromExpression(expr, variableToClassName) {
        // 处理this表达式：通过检查节点的kind属性
        if (expr.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            return this.currentClassName || undefined;
        }
        // 处理 prototype 访问
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expr) && expr.name.getText() === 'prototype') {
            return expr.expression.getText(this.sourceFile);
        }
        // 处理 new ClassName() 的情况
        if (arkanalyzer_1.ts.isNewExpression(expr)) {
            return expr.expression.getText(this.sourceFile);
        }
        // 处理变量引用的情况
        if (arkanalyzer_1.ts.isIdentifier(expr)) {
            return variableToClassName.get(expr.text);
        }
        return expr.getText(this.sourceFile);
    }
    // 检查类是否有函数表达式属性
    checkClassHasFunctionProperty(className, propertyName) {
        // 使用独立函数检查单个类声明
        const checkClass = (classDecl) => {
            if (!classDecl.name || classDecl.name.getText() !== className) {
                return false;
            }
            return this.findFunctionPropertyInClass(classDecl, propertyName);
        };
        // 在源文件中查找匹配的类
        return this.findNodeInSourceFile((node) => arkanalyzer_1.ts.isClassDeclaration(node), checkClass);
    }
    // 在类中查找函数表达式属性
    findFunctionPropertyInClass(classDecl, propertyName) {
        for (const member of classDecl.members) {
            // 只处理属性声明
            if (!arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                continue;
            }
            // 检查属性名
            if (member.name.getText() !== propertyName) {
                continue;
            }
            // 检查初始化器
            if (!member.initializer || !arkanalyzer_1.ts.isFunctionExpression(member.initializer)) {
                continue;
            }
            return true; // 找到匹配的函数表达式属性
        }
        return false; // 未找到
    }
    // 泛型辅助方法：在源文件中查找特定类型的节点
    findNodeInSourceFile(typeGuard, checker) {
        let found = false;
        const visitor = (node) => {
            // 如果已经找到，提前返回
            if (found) {
                return;
            }
            // 类型检查并运行检查函数
            if (typeGuard(node) && checker(node)) {
                found = true;
                return;
            }
            // 继续遍历子节点
            if (!found) {
                arkanalyzer_1.ts.forEachChild(node, visitor);
            }
        };
        arkanalyzer_1.ts.forEachChild(this.sourceFile, visitor);
        return found;
    }
    // 判断属性访问是否指向函数表达式属性
    isPropertyAccessToFunctionExpression(node) {
        // 获取属性名和对象表达式
        const propertyName = node.name.getText();
        const objExpression = node.expression;
        // 如果是new表达式
        if (arkanalyzer_1.ts.isNewExpression(objExpression)) {
            const className = objExpression.expression.getText();
            // 查找类声明
            return this.checkClassHasFunctionProperty(className, propertyName);
        }
        // 如果是普通标识符
        if (arkanalyzer_1.ts.isIdentifier(objExpression)) {
            const objName = objExpression.getText();
            // 尝试找到对应的类型
            const variableToClassName = this.collectVariableToClassMapping(this.sourceFile);
            const className = variableToClassName.get(objName);
            if (className) {
                return this.checkClassHasFunctionProperty(className, propertyName);
            }
        }
        return false;
    }
}
exports.UnboundMethodCheck = UnboundMethodCheck;
