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
exports.ArrayTypeCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ArrayTypeCheck');
;
;
class ArrayTypeCheck {
    // 在类中添加缓存属性
    nodeCache = new Map();
    typeAliasCache = new Set();
    typeCache = new Map();
    readonlyCache = new Map();
    processedNodes = new WeakSet(); // WeakSet 存储对象的弱引用，不会阻止垃圾回收
    MAX_RECURSION_DEPTH = 10; // 设置最大递归深度
    ARRAY_NAME = 'Array';
    READONLY_ARRAY_NAME = 'ReadonlyArray';
    READONLY_NAME = 'readonly';
    ARRAY_BRACKET = '[]';
    defaultOptions = [{ default: 'array', readonly: 'array' }];
    messageId = 'errorStringArray';
    key = '';
    get messages() {
        return {
            errorStringArray: `Array type using 'Array<${this.key}>' is forbidden. Use '${this.key}[]' instead.`,
            errorStringArraySimple: `Array type using 'Array<${this.key}>' is forbidden for simple types. Use '${this.key}[]' instead.`,
            errorStringArrayNoSimple: `Array type using '${this.key}[]' is forbidden for non-simple types. Use 'Array<${this.key}>' instead.`,
            errorStringGeneric: `Array type using '${this.key}[]' is forbidden. Use 'Array<${this.key}>' instead.`,
            errorStringArrayReadonly: `Array type using 'ReadonlyArray<${this.key}>' is forbidden. Use 'readonly ${this.key}[]' instead.`,
            errorStringArraySimpleReadonly: `Array type using 'ReadonlyArray<${this.key}>' is forbidden for simple types. Use 'readonly ${this.key}[]' instead.`,
            errorStringArrayNoSimpleReadonly: `Array type using 'readonly ${this.key}[]' is forbidden for non-simple types. Use 'ReadonlyArray<${this.key}>' instead. `,
            errorStringGenericReadonly: `Array type using 'readonly ${this.key}[]' is forbidden. Use 'ReadonlyArray<${this.key}>' instead.`,
        };
    }
    ;
    rule;
    defects = [];
    issues = [];
    filePath = '';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/array-type.md',
        description: 'Require consistently using either T[] or Array<T> for arrays.',
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    constructor() {
        this.processedNodes = new WeakSet();
    }
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        // 清理缓存
        let code = target.getCode();
        if (!code) {
            return;
        }
        ;
        this.clearCache();
        this.defaultOptions = this.getDefaultOption();
        this.filePath = target.getFilePath();
        if (this.filePath.endsWith('.ets')) {
            //   如果是ets文件需要将'struct ' 关键字替换为 ' class '在进行检查
            code = code.replace('struct ', ' class ');
        }
        ;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(target.getName(), code);
        this.visitNode(sourceFile, sourceFile, target);
    };
    clearCache() {
        // 清理缓存
        this.typeCache.clear();
        this.readonlyCache.clear();
        this.nodeCache.clear();
        this.typeAliasCache.clear();
    }
    visitNode(node, sourceFile, target) {
        // 提前返回条件
        if (arkanalyzer_1.ts.isToken(node) || arkanalyzer_1.ts.isJSDoc(node) || arkanalyzer_1.ts.isIdentifier(node)) {
            return;
        }
        ;
        // 3. 检查节点的类型注解
        this.checkNodeTypeAnnotation(node, target);
        // 递归检查所有子节点
        arkanalyzer_1.ts.forEachChild(node, child => this.visitNode(child, sourceFile, target));
    }
    checkNodeTypeAnnotation(node, target, depth = 0) {
        if (this.nodeCache.has(node) || depth >= this.MAX_RECURSION_DEPTH) {
            return;
        }
        ;
        this.nodeCache.set(node, true);
        // 处理函数相关节点
        if (this.isFunctionLikeNode(node)) {
            this.checkFunctionLikeNode(node, target);
            return;
        }
        ;
        // 处理方法调用表达式的类型参数
        if (arkanalyzer_1.ts.isCallExpression(node) && node.typeArguments) {
            this.processTypeArguments(node.typeArguments, target, 1);
            return;
        }
        ;
        // 处理类型断言表达式
        if (arkanalyzer_1.ts.isAsExpression(node) || arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
            if (node.type &&
                (arkanalyzer_1.ts.isTypeReferenceNode(node.type) ||
                    arkanalyzer_1.ts.isArrayTypeNode(node.type) ||
                    (arkanalyzer_1.ts.isTypeOperatorNode(node.type) &&
                        node.type.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) ||
                    (arkanalyzer_1.ts.isTupleTypeNode(node.type)))) {
                this.checkProcess(node.type, target);
            }
            ;
        }
        ;
        // 处理变量声明
        if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
            this.checkVariableDeclaration(node, target);
            return;
        }
        ;
        // 处理属性相关节点
        if (this.isPropertyLikeNode(node)) {
            this.checkPropertyLikeNode(node, target);
            return;
        }
        ;
        // 处理类型参数声明
        if (arkanalyzer_1.ts.isTypeParameterDeclaration(node)) {
            this.checkTypeParameterDeclaration(node, target);
            return;
        }
        ;
        // 处理类声明
        if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            this.checkClassDeclaration(node, target);
            return;
        }
        ;
        // 处理类型别名
        if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            if (!this.typeAliasCache.has(node)) {
                this.typeAliasCache.add(node);
                this.checkProcess(node.type, target, depth + 1);
            }
            ;
            return;
        }
        ;
    }
    isFunctionLikeNode(node) {
        return arkanalyzer_1.ts.isFunctionDeclaration(node) ||
            arkanalyzer_1.ts.isMethodDeclaration(node) ||
            arkanalyzer_1.ts.isArrowFunction(node) ||
            arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isFunctionTypeNode(node) ||
            arkanalyzer_1.ts.isMethodSignature(node);
    }
    isPropertyLikeNode(node) {
        return arkanalyzer_1.ts.isPropertySignature(node) ||
            arkanalyzer_1.ts.isPropertyDeclaration(node) ||
            arkanalyzer_1.ts.isParameter(node);
    }
    checkPropertyLikeNode(node, target) {
        const propertyNode = node;
        if (propertyNode.type) {
            this.checkProcess(propertyNode.type, target);
        }
        ;
    }
    checkFunctionLikeNode(node, target) {
        // 检查返回值类型
        if (node.type && (arkanalyzer_1.ts.isTypeReferenceNode(node.type) || arkanalyzer_1.ts.isArrayTypeNode(node.type))) {
            this.checkProcess(node.type, target);
        }
        ;
        // 检查参数类型
        node.parameters.forEach(param => {
            if (param.type && (arkanalyzer_1.ts.isTypeReferenceNode(param.type) || arkanalyzer_1.ts.isArrayTypeNode(param.type))) {
                this.checkProcess(param.type, target);
            }
            ;
        });
        // 检查函数体中的返回语句和类型断言
        if (node.body) {
            this.checkFunctionBody(node.body, target);
        }
        ;
    }
    checkFunctionBody(node, target) {
        // 检查当前节点是否为类型断言
        if (arkanalyzer_1.ts.isAsExpression(node) || arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
            if (node.type &&
                (arkanalyzer_1.ts.isTypeReferenceNode(node.type) || arkanalyzer_1.ts.isArrayTypeNode(node.type) ||
                    (arkanalyzer_1.ts.isTypeOperatorNode(node.type) && node.type.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword))) {
                this.checkProcess(node.type, target);
            }
            ;
        }
        ;
        // 递归检查所有子节点
        arkanalyzer_1.ts.forEachChild(node, child => this.checkFunctionBody(child, target));
    }
    checkVariableDeclaration(node, target) {
        // 检查变量类型
        if (node.type) {
            this.checkProcess(node.type, target);
        }
        ;
        // 检查初始值中的类型断言
        if (node.initializer) {
            if (arkanalyzer_1.ts.isTypeAssertionExpression(node.initializer) || arkanalyzer_1.ts.isAsExpression(node.initializer)) {
                if (node.initializer.type &&
                    (arkanalyzer_1.ts.isTypeReferenceNode(node.initializer.type) || arkanalyzer_1.ts.isArrayTypeNode(node.initializer.type) ||
                        (arkanalyzer_1.ts.isTypeOperatorNode(node.initializer.type) && node.initializer.type.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword))) {
                    this.checkProcess(node.initializer.type, target);
                }
                ;
            }
            ;
            if (arkanalyzer_1.ts.isNewExpression(node.initializer)) {
                const typeArguments = node.initializer.typeArguments;
                if (typeArguments && typeArguments.length > 0) {
                    this.processTypeArguments(typeArguments, target, 1);
                }
                ;
            }
        }
        ;
    }
    checkTypeParameterDeclaration(node, target) {
        if (node.constraint) {
            this.checkTypeParameterConstraint(node.constraint, target);
        }
        ;
        if (node.default && (arkanalyzer_1.ts.isTypeReferenceNode(node.default) || arkanalyzer_1.ts.isArrayTypeNode(node.default))) {
            this.checkProcess(node.default, target);
        }
        ;
    }
    // 检查类型参数约束
    checkTypeParameterConstraint(node, target) {
        // 处理约束类型
        if (arkanalyzer_1.ts.isUnionTypeNode(node)) {
            // 处理联合类型的每个成员
            node.types.forEach(type => {
                if (arkanalyzer_1.ts.isTypeReferenceNode(type) || arkanalyzer_1.ts.isArrayTypeNode(type)) {
                    this.checkProcess(type, target);
                }
                ;
            });
        }
        else if (arkanalyzer_1.ts.isTypeReferenceNode(node) || arkanalyzer_1.ts.isArrayTypeNode(node)) {
            this.checkProcess(node, target);
        }
        ;
    }
    /**
     * 检查类声明
     */
    checkClassDeclaration(node, target) {
        if (!node.heritageClauses) {
            return;
        }
        ;
        for (const clause of node.heritageClauses) {
            for (const type of clause.types) {
                if (type.typeArguments) {
                    this.processTypeArguments(type.typeArguments, target, 1);
                }
                ;
            }
            ;
        }
        ;
    }
    // 添加辅助方法来判断节点是否是数组类型（包括直接数组和被 readonly 修饰的数组）
    isArrayType(node) {
        // 检查节点本身是否是数组类型
        if (arkanalyzer_1.ts.isArrayTypeNode(node)) {
            return true;
        }
        ;
        // 检查节点的类型部分是否最终是数组类型
        if (arkanalyzer_1.ts.isTypeOperatorNode(node)) {
            const type = node.type;
            return arkanalyzer_1.ts.isArrayTypeNode(type) || this.isArrayType(type);
        }
        ;
        return false;
    }
    checkProcess(node, target, depth = 0) {
        if (depth >= this.MAX_RECURSION_DEPTH || this.processedNodes.has(node)) {
            return;
        }
        ;
        // 标记当前节点已处理
        this.processedNodes.add(node);
        switch (node.kind) {
            case arkanalyzer_1.ts.SyntaxKind.ArrayType:
                const arrayType = node;
                this.processArrayType(arrayType, target, depth);
                break;
            case arkanalyzer_1.ts.SyntaxKind.TypeReference:
                const typeRef = node;
                this.checkReferenceType(typeRef, target, depth);
                break;
            case arkanalyzer_1.ts.SyntaxKind.TypeOperator:
                const typeOperator = node;
                if (typeOperator.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
                    this.isTypeOperatorNode(typeOperator, target, depth);
                }
                break;
            case arkanalyzer_1.ts.SyntaxKind.ConditionalType:
                const conditionalType = node;
                this.processConditionalType(conditionalType, target, depth);
                break;
            case arkanalyzer_1.ts.SyntaxKind.UnionType:
                const unionType = node;
                this.typesCheck(unionType.types, target, depth + 1);
                break;
            case arkanalyzer_1.ts.SyntaxKind.TupleType:
                const tupleType = node;
                this.typesCheck(tupleType.elements, target, depth + 1);
                break;
            case arkanalyzer_1.ts.SyntaxKind.IntersectionType:
                const intersectionType = node;
                this.typesCheck(intersectionType.types, target, depth + 1);
                break;
            case arkanalyzer_1.ts.SyntaxKind.InferType:
                const inferType = node;
                if (inferType.typeParameter.constraint) {
                    this.checkProcess(inferType.typeParameter.constraint, target, depth + 1);
                }
                ;
                break;
        }
        ;
    }
    processArrayType(arrayType, target, depth = 0) {
        this.checkArrayTypeNode(arrayType, target);
        // 处理 （string[]）[]中的 （string[]）是 括号表达式的情况
        if (arkanalyzer_1.ts.isParenthesizedTypeNode(arrayType.elementType)) {
            this.specialCheck(arrayType.elementType, target, depth + 1);
        }
        ;
        this.checkProcess(arrayType.elementType, target, depth + 1);
    }
    checkReferenceType(typeRef, target, depth = 0) {
        this.handleTypeReference(typeRef, target, depth);
        if (typeRef.typeArguments) {
            this.processTypeArguments(typeRef.typeArguments, target, depth);
        }
        ;
    }
    processConditionalType(conditionalType, target, depth) {
        this.checkProcess(conditionalType.checkType, target, depth + 1);
        this.checkProcess(conditionalType.extendsType, target, depth + 1);
        this.checkProcess(conditionalType.trueType, target, depth + 1);
        this.checkProcess(conditionalType.falseType, target, depth + 1);
    }
    specialCheck(node, target, depth = 0) {
        if (arkanalyzer_1.ts.isParenthesizedTypeNode(node)) {
            const parenthesizedExpression = node;
            if (arkanalyzer_1.ts.isArrayTypeNode(parenthesizedExpression.type)) {
                this.checkArrayTypeNode(parenthesizedExpression.type, target);
            }
            ;
        }
    }
    typesCheck(types, target, depth) {
        types.forEach(type => {
            this.checkProcess(type, target, depth + 1);
            if (arkanalyzer_1.ts.isRestTypeNode(type)) {
                this.checkProcess(type.type, target, depth + 1);
            }
        });
    }
    isTypeOperatorNode(typeOperator, target, depth) {
        if (typeOperator.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
            const text = typeOperator.getText();
            let innerType = typeOperator.type;
            if (arkanalyzer_1.ts.isArrayTypeNode(innerType)) {
                this.checkArrayTypeNode(innerType, target);
            }
            ;
            if (this.isArrayType(typeOperator)) {
                if (arkanalyzer_1.ts.isArrayTypeNode(innerType)) {
                    innerType = innerType.elementType;
                }
                ;
                if (arkanalyzer_1.ts.isParenthesizedTypeNode(innerType)) {
                    innerType = innerType.type;
                }
                if (arkanalyzer_1.ts.isTypeReferenceNode(innerType) &&
                    arkanalyzer_1.ts.isIdentifier(innerType.typeName) &&
                    innerType.typeName.text === this.READONLY_ARRAY_NAME) {
                    this.checkArrayType(innerType, text, true, target);
                }
                ;
            }
            ;
            if ((this.defaultOptions[0].readonly === 'array' || this.defaultOptions[0].readonly === 'generic') &&
                (arkanalyzer_1.ts.isTypeOperatorNode(innerType) && innerType.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword)) {
                this.checkProcess(innerType, target, depth + 1);
            }
            ;
            if (arkanalyzer_1.ts.isTupleTypeNode(innerType)) {
                this.checkProcess(innerType, target, depth + 1);
            }
            ;
        }
        ;
    }
    handleTypeReference(node, target, depth) {
        // 检查缓存
        if (this.nodeCache.has(node)) {
            return;
        }
        ;
        this.nodeCache.set(node, true);
        // 处理限定名称，如 namespace.Array
        if (arkanalyzer_1.ts.isQualifiedName(node.typeName)) {
            this.checkProcess(node.typeName, target, depth + 1);
            return;
        }
        ;
        // 如果不是标识符，直接返回
        if (!arkanalyzer_1.ts.isIdentifier(node.typeName)) {
            return;
        }
        ;
        // 检查是否是数组相关类型
        const isArrayType = node.typeName.text === this.ARRAY_NAME ||
            node.typeName.text === this.READONLY_ARRAY_NAME;
        // 处理数组类型检查
        if (isArrayType) {
            this.checkTypeReferenceNode(node, target);
        }
        ;
        // 处理类型参数
        this.processTypeArguments(node.typeArguments, target, depth);
    }
    // 新增辅助方法处理类型参数
    processTypeArguments(typeArguments, target, depth) {
        if (!typeArguments) {
            return;
        }
        ;
        typeArguments.forEach(typeArg => {
            if (arkanalyzer_1.ts.isTypeReferenceNode(typeArg) || arkanalyzer_1.ts.isArrayTypeNode(typeArg) ||
                (arkanalyzer_1.ts.isTypeOperatorNode(typeArg) && typeArg.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword)) {
                this.checkProcess(typeArg, target, depth + 1);
            }
            ;
        });
    }
    checkArrayTypeNode(node, target) {
        const elementType = node.elementType;
        const isReadonly = this.hasReadonlyModifier(node);
        const text = node.getText();
        // 根据元素类型是否简单来决定使用哪种数组表示方式
        if (this.isSimpleType(elementType)) {
            // 简单类型：如果选项是 [generic, generic]，应该使用 Array<T> 表示
            if (this.defaultOptions[0].default === 'generic' || this.defaultOptions[0].readonly === 'generic') {
                // 如果使用了 T[]，需要检查
                this.checkGenericArrayType(node, text, isReadonly, target);
            }
            ;
        }
        else {
            // 复杂类型：如果默认选项是 generic 或 array-simple，应该使用 Array<T> 表示
            if (this.defaultOptions[0].default === 'generic' || this.defaultOptions[0].default === 'array-simple' ||
                this.defaultOptions[0].readonly === 'generic' || this.defaultOptions[0].readonly === 'array-simple') {
                // 如果使用了 T[]，需要检查
                this.checkGenericArrayType(node, text, isReadonly, target);
            }
            ;
        }
        ;
        // 如果元素类型是数组类型，递归检查
        if (arkanalyzer_1.ts.isArrayTypeNode(elementType)) {
            this.checkArrayTypeNode(elementType, target);
        }
        ;
    }
    checkTypeReferenceNode(node, target) {
        const isReadonly = this.hasReadonlyModifier(node);
        const text = node.getText();
        if (node.typeArguments && node.typeArguments.length === 1) {
            const elementType = node.typeArguments[0];
            if (this.isSimpleType(elementType)) {
                // 简单类型：如果 选项是 array 或 array-simple，应该使用 T[] 表示
                if (this.defaultOptions[0].default === 'array' || this.defaultOptions[0].default === 'array-simple' ||
                    this.defaultOptions[0].readonly === 'array' || this.defaultOptions[0].readonly === 'array-simple') {
                    // 如果使用了 Array<T>，需要检查
                    this.checkArrayType(node, text, isReadonly, target);
                }
                ;
            }
            else {
                // 复杂类型：如果 选项是 [array, array]，应该使用 Array<T> 表示
                if (this.defaultOptions[0].default === 'array' || this.defaultOptions[0].readonly === 'array') {
                    // 如果使用了 Array<T>，需要检查
                    this.checkArrayType(node, text, isReadonly, target);
                }
                ;
            }
            ;
        }
        else {
            if (this.defaultOptions[0].default === 'array' || this.defaultOptions[0].readonly === 'array') {
                this.addIssueReport(node, text, isReadonly, target, 'any');
            }
            ;
        }
        ;
    }
    // 检查节点是否有 readonly 修饰符
    hasReadonlyModifier(node) {
        if (this.readonlyCache.has(node)) {
            return this.readonlyCache.get(node);
        }
        let result = this.checkReadonlyNode(node);
        if (!result && node.parent) {
            if (arkanalyzer_1.ts.isArrayTypeNode(node.parent) ||
                arkanalyzer_1.ts.isTypeOperatorNode(node.parent) ||
                (arkanalyzer_1.ts.isTypeReferenceNode(node.parent) &&
                    arkanalyzer_1.ts.isIdentifier(node.parent.typeName) &&
                    node.parent.typeName.text === this.READONLY_ARRAY_NAME &&
                    this.defaultOptions[0].readonly !== 'generic')) {
                result = this.checkReadonlyNode(node.parent);
            }
        }
        this.readonlyCache.set(node, result);
        return result;
    }
    checkReadonlyNode(node) {
        if (arkanalyzer_1.ts.isTypeOperatorNode(node) && node.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
            return true;
        }
        else if (arkanalyzer_1.ts.isTypeReferenceNode(node) &&
            arkanalyzer_1.ts.isIdentifier(node.typeName) &&
            node.typeName.text === this.READONLY_ARRAY_NAME) {
            return true;
        }
        else if (arkanalyzer_1.ts.canHaveModifiers(node)) {
            const modifiers = arkanalyzer_1.ts.getModifiers(node);
            if (modifiers) {
                return modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword);
            }
        }
        return false;
    }
    isSimpleType(node) {
        if (this.typeCache.has(node)) {
            return this.typeCache.get(node);
        }
        ;
        const result = this.calculateSimpleType(node);
        this.typeCache.set(node, result);
        return result;
    }
    calculateSimpleType(node) {
        if (arkanalyzer_1.ts.isParenthesizedTypeNode(node)) {
            return this.isSimpleType(node.type);
        }
        ;
        if (arkanalyzer_1.ts.isIdentifier(node) || arkanalyzer_1.ts.isThisTypeNode(node) || arkanalyzer_1.ts.isQualifiedName(node)) {
            return true;
        }
        ;
        if (this.isBasicType(node.kind)) {
            return true;
        }
        ;
        return this.handleComplexTypes(node);
    }
    isBasicType(kind) {
        const basicTypes = new Set([
            arkanalyzer_1.ts.SyntaxKind.AnyKeyword,
            arkanalyzer_1.ts.SyntaxKind.NumberKeyword,
            arkanalyzer_1.ts.SyntaxKind.StringKeyword,
            arkanalyzer_1.ts.SyntaxKind.BooleanKeyword,
            arkanalyzer_1.ts.SyntaxKind.VoidKeyword,
            arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword,
            arkanalyzer_1.ts.SyntaxKind.NullKeyword,
            arkanalyzer_1.ts.SyntaxKind.NeverKeyword,
            arkanalyzer_1.ts.SyntaxKind.ObjectKeyword,
            arkanalyzer_1.ts.SyntaxKind.SymbolKeyword,
            arkanalyzer_1.ts.SyntaxKind.BigIntKeyword,
            arkanalyzer_1.ts.SyntaxKind.UnknownKeyword
        ]);
        return basicTypes.has(kind);
    }
    // 处理复杂类型
    handleComplexTypes(node) {
        if (arkanalyzer_1.ts.isArrayTypeNode(node)) {
            return this.isSimpleType(node.elementType);
        }
        ;
        if (arkanalyzer_1.ts.isTypeReferenceNode(node)) {
            return this.handleTypeReferenceSimpleType(node);
        }
        ;
        return false;
    }
    // 处理类型引用
    handleTypeReferenceSimpleType(node) {
        if (arkanalyzer_1.ts.isIdentifier(node.typeName) && node.typeName.text === this.ARRAY_NAME) {
            return !node.typeArguments ||
                node.typeArguments.length === 0 ||
                (node.typeArguments.length === 1 && this.isSimpleType(node.typeArguments[0]));
        }
        ;
        return !node.typeArguments && this.isSimpleType(node.typeName);
    }
    getDefaultOption() {
        let option;
        if (this.rule && this.rule.option[0]) {
            option = this.rule.option;
            if (!option[0].default) {
                option[0].default = 'array';
            }
            ;
            if (!option[0].readonly) {
                option[0].readonly = 'array';
            }
            ;
            return option;
        }
        ;
        return [{ default: 'array', readonly: 'array' }];
    }
    checkArrayType(node, text, isReadonly, target) {
        // 获取当前应该使用的数组语法选项
        const option = isReadonly
            ? this.defaultOptions[0].readonly
            : this.defaultOptions[0].default;
        // 处理 Array<T> 或 ReadonlyArray<T> 的情况
        if (arkanalyzer_1.ts.isIdentifier(node.typeName)) {
            const isArrayType = node.typeName.text === this.ARRAY_NAME;
            const isReadonlyArrayType = node.typeName.text === this.READONLY_ARRAY_NAME;
            if ((isArrayType || isReadonlyArrayType) && node.typeArguments?.length === 1) {
                const elementType = node.typeArguments[0];
                const isSimpleElementType = this.isSimpleType(elementType);
                // 根据配置选项和元素类型检查是否需要报告问题
                if (option === 'array' ||
                    (option === 'array-simple' && isSimpleElementType)) {
                    // 应该使用 T[] 或 readonly T[] 语法
                    this.messageId = this.getMessageId(isReadonlyArrayType, option, isSimpleElementType);
                    this.addIssueReport(node, text, isReadonly, target, elementType);
                }
                ;
            }
            ;
        }
        ;
    }
    // 根据节点类型获取元素类型
    getElementType(node) {
        if (arkanalyzer_1.ts.isArrayTypeNode(node)) {
            return node.elementType;
        }
        else if (arkanalyzer_1.ts.isTypeOperatorNode(node) && node.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
            if (arkanalyzer_1.ts.isArrayTypeNode(node.type)) {
                return node.type.elementType;
            }
            else {
                // 处理其他可能的情况，如 readonly (T)
                return node.type;
            }
            ;
        }
        ;
        return undefined;
    }
    checkGenericArrayType(node, text, isReadonly, target) {
        // 获取当前应该使用的数组语法选项
        const option = isReadonly ? this.defaultOptions[0].readonly : this.defaultOptions[0].default;
        // 获取元素类型
        const elementType = this.getElementType(node);
        if (!elementType) {
            return;
        }
        ;
        const isSimpleElementType = this.isSimpleType(elementType);
        // 根据配置选项和元素类型检查是否需要报告问题
        if ((option === 'generic') ||
            (option === 'array-simple' && !isSimpleElementType)) {
            // 应该使用 Array<T> 或 ReadonlyArray<T> 语法// 应该使用 T[] 或 readonly T[] 语法
            this.messageId = this.getMessageId(isReadonly, option, isSimpleElementType);
            this.addIssueReport(node, text, isReadonly, target, elementType);
        }
        ;
    }
    // 创建issue的key
    createIssueKey(line, colStart, colEnd) {
        return `${line}%${colStart}%${colEnd}%${this.rule.ruleId}`;
    }
    // 检查是否存在相同的告警
    isDuplicateIssue(line, colStart, colEnd, description) {
        // 检查是否存在相同的 readonly 数组类型告警
        const readonlyKey1 = this.createIssueKey(line, colStart - this.READONLY_NAME.length - 1, colEnd);
        const readonlyKey2 = this.createIssueKey(line, colStart - this.READONLY_NAME.length - 2, colEnd + '[]'.length + 1);
        const readonlyIssue1 = this.issues.find(issue => issue.defect.fixKey === readonlyKey1);
        const readonlyIssue2 = this.issues.find(issue => issue.defect.fixKey === readonlyKey2);
        // 检查是否存在相同的普通数组类型告警
        const arrayKey = this.createIssueKey(line, colStart, colEnd - this.ARRAY_BRACKET.length);
        const arrayIssue = this.issues.find(issue => issue.defect.fixKey === arrayKey);
        // 如果存在相同描述的告警，则认为是重复的
        return (readonlyIssue1?.defect.description === description) ||
            (readonlyIssue2?.defect.description === description) ||
            (arrayIssue?.defect.description === description);
    }
    addIssueReport(node, text, isReadonly, target, elementType) {
        // 获取源文件
        const sourceFile = node.getSourceFile();
        if (!sourceFile) {
            return;
        }
        ;
        // 处理类型和描述信息
        this.prepareTypeInfo(elementType, text);
        // 获取位置信息
        const position = this.calculatePosition(node, text, isReadonly, target, sourceFile);
        if (!position) {
            return;
        }
        ;
        // 检查是否存在重复告警
        if (this.isDuplicateIssue(position.actualLine, position.actualColStart, position.actualColEnd, this.metaData.description)) {
            return;
        }
        ;
        // 创建并存储告警信息
        this.createAndStoreIssue(position, target, node, elementType);
    }
    // 准备类型信息
    prepareTypeInfo(elementType, text) {
        this.key = typeof elementType === 'string' ? elementType : this.getMessageType(elementType, text);
        this.metaData.description = this.messages[this.messageId];
    }
    // 计算实际位置
    calculatePosition(node, text, isReadonly, target, sourceFile) {
        // 获取AST位置信息
        let startAST = node.getStart(sourceFile);
        let endAST = node.getEnd();
        let { line: lineAST, character: startColAST } = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, startAST);
        // 计算实际位置
        let actualLine = lineAST + 1;
        let colStart = startColAST + 1;
        let actualColStart = text.startsWith('(') && isReadonly ? colStart + 1 : colStart;
        // 计算结束位置
        const i = text.indexOf(')');
        let actualColEnd = text.startsWith('(') && isReadonly ? i + colStart : text.length + colStart;
        const parentText = node.parent?.getText();
        if (this.defaultOptions[0].readonly === 'generic' && isReadonly && parentText.startsWith('readonly')) {
            startAST = node.parent.getStart(sourceFile);
            endAST = node.parent.getEnd();
            let { line: lineAST, character: startColAST } = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, startAST);
            actualColStart = startColAST + 1;
            actualColEnd = actualColStart + parentText.length;
        }
        return { actualLine, actualColStart, actualColEnd, startAST, endAST };
    }
    // 创建并存储issue
    createAndStoreIssue(position, target, node, elementType) {
        const severity = this.rule.alert ?? this.metaData.severity;
        // 创建缺陷报告
        const defect = new Defects_1.Defects(position.actualLine, position.actualColStart, position.actualColEnd, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, true);
        // 获取fix并存储issue
        const fix = this.createFix(target, node, elementType, position.startAST, position.endAST);
        DefectsList_1.RuleListUtil.push(defect);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
    }
    // 创建fix
    createFix(target, node, elementType, startAST, endAST) {
        // 获取数组类型配置
        const isReadonly = this.hasReadonlyModifier(node);
        const option = isReadonly ? this.defaultOptions[0].readonly : this.defaultOptions[0].default;
        // 处理类型文本
        const typeText = this.processTypeText(elementType);
        const isSimpleType = this.checkIsSimpleType(elementType, node);
        // 生成替换文本
        const replaceText = this.generateReplaceText(option ?? 'array', isReadonly, typeText, isSimpleType, node);
        return { range: [startAST, endAST], text: replaceText };
    }
    // 处理类型文本
    processTypeText(elementType) {
        const text = typeof elementType === 'string'
            ? elementType
            : String(elementType.getText());
        return this.removeUnnecessaryParentheses(text);
    }
    // 检查是否为简单类型
    checkIsSimpleType(elementType, node) {
        return typeof elementType === 'string' ? this.isSimpleType(node) : this.isSimpleType(elementType);
    }
    // 生成替换文本
    generateReplaceText(option, isReadonly, typeText, isSimpleType, node) {
        switch (option) {
            case 'array-simple':
                return this.generateArraySimpleText(isReadonly, typeText, isSimpleType);
            case 'generic':
                return this.generateGenericText(isReadonly, typeText);
            default: // array option
                return this.generateArrayText(isReadonly, typeText, node);
        }
    }
    // 生成简单类型文本
    generateArraySimpleText(isReadonly, typeText, isSimpleType) {
        if (isSimpleType) {
            return isReadonly ? `readonly ${typeText}[]` : `${typeText}[]`;
        }
        ;
        const convertedType = this.convertComplexArrayType(typeText);
        return isReadonly ? `ReadonlyArray<${convertedType}>` : `Array<${convertedType}>`;
    }
    // 生成泛型类型文本
    generateGenericText(isReadonly, typeText) {
        return isReadonly ? `ReadonlyArray<${typeText}>` : `Array<${typeText}>`;
    }
    // 生成数组类型文本
    generateArrayText(isReadonly, typeText, node) {
        const needsParentheses = isReadonly
            ? this.needsParenthesesForReadonly(typeText)
            : this.needsParenthesesForArrayType(typeText);
        let wrappedType = needsParentheses ? `(${typeText})` : typeText;
        const text = node.getText();
        const parentText = node.parent.getText();
        if (text.includes('ReadonlyArray<') && text + '[]' === parentText) {
            // 生成内部的 readonly array
            return `(readonly ${typeText}[])`;
        }
        ;
        return isReadonly ? `readonly ${wrappedType}[]` : `${wrappedType}[]`;
    }
    // 判断数组类型是否需要括号
    needsParenthesesForArrayType(typeText) {
        return (typeText.includes('=>') && !typeText.startsWith('{')) ||
            (typeText.includes('|') && !typeText.startsWith('{')) ||
            (typeText.includes('&') && !typeText.startsWith('{')) ||
            typeText.startsWith('infer ');
    }
    // 判断类型是否需要在 readonly 修饰时添加括号
    needsParenthesesForReadonly(typeText) {
        // 以下情况需要添加括号：
        return typeText.includes('Array<') ||
            typeText.includes('ReadonlyArray<') ||
            typeText.includes('=>') ||
            typeText.includes('|') ||
            typeText.includes('&') ||
            typeText.startsWith('infer ') ||
            (typeText.includes('<') && typeText.includes('>')) ||
            typeText.includes(this.READONLY_NAME);
    }
    removeUnnecessaryParentheses(typeText) {
        // 如果文本被括号包围，检查是否需要这些括号
        if (typeText.startsWith('(') && typeText.endsWith(')')) {
            const inner = typeText.slice(1, -1);
            // 检查是否包含需要保留括号的操作符
            const needsParentheses = inner.includes('=>') && !inner.startsWith('(');
            if (!needsParentheses) {
                // 递归处理，以防有多层括号
                return this.removeUnnecessaryParentheses(inner);
            }
            ;
        }
        ;
        // 处理 readonly 类型
        if (typeText.includes(this.READONLY_NAME)) {
            return typeText
                .replace(/\(readonly\s+([^()]+)\)/g, 'readonly $1')
                .replace(/\(?(readonly\s+[^()]+)\)?/g, '$1');
        }
        ;
        return typeText;
    }
    // 将复杂类型转换为 Array<T> 形式
    convertComplexArrayType(typeText) {
        // 移除不必要的外层括号
        if (typeText.startsWith('(') && typeText.endsWith(')')) {
            // 检查是否真的需要保留括号
            const inner = typeText.slice(1, -1);
            let text = this.getInnerTypeText(inner);
            if (text) {
                return text;
            }
            ;
        }
        // 处理元组类型
        else if (typeText.startsWith('[') && typeText.endsWith(']')) {
            return typeText;
        }
        ;
        return typeText;
    }
    getInnerTypeText(inner) {
        let typeText = '';
        // 函数类型只有在作为箭头函数参数时需要括号
        if (inner.includes('=>')) {
            const arrowParts = inner.split('=>');
            if (arrowParts.length === 2) {
                // 如果参数部分已经有括号，或者是单个参数，不需要额外的括号
                if (arrowParts[0].trim().startsWith('(')) {
                    typeText = inner;
                }
                ;
            }
            ;
        }
        else if (inner.includes('|') || inner.includes('&')) {
            // 联合类型和交叉类型不需要括号
            typeText = inner;
        }
        else if (inner.startsWith('infer ')) {
            // infer 类型参数
            typeText = inner;
        }
        ;
        return typeText;
    }
    // 如果 node 是简单类型，则返回其文本内容, 否则返回 T
    getMessageType(node, text) {
        if (this.typeCache.has(node)) {
            return this.typeCache.get(node) ? node.getText() : 'T';
        }
        ;
        let result;
        try {
            if (arkanalyzer_1.ts.isParenthesizedTypeNode(node)) {
                result = this.getMessageType(node.type, text);
            }
            else if (arkanalyzer_1.ts.isTypeOperatorNode(node) &&
                node.operator === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
                const innerType = node.type;
                if (text !== innerType.parent.parent.getText() + '[]') {
                    result = 'T';
                }
                else if (this.isSimpleType(innerType) && arkanalyzer_1.ts.isArrayTypeNode(innerType)) {
                    result = innerType.elementType.getText();
                }
                else {
                    result = 'T';
                }
                ;
            }
            else if (this.isSimpleType(node)) {
                result = node.getText();
            }
            else {
                result = 'T';
            }
            ;
        }
        catch (error) {
            result = 'T';
        }
        ;
        this.typeCache.set(node, result === 'T' ? false : true);
        return result;
    }
    // 获取不同模式的id
    getMessageId(isReadonly, option, isSimple) {
        if (isReadonly) {
            if (option === 'array') {
                if (this.defaultOptions[0].readonly === 'array') {
                    return 'errorStringArrayReadonly';
                }
                ;
            }
            else if (option === 'array-simple') {
                if (this.defaultOptions[0].readonly === 'array-simple' && isSimple) {
                    return 'errorStringArraySimpleReadonly';
                }
                ;
                return 'errorStringArrayNoSimpleReadonly';
            }
            else {
                return 'errorStringGenericReadonly';
            }
            ;
        }
        else {
            if (option === 'array') {
                if (this.defaultOptions[0].default === 'array') {
                    return 'errorStringArray';
                }
                ;
            }
            else if (option === 'array-simple') {
                if (this.defaultOptions[0].default === 'array-simple' && isSimple) {
                    return 'errorStringArraySimple';
                }
                ;
                return 'errorStringArrayNoSimple';
            }
            else {
                return 'errorStringGeneric';
            }
            ;
        }
        ;
        return 'errorStringGeneric';
    }
}
exports.ArrayTypeCheck = ArrayTypeCheck;
