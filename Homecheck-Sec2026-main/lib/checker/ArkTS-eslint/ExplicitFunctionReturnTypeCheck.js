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
exports.ExplicitFunctionReturnTypeCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ExplicitFunctionReturnTypeCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/explicit-function-return-type.md",
    description: "Require explicit return types on functions and class methods",
};
const defaultOptions = {
    allowExpressions: false,
    allowTypedFunctionExpressions: true,
    allowHigherOrderFunctions: true,
    allowDirectConstAssertionInArrowFunctions: true,
    allowConciseArrowFunctionExpressionsStartingWithVoid: false,
    allowFunctionsWithoutTypeParameters: false,
    allowedNames: [],
    allowIIFEs: false,
};
class ExplicitFunctionReturnTypeCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    options = defaultOptions;
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        if (target instanceof arkanalyzer_1.ArkFile) {
            const targetName = target.getName();
            if (targetName && this.getFileExtension(targetName) === '.ets') {
                return;
            }
            const code = target.getCode();
            if (!code) {
                return;
            }
            const filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            this.options = this.rule && this.rule.option && this.rule.option[0] ? this.rule.option[0] : defaultOptions;
            const missingReturnTypes = this.checkExplicitReturnType(sourceFile);
            missingReturnTypes.forEach(info => {
                this.addIssueReportNode(info, filePath);
            });
        }
    };
    checkExplicitReturnType(sourceFile) {
        const result = [];
        const visit = (node) => {
            // 特殊情况处理
            if (this.specialTreatment(node)) {
                return;
            }
            // 检查变量声明中的箭头函数或对象属性中的箭头函数
            if (arkanalyzer_1.ts.isArrowFunction(node)) {
                if (this.checkArrowFunction(node, sourceFile, result)) {
                    return;
                }
            }
            // 检查类方法声明
            if (arkanalyzer_1.ts.isMethodDeclaration(node)) {
                if (this.checkMethodDeclaration(node, sourceFile, result)) {
                    return;
                }
            }
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
                // 特殊函数
                if (arkanalyzer_1.ts.isFunctionExpression(node) && this.specialTreatmentFunctionExpression(node, sourceFile, result)) {
                    return;
                }
                // 如果是抽象函数声明，不需要检查返回类型
                if (arkanalyzer_1.ts.isFunctionDeclaration(node) && this.isAbstractMethod(node)) {
                    return;
                }
                // 如果是函数声明且没有函数体（只有签名声明），不需要检查返回类型
                if (arkanalyzer_1.ts.isFunctionDeclaration(node) && this.isFunctionDeclarationWithoutBody(node)) {
                    return;
                }
                // 如果函数有泛型参数，不需要检查返回类型
                if (this.options.allowFunctionsWithoutTypeParameters && this.hasFunctionTypeParameters(node)) {
                    return;
                }
                if (!node.type) {
                    this.addIssue(node, sourceFile, result);
                }
            }
            // 处理 getter 方法
            if (arkanalyzer_1.ts.isGetAccessorDeclaration(node)) {
                if (this.checkGetAccessorDeclaration(node, sourceFile, result)) {
                    return;
                }
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    checkGetAccessorDeclaration(node, sourceFile, result) {
        // 检查是否是抽象的getter方法
        const isAbstract = node.modifiers && node.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
        // 检查是否有函数体
        const hasBody = node.body !== undefined;
        // 检查是否有返回类型
        const hasReturnType = node.type !== undefined;
        // 非抽象getter必须有函数体
        if (!isAbstract && !hasBody) {
            // 这种情况是getter声明，不报错
            return true;
        }
        // 有函数体的getter必须有返回类型
        if (hasBody && !hasReturnType) {
            const position = this.getGetAccessorNamePosition(node);
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
            result.push({
                fileName: sourceFile.fileName,
                line: line + 1,
                character: character + 1,
                description: 'Missing return type on function.',
            });
        }
        return false;
    }
    specialTreatmentFunctionExpression(node, sourceFile, result) {
        // 检查是否是异步函数
        const isAsync = node.modifiers && node.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.AsyncKeyword);
        // 检查是否是立即执行的函数表达式
        const isIIFE = this.isImmediatelyInvokedFunctionExpression(node);
        // 检查是否在 Promise 构造函数中
        const isInPromiseContext = this.isInPromiseContext(node);
        // 检查是否是匿名函数
        const isAnonymous = !node.name;
        // 如果是在Promise上下文中的异步匿名IIFE，且没有返回类型，应该报错
        if (isAsync && isAnonymous && isIIFE && isInPromiseContext && !node.type) {
            const pos = this.getFunctionKeywordPosition(node, sourceFile);
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            result.push({
                fileName: sourceFile.fileName,
                line: line + 1,
                character: character + 1,
                description: 'Missing return type on function.'
            });
            return true;
        }
        return false;
    }
    specialTreatment(node) {
        if (this.options.allowDirectConstAssertionInArrowFunctions && arkanalyzer_1.ts.isArrowFunction(node) && arkanalyzer_1.ts.isDeleteExpression(node)) {
            return true;
        }
        // 添加对箭头函数中as const断言的检测
        if (this.options.allowDirectConstAssertionInArrowFunctions && this.hasConstAssertion(node)) {
            return true;
        }
        if (this.options.allowExpressions && arkanalyzer_1.ts.isArrowFunction(node)) {
            return true;
        }
        // 检查是否在函数调用的对象参数中
        if ((arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node)) && this.isInObjectArgument(node)) {
            return true;
        }
        if (this.options.allowConciseArrowFunctionExpressionsStartingWithVoid && arkanalyzer_1.ts.isVoidExpression(node)) {
            return true;
        }
        if (this.options.allowIIFEs && arkanalyzer_1.ts.isArrowFunction(node) && arkanalyzer_1.ts.isPrefixUnaryExpression(node) && arkanalyzer_1.ts.isPostfixUnaryExpression(node)) {
            return true;
        }
        if (this.specialTreatmentExpression(node)) {
            return true;
        }
        return false;
    }
    specialTreatmentExpression(node) {
        if (arkanalyzer_1.ts.isClassDeclaration(node) && node.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword)) {
            // 允许declare类定义，但检查declare abstract类中的方法
            const hasAbstract = node.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
            if (!hasAbstract) {
                return true; // 只有普通的declare类，跳过检查
            }
        }
        // 检查高阶函数
        if (this.options.allowHigherOrderFunctions && this.isHigherOrderFunction(node)) {
            return true;
        }
        // 检查是否是函数表达式
        if (arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
            // 如果函数是类型断言的一部分，则不报告问题
            if (this.isPartOfTypeAssertion(node)) {
                return true;
            }
            if (this.options.allowTypedFunctionExpressions && this.isTypedFunctionExpression(node)) {
                return true;
            }
            // 检查祖先是否有返回类型
            if (this.options.allowTypedFunctionExpressions && this.ancestorHasReturnType(node)) {
                return true;
            }
            // 允许有泛型参数的函数不需要返回类型
            if (this.options.allowFunctionsWithoutTypeParameters && this.hasFunctionTypeParameters(node)) {
                return true;
            }
        }
        return false;
    }
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    /**
     * 检查节点是否在函数调用的对象参数中
     */
    isInObjectArgument(node) {
        // 检查父节点链，查找是否是在对象字面量中作为属性值
        let current = node;
        let isProperty = false;
        while (current) {
            // 如果当前节点是属性赋值的一部分
            if (arkanalyzer_1.ts.isPropertyAssignment(current)) {
                isProperty = true;
                // 继续检查是否在对象字面量中
                current = current.parent;
                continue;
            }
            // 如果我们已经发现是属性，现在检查是否在对象字面量中
            if (isProperty && arkanalyzer_1.ts.isObjectLiteralExpression(current)) {
                if (this.isInObjectLiteralExpression(current)) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }
    isInObjectLiteralExpression(current) {
        // 检查对象字面量是否作为函数调用的参数
        const parent = current.parent;
        if (parent && arkanalyzer_1.ts.isCallExpression(parent)) {
            // 检查对象字面量是否是调用表达式的参数
            if (parent.arguments.includes(current)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检查类方法是否应该有返回类型
     */
    shouldMethodHaveReturnType(node) {
        // 构造函数不需要返回类型
        if (node.name && arkanalyzer_1.ts.isIdentifier(node.name) && node.name.text === 'constructor') {
            return false;
        }
        const parent = node.parent;
        if (parent && arkanalyzer_1.ts.isClassDeclaration(parent)) {
            const isDeclare = parent.modifiers && parent.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword);
            if (isDeclare) {
                return false;
            }
        }
        // 返回类型为空的情况
        if (node.type) {
            return false;
        }
        // 所有其他方法都应有返回类型
        return true;
    }
    /**
     * 检查变量声明中的箭头函数是否应该有返回类型
     */
    shouldVariableArrowFunctionHaveType(node) {
        const parent = node.parent;
        // 检查是否是变量声明中的箭头函数
        if (parent && arkanalyzer_1.ts.isVariableDeclaration(parent)) {
            // 如果变量声明没有类型注解，则箭头函数应该有返回类型
            if (!parent.type) {
                // 除非允许表达式函数
                if (this.options.allowExpressions) {
                    return false;
                }
                return true;
            }
        }
        return false;
    }
    /**
     * 获取箭头函数的起始位置
     * 这个函数用于确保问题点定位在箭头函数的正确位置
     */
    getArrowFunctionStartPosition(node, sourceFile) {
        if (node.parent && arkanalyzer_1.ts.isPropertyAssignment(node.parent)) {
            // 返回属性名的位置，而不是箭头函数的位置
            return node.parent.name.getStart(sourceFile);
        }
        // 尝试定位箭头符号
        const arrowToken = node.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.EqualsGreaterThanToken);
        if (arrowToken) {
            // 找到箭头位置，返回箭头位置
            return arrowToken.getStart(sourceFile);
        }
        // 如果找不到箭头符号，回退到整个函数的起始位置
        return node.getStart(sourceFile);
    }
    /**
     * 获取函数声明的起始位置
     * 对于异步函数，返回async关键字的位置而不是function关键字
     */
    getFunctionKeywordPosition(node, sourceFile) {
        // 检查是否是异步函数
        const isAsync = node.modifiers && node.modifiers.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.AsyncKeyword);
        if (isAsync) {
            // 对于异步函数，尝试定位async关键字
            const asyncKeyword = node.modifiers.find(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.AsyncKeyword);
            if (asyncKeyword) {
                return asyncKeyword.getStart(sourceFile);
            }
        }
        // 对于非异步函数或找不到async关键字的情况，尝试定位function关键字
        const functionKeyword = node.getChildren(sourceFile).find(child => child.kind === arkanalyzer_1.ts.SyntaxKind.FunctionKeyword);
        if (functionKeyword) {
            return functionKeyword.getStart(sourceFile);
        }
        // 如果找不到关键字，回退到整个函数的起始位置
        return node.getStart(sourceFile);
    }
    /**
     * 获取方法名的位置
     * 这个函数用于确保问题点定位在方法名位置，而不是整个方法声明的起始位置
     */
    getMethodNamePosition(node, sourceFile) {
        // 尝试获取方法名
        if (node.name) {
            // 返回方法名的起始位置
            return node.name.getStart(sourceFile);
        }
        // 如果找不到方法名，回退到整个方法声明的起始位置
        return node.getStart(sourceFile);
    }
    isInTypedObjectLiteral(objectLiteral) {
        // 获取对象字面量的父节点
        const objectParent = objectLiteral.parent;
        if (this.isInTypedObjectParent(objectLiteral, objectParent)) {
            return true; // 不需要报错
        }
        // 情况4: 对象字面量是数组元素 - 检查数组是否有类型
        if (objectParent && arkanalyzer_1.ts.isArrayLiteralExpression(objectParent)) {
            // 获取数组的父节点
            const arrayParent = objectParent.parent;
            // 如果数组是变量声明的一部分且有类型注解
            if (arrayParent && arkanalyzer_1.ts.isVariableDeclaration(arrayParent) && arrayParent.type) {
                return true; // 不需要报错
            }
            // 检查数组是否在导出语句中
            if (arrayParent && this.isInTypedObjectVariableDeclaration(arrayParent)) {
                return true; // 不需要报错
            }
        }
        // 检查导出语句
        if (objectParent && arkanalyzer_1.ts.isVariableStatement(objectParent) &&
            objectParent.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword)) {
            // 检查导出语句中是否有类型注解
            const declarationList = objectParent.declarationList;
            if (declarationList && declarationList.declarations.length > 0) {
                const hasTypeAnnotation = declarationList.declarations.some(d => d.type !== undefined);
                if (hasTypeAnnotation) {
                    return true; // 不需要报错
                }
            }
        }
        // 递归检查父对象是否有类型上下文
        return this.isInTypedObject(objectLiteral);
    }
    isInTypedObjectParent(objectLiteral, objectParent) {
        // 情况1: 对象字面量是类型断言的一部分
        if (objectParent && (arkanalyzer_1.ts.isAsExpression(objectParent) || arkanalyzer_1.ts.isTypeAssertionExpression(objectParent))) {
            return true; // 不需要报错
        }
        // 情况2: 对象字面量是一个有类型注解的变量声明的初始化表达式 
        if (objectParent && arkanalyzer_1.ts.isVariableDeclaration(objectParent) && objectParent.type) {
            return true; // 不需要报错
        }
        // 情况3: 对象字面量是函数调用的参数
        if (objectParent && arkanalyzer_1.ts.isCallExpression(objectParent) &&
            objectParent.arguments.includes(objectLiteral)) {
            return true; // 不需要报错
        }
        return false;
    }
    isInTypedObjectVariableDeclaration(arrayParent) {
        let current = arrayParent;
        while (current) {
            // 如果是变量声明且有类型
            if (arkanalyzer_1.ts.isVariableDeclaration(current) && current.type) {
                return true; // 不需要报错
            }
            if (this.isInTypedObjectVariableStatement(current)) {
                return true; // 不需要报错
            }
            current = current.parent;
        }
        return false;
    }
    isInTypedObjectVariableStatement(current) {
        // 如果是导出声明
        if (arkanalyzer_1.ts.isVariableStatement(current) &&
            current.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword)) {
            // 检查导出语句中是否有类型注解
            const declarationList = current.declarationList;
            if (declarationList && declarationList.declarations.length > 0) {
                const hasTypeAnnotation = declarationList.declarations.some(d => d.type !== undefined);
                if (hasTypeAnnotation) {
                    return true; // 不需要报错
                }
            }
        }
        return false;
    }
    isInTypedObject(node) {
        let parent = node.parent;
        // 处理属性赋值
        if (parent && arkanalyzer_1.ts.isPropertyAssignment(parent)) {
            // 获取对象字面量
            const objectLiteral = parent.parent;
            if (objectLiteral && arkanalyzer_1.ts.isObjectLiteralExpression(objectLiteral)) {
                if (this.isInTypedObjectLiteral(objectLiteral)) {
                    return true;
                }
            }
        }
        // 如果当前节点是对象字面量，检查其父节点
        if (parent && arkanalyzer_1.ts.isObjectLiteralExpression(parent)) {
            // 检查对象字面量的父节点
            const grandParent = parent.parent;
            // 如果对象字面量是属性赋值的值部分
            if (grandParent && arkanalyzer_1.ts.isPropertyAssignment(grandParent)) {
                // 递归检查包含该属性的对象
                return this.isInTypedObject(grandParent);
            }
            // 如果对象字面量是类型断言的一部分
            if (grandParent && (arkanalyzer_1.ts.isAsExpression(grandParent) || arkanalyzer_1.ts.isTypeAssertionExpression(grandParent))) {
                return true;
            }
            // 如果对象字面量是变量声明的一部分
            if (grandParent && arkanalyzer_1.ts.isVariableDeclaration(grandParent) && grandParent.type) {
                return true;
            }
            // 如果对象字面量是导出语句的一部分
            if (this.isInTypedObjectGrandParent(grandParent)) {
                return true; // 不需要报错
            }
        }
        return false;
    }
    isInTypedObjectGrandParent(grandParent) {
        if (grandParent && arkanalyzer_1.ts.isVariableStatement(grandParent) &&
            grandParent.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword)) {
            // 检查导出语句中是否有类型注解
            const declarationList = grandParent.declarationList;
            if (declarationList && declarationList.declarations.length > 0) {
                const hasTypeAnnotation = declarationList.declarations.some(d => d.type !== undefined);
                if (hasTypeAnnotation) {
                    return true; // 不需要报错
                }
            }
        }
        return false;
    }
    /**
     * 检查对象属性中的箭头函数
     * 只有当箭头函数在有类型的对象中时，才不需要报错
     */
    isObjectPropertyArrowFunction(node) {
        // 首先检查是否在属性赋值中
        if (node.parent && arkanalyzer_1.ts.isPropertyAssignment(node.parent)) {
            return this.isInTypedObject(node);
        }
        // 处理更复杂的对象属性情况
        let parent = node.parent;
        while (parent) {
            // 处理可能的中间层级节点
            if (arkanalyzer_1.ts.isPropertyAssignment(parent)) {
                return this.isInTypedObject(parent);
            }
            // 处理方法中的箭头函数
            if (arkanalyzer_1.ts.isMethodDeclaration(parent) || arkanalyzer_1.ts.isFunctionExpression(parent) || arkanalyzer_1.ts.isFunctionDeclaration(parent)) {
                return true; // 在方法或函数内部，不报错
            }
            parent = parent.parent;
        }
        return false;
    }
    /**
     * 检查方法是否为抽象方法
     */
    isAbstractMethod(node) {
        // 检查方法是否有abstract修饰符
        if (node.modifiers) {
            return node.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
        }
        return false;
    }
    /**
       * 检查父类是否是declare abstract class
       */
    isParentDeclarativeAbstractClass(node) {
        const parent = node.parent;
        if (parent && arkanalyzer_1.ts.isClassDeclaration(parent)) {
            // 检查类是否同时有declare和abstract修饰符
            if (parent.modifiers) {
                const hasDeclare = parent.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword);
                const hasAbstract = parent.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
                return hasDeclare && hasAbstract;
            }
        }
        return false;
    }
    /**
     * 检查函数声明是否只有声明而没有函数体
     */
    isFunctionDeclarationWithoutBody(node) {
        // 检查是否有分号结尾的函数声明（无函数体）
        return !node.body;
    }
    /**
     * 检查函数是否有泛型参数且应该忽略返回类型检查
     * 类方法的泛型参数不应该忽略返回类型检查
     */
    hasFunctionTypeParameters(node) {
        // 检查是否是方法声明
        if (arkanalyzer_1.ts.isMethodDeclaration(node)) {
            // 类方法即使有泛型参数也应该有返回类型
            // 检查父节点是否是类声明或类表达式
            if (node.parent && (arkanalyzer_1.ts.isClassDeclaration(node.parent) || arkanalyzer_1.ts.isClassExpression(node.parent))) {
                return false; // 类方法需要返回类型，不管是否有泛型参数
            }
        }
        // 对于其他函数（非类方法）
        if (arkanalyzer_1.ts.isFunctionDeclaration(node) ||
            arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isArrowFunction(node) ||
            arkanalyzer_1.ts.isMethodDeclaration(node)) {
            // 检查函数是否有类型参数（泛型参数）
            return node.typeParameters !== undefined && node.typeParameters.length > 0;
        }
        return false;
    }
    /**
     * 检查节点是否在 Promise 构造函数中
     */
    isInPromiseContext(node) {
        let current = node;
        while (current) {
            // 检查是否是 new Promise(...) 调用
            if (arkanalyzer_1.ts.isNewExpression(current)) {
                const expression = current.expression;
                if (arkanalyzer_1.ts.isIdentifier(expression) && expression.text === 'Promise') {
                    return true;
                }
            }
            // 访问父节点
            current = current.parent;
        }
        return false;
    }
    /**
     * 检查是否是立即执行的函数表达式 (IIFE)
     */
    isImmediatelyInvokedFunctionExpression(node) {
        const parent = node.parent;
        // 如果函数被立即调用
        if (parent && arkanalyzer_1.ts.isCallExpression(parent) && parent.expression === node) {
            return true;
        }
        // 如果函数被括号包裹并立即调用
        if (parent && arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            const grandParent = parent.parent;
            if (grandParent && arkanalyzer_1.ts.isCallExpression(grandParent) && grandParent.expression === parent) {
                return true;
            }
        }
        return false;
    }
    checkArrowFunctionCurrentNode(currentNode) {
        let isInTypedExport = false;
        if (arkanalyzer_1.ts.isVariableStatement(currentNode)) {
            if (currentNode.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword)) {
                // 检查导出变量是否有类型注解
                const declarationList = currentNode.declarationList;
                if (declarationList && declarationList.declarations.length > 0) {
                    isInTypedExport = declarationList.declarations.some(d => d.type !== undefined ||
                        (d.initializer &&
                            (arkanalyzer_1.ts.isAsExpression(d.initializer) || arkanalyzer_1.ts.isTypeAssertionExpression(d.initializer))));
                }
            }
        }
        return isInTypedExport;
    }
    checkArrowFunction(node, sourceFile, result) {
        // 检查对象属性中的箭头函数
        if (node.parent && arkanalyzer_1.ts.isPropertyAssignment(node.parent)) {
            // 只有当不在有类型的上下文中时才需要报错
            if (this.isObjectPropertyArrowFunction(node)) {
                return false;
            }
            // 检查是否在导出语句中
            let currentNode = node.parent;
            let isInTypedExport = false;
            while (currentNode && !isInTypedExport) {
                isInTypedExport = this.checkArrowFunctionCurrentNode(currentNode);
                currentNode = currentNode.parent;
            }
            if (isInTypedExport) {
                return true; // 在有类型的导出语句中，不报错
            }
            // 获取箭头函数的箭头位置
            const pos = this.getArrowFunctionStartPosition(node, sourceFile);
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            result.push({
                fileName: sourceFile.fileName,
                line: line + 1,
                character: character + 1,
                description: 'Missing return type on function.',
            });
            return true; // 如果是对象属性箭头函数且已经处理，则直接返回
        }
        // 检查是否在对象属性中
        if (this.isObjectPropertyArrowFunction(node)) {
            return true;
        }
        if (this.shouldVariableArrowFunctionHaveType(node)) {
            // 如果是变量声明中的箭头函数，且变量没有类型注解，且函数本身也没有返回类型
            if (!node.type) {
                // 获取箭头函数的箭头位置
                const pos = this.getArrowFunctionStartPosition(node, sourceFile);
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
                result.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: 'Missing return type on function.',
                });
                return true;
            }
        }
        return false;
    }
    checkMethodDeclaration(node, sourceFile, result) {
        // 如果是抽象方法，不需要检查返回类型
        if (this.isAbstractMethod(node)) {
            return true;
        }
        // 检查方法是否在declare abstract class中
        const parent = node.parent;
        if (parent && arkanalyzer_1.ts.isClassDeclaration(parent)) {
            // 检查类是否有declare修饰符
            const isDeclare = parent.modifiers && parent.modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword);
            // 如果是declare class中的方法，不需要报错
            if (isDeclare) {
                return true;
            }
        }
        // 只有当方法不在对象字面量中时才检查返回类型
        if (parent && (arkanalyzer_1.ts.isClassDeclaration(parent) || arkanalyzer_1.ts.isClassExpression(parent))) {
            if (this.checkNonAbstractMethod(node, sourceFile, result)) {
                return true;
            }
        }
        else if (parent && arkanalyzer_1.ts.isObjectLiteralExpression(parent)) {
            if (this.checkMethodDeclarationObjectLiteralExpression(node, parent, sourceFile, result)) {
                return true;
            }
        }
        // 如果是对象字面量中的方法
        if (parent && arkanalyzer_1.ts.isObjectLiteralExpression(parent)) {
            const grandParent = parent.parent;
            // 如果对象字面量是函数调用的参数
            if (grandParent && arkanalyzer_1.ts.isCallExpression(grandParent)) {
                return true;
            }
        }
        return false;
    }
    checkNonAbstractMethod(node, sourceFile, result) {
        // 检查方法是否有返回类型注解 (除构造函数外)
        if (this.shouldMethodHaveReturnType(node)) {
            // 如果方法没有函数体(仅声明)，不需要报错
            if (!node.body) {
                return true;
            }
            // 方法有泛型参数但没有返回类型，除非启用了allowFunctionsWithoutTypeParameters选项且方法有泛型参数，否则报错
            if (!(this.options.allowFunctionsWithoutTypeParameters && this.hasFunctionTypeParameters(node))) {
                // 获取方法名的位置
                const pos = this.getFunctionKeywordPosition(node, sourceFile);
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
                result.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: 'Missing return type on function.',
                });
            }
        }
        return false;
    }
    checkMethodDeclarationObjectLiteralExpression(node, parent, sourceFile, result) {
        // 对于对象字面量中的方法，只有在没有作为函数参数时才检查
        const grandParent = parent.parent;
        if (!(grandParent && arkanalyzer_1.ts.isCallExpression(grandParent))) {
            if (this.shouldMethodHaveReturnType(node)) {
                // 如果方法没有函数体(仅声明)，不需要报错
                if (!node.body) {
                    return true;
                }
                // 获取方法名的位置
                const pos = this.getFunctionKeywordPosition(node, sourceFile);
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
                result.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: 'Missing return type on function.',
                });
            }
        }
        return true;
    }
    isPartOfTypeAssertion(node) {
        // 检查函数是否在作为类型断言的一部分，
        // 检查当前节点
        if (!node.parent) {
            return false;
        }
        // 直接是类型断言的表达式
        if (arkanalyzer_1.ts.isAsExpression(node.parent) || arkanalyzer_1.ts.isTypeAssertionExpression(node.parent)) {
            return true;
        }
        // 括号表达式内的函数
        if (arkanalyzer_1.ts.isParenthesizedExpression(node.parent)) {
            let current = node.parent;
            // 跟随括号表达式链
            while (current.parent && arkanalyzer_1.ts.isParenthesizedExpression(current.parent)) {
                current = current.parent;
            }
            // 检查最外层括号是否是类型断言的一部分
            return current.parent !== undefined &&
                (arkanalyzer_1.ts.isAsExpression(current.parent) || arkanalyzer_1.ts.isTypeAssertionExpression(current.parent));
        }
        return false;
    }
    /**
     * 添加问题报告。
     */
    addIssue(node, sourceFile, result) {
        let pos = node.getStart(sourceFile);
        // 对于箭头函数，使用箭头的位置
        if (arkanalyzer_1.ts.isArrowFunction(node)) {
            pos = this.getArrowFunctionStartPosition(node, sourceFile);
        }
        // 对于函数声明或表达式，使用function关键字的位置
        else if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node)) {
            pos = this.getFunctionKeywordPosition(node, sourceFile);
        }
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        result.push({
            fileName: sourceFile.fileName,
            line: line + 1,
            character: character + 1,
            description: 'Missing return type on function.',
        });
    }
    isHigherReturnsFunction(node) {
        // 检查函数体
        const body = node.body;
        if (!body) {
            return false;
        }
        let innerFunction;
        // 获取内层函数
        if (arkanalyzer_1.ts.isArrowFunction(node) && !arkanalyzer_1.ts.isBlock(body)) {
            if (arkanalyzer_1.ts.isFunctionExpression(body) || arkanalyzer_1.ts.isArrowFunction(body)) {
                innerFunction = body;
            }
        }
        else if (arkanalyzer_1.ts.isBlock(body) && body.statements.length === 1) {
            const statement = body.statements[0];
            if (arkanalyzer_1.ts.isReturnStatement(statement) && statement.expression &&
                (arkanalyzer_1.ts.isFunctionExpression(statement.expression) || arkanalyzer_1.ts.isArrowFunction(statement.expression))) {
                innerFunction = statement.expression;
            }
        }
        // 如果内层函数没有返回类型，且不是泛型函数，需要报错
        if (innerFunction && !innerFunction.type) {
            // 如果内层函数有泛型参数且设置了allowFunctionsWithoutTypeParameters选项，则不报错
            if (this.options.allowFunctionsWithoutTypeParameters &&
                innerFunction.typeParameters &&
                innerFunction.typeParameters.length > 0) {
                return true;
            }
            // 如果外层函数有函数类型的返回类型，内层函数不需要显式返回类型
            if (node.type) {
                return true;
            }
            return false; // 内层函数没有返回类型，需要报错
        }
        return true; // 内层函数有返回类型或是泛型函数，不需要报错
    }
    /**
     * 检查节点是否是高阶函数（立即返回另一个函数表达式的函数）
     */
    isHigherOrderFunction(node) {
        if (!(arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node))) {
            return false;
        }
        // 如果是高阶函数，那么即使外层函数是泛型函数，内层函数仍然需要检查返回类型
        if (this.returnsFunction(node)) {
            return this.isHigherReturnsFunction(node);
        }
        return false; // 不是高阶函数
    }
    returnsFunction(node) {
        const body = node.body;
        if (!body) {
            return false;
        }
        // 检查函数是否只是返回另一个函数
        if (arkanalyzer_1.ts.isArrowFunction(node) && !arkanalyzer_1.ts.isBlock(body)) {
            return arkanalyzer_1.ts.isFunctionExpression(body) || arkanalyzer_1.ts.isArrowFunction(body);
        }
        // 如果是代码块，检查是否只有一个return语句
        if (arkanalyzer_1.ts.isBlock(body) && body.statements.length === 1) {
            const statement = body.statements[0];
            if (arkanalyzer_1.ts.isReturnStatement(statement) && statement.expression) {
                return arkanalyzer_1.ts.isFunctionExpression(statement.expression) ||
                    arkanalyzer_1.ts.isArrowFunction(statement.expression);
            }
        }
        return false;
    }
    /**
     * 检查函数是否通过bind、call或apply绑定了this
     */
    isThisBindingFunction(node) {
        // 检查父节点是否是调用表达式，且调用的是bind、call或apply方法
        if (node.parent && arkanalyzer_1.ts.isCallExpression(node.parent)) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(node.parent.expression)) {
                const methodName = node.parent.expression.name.text;
                // 检查是否是通过bind、call或apply绑定this
                if (methodName === 'bind' || methodName === 'call' || methodName === 'apply') {
                    // 确保属性访问的左侧是当前函数
                    return node.parent.expression.expression === node;
                }
            }
        }
        return false;
    }
    /**
     * 检查函数表达式是否有类型注解或是否在不需要类型注解的上下文中
     */
    isTypedFunctionExpression(node) {
        // 检查函数是否通过bind、call或apply绑定了this
        if (this.isThisBindingFunction(node)) {
            return true;
        }
        // 检查父节点
        const parent = node.parent;
        if (!parent) {
            return false;
        }
        // 对于变量声明，必须有类型注解
        if (arkanalyzer_1.ts.isVariableDeclaration(parent)) {
            // 只有当变量声明本身有类型注解时才认为函数是有类型的
            return parent.type !== undefined;
        }
        // 检查类型断言表达式
        if (arkanalyzer_1.ts.isAsExpression(parent) || arkanalyzer_1.ts.isTypeAssertionExpression(parent)) {
            return true;
        }
        // 检查属性赋值 - 特别处理作为对象属性的函数
        if (arkanalyzer_1.ts.isPropertyAssignment(parent) || arkanalyzer_1.ts.isPropertyDeclaration(parent)) {
            if (this.checkProperty(parent)) {
                return true;
            }
        }
        // 检查函数参数 - 支持作为函数调用的参数
        if (arkanalyzer_1.ts.isCallExpression(parent) && parent.arguments && parent.arguments.includes(node)) {
            return true;
        }
        // 检查构造函数参数 - 支持作为构造函数的参数
        if (arkanalyzer_1.ts.isNewExpression(parent) && parent.arguments && parent.arguments.includes(node)) {
            return true;
        }
        // 检查变量声明中的初始化表达式是否在类型断言中
        if (arkanalyzer_1.ts.isParenthesizedExpression(parent)) {
            if (this.checkParenthesized(parent)) {
                return true;
            }
        }
        // 检查函数是否直接作为构造函数表达式
        if (parent && arkanalyzer_1.ts.isNewExpression(parent) && parent.expression === node) {
            return true;
        }
        return false;
    }
    checkProperty(parent) {
        // 检查是否是作为对象字面量属性传递给函数调用的情况
        if (arkanalyzer_1.ts.isPropertyAssignment(parent)) {
            let objectLiteral = parent.parent;
            if (objectLiteral && arkanalyzer_1.ts.isObjectLiteralExpression(objectLiteral)) {
                // 检查对象字面量是否作为参数传递给函数
                const objectParent = objectLiteral.parent;
                if (objectParent && arkanalyzer_1.ts.isCallExpression(objectParent)) {
                    return true;
                }
            }
        }
        // 检查对象字面量是否有类型
        let objectLiteral = parent.parent;
        while (objectLiteral) {
            if (arkanalyzer_1.ts.isObjectLiteralExpression(objectLiteral)) {
                const objectParent = objectLiteral.parent;
                if (objectParent && arkanalyzer_1.ts.isVariableDeclaration(objectParent) && objectParent.type) {
                    return true;
                }
                if (objectParent && (arkanalyzer_1.ts.isAsExpression(objectParent) || arkanalyzer_1.ts.isTypeAssertionExpression(objectParent))) {
                    return true;
                }
            }
            objectLiteral = objectLiteral.parent;
        }
        return false;
    }
    checkParenthesized(parent) {
        let current = parent;
        // 跟随括号表达式链
        while (current.parent && arkanalyzer_1.ts.isParenthesizedExpression(current.parent)) {
            current = current.parent;
        }
        // 检查最外层括号是否是类型断言的一部分
        if (current.parent && (arkanalyzer_1.ts.isAsExpression(current.parent) || arkanalyzer_1.ts.isTypeAssertionExpression(current.parent))) {
            return true;
        }
        // 检查最外层括号是否作为函数调用的参数
        if (current.parent && arkanalyzer_1.ts.isCallExpression(current.parent) &&
            current.parent.arguments && current.parent.arguments.includes(current)) {
            return true;
        }
        // 检查最外层括号是否作为构造函数的参数
        if (current.parent && arkanalyzer_1.ts.isNewExpression(current.parent) &&
            current.parent.arguments && current.parent.arguments.includes(current)) {
            return true;
        }
        // 检查最外层括号是否是构造函数表达式本身
        if (current.parent && arkanalyzer_1.ts.isNewExpression(current.parent) &&
            current.parent.expression === current) {
            return true;
        }
        return false;
    }
    /**
     * 检查祖先节点是否有返回类型
     */
    ancestorHasReturnType(node) {
        let ancestor = node.parent;
        // 如果函数在return语句中，查找外层函数的返回类型
        if (ancestor && arkanalyzer_1.ts.isReturnStatement(ancestor)) {
            if (this.ancestorReturnStatement(ancestor)) {
                return true;
            }
        }
        // 检查变量声明
        if (ancestor && arkanalyzer_1.ts.isVariableDeclaration(ancestor)) {
            return ancestor.type !== undefined;
        }
        return false;
    }
    ancestorReturnStatement(ancestor) {
        let functionAncestor = ancestor.parent;
        while (functionAncestor) {
            if (arkanalyzer_1.ts.isBlock(functionAncestor)) {
                functionAncestor = functionAncestor.parent;
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(functionAncestor) ||
                arkanalyzer_1.ts.isFunctionExpression(functionAncestor) ||
                arkanalyzer_1.ts.isArrowFunction(functionAncestor)) {
                // 检查外层函数是否有返回类型
                return functionAncestor.type !== undefined;
            }
            else {
                break;
            }
        }
        return false;
    }
    /**
     * 获取 getter 方法名称的位置
     */
    getGetAccessorNamePosition(node) {
        return node.getStart();
    }
    /**
     * 检查节点是否使用了as const断言
     */
    hasConstAssertion(node) {
        if (!arkanalyzer_1.ts.isArrowFunction(node)) {
            return false;
        }
        const body = node.body;
        // 直接的类型断言
        if (arkanalyzer_1.ts.isAsExpression(body)) {
            const typeNode = body.type;
            if (typeNode && arkanalyzer_1.ts.isTypeReferenceNode(typeNode)) {
                const typeName = typeNode.typeName;
                if (arkanalyzer_1.ts.isIdentifier(typeName) && typeName.text === 'const') {
                    return true;
                }
            }
        }
        return false;
    }
    addIssueReportNode(loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        let defect = new Defects_1.Defects(loc.line, loc.character, loc.character, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.ExplicitFunctionReturnTypeCheck = ExplicitFunctionReturnTypeCheck;
