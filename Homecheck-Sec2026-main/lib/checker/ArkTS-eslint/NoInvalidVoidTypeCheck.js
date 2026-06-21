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
exports.NoInvalidVoidTypeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const TypeExpr_1 = require("arkanalyzer/lib/core/base/TypeExpr");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoInvalidVoidTypeCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-invalid-void-type.md',
    description: 'Disallow `void` type outside of generic or return types',
    messages: {
        invalidVoidForGeneric: '{{ generic }} may not have void as a type argument.',
        invalidVoidNotReturn: 'void is only valid as a return type.',
        invalidVoidNotReturnOrGeneric: 'void is only valid as a return type or generic type argument.',
        invalidVoidNotReturnOrThisParam: 'void is only valid as return type or type of `this` parameter.',
        invalidVoidNotReturnOrThisParamOrGeneric: 'void is only valid as a return type or generic type argument or the type of a `this` parameter.',
        invalidVoidUnionConstituent: 'void is not valid as a constituent in a union type',
    },
    defaultOptions: { allowInGenericTypeArguments: true, allowAsThisParameter: false }
};
var CheckType;
(function (CheckType) {
    CheckType[CheckType["ReturnType"] = 0] = "ReturnType";
    CheckType[CheckType["GenericTypeArgument"] = 1] = "GenericTypeArgument";
    CheckType[CheckType["ThisParameter"] = 2] = "ThisParameter";
    CheckType[CheckType["leftOp"] = 3] = "leftOp";
    CheckType[CheckType["rightOp"] = 4] = "rightOp";
    CheckType[CheckType["DefaultCase"] = 5] = "DefaultCase";
    CheckType[CheckType["NewExpr"] = 6] = "NewExpr";
    CheckType[CheckType["Constraint"] = 7] = "Constraint";
    CheckType[CheckType["UnionType"] = 8] = "UnionType";
})(CheckType || (CheckType = {}));
class NoInvalidVoidTypeCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    globleStmt;
    globleArkFile;
    line = 0;
    column = 0;
    useMethods = [];
    useCls = [];
    registerMatchers() {
        const fileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileCb];
    }
    getOption() {
        let option = this.metaData.defaultOptions;
        if (this.rule && this.rule.option[0]) {
            option = this.rule.option[0];
        }
        return option;
    }
    /**
     * 在AST中查找类型节点的位置
     */
    typeCheck(node, astTree, position) {
        if (node.kind === lib_1.ts.SyntaxKind.VoidKeyword) {
            let { line, character } = astTree.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
            position.line = line;
            position.column = character;
        }
        this.checkTypeNode(node, astTree, position);
    }
    /**
     * 检查各种类型节点
     */
    checkTypeNode(node, astTree, position) {
        if (lib_1.ts.isParenthesizedTypeNode(node)) {
            this.typeCheck(node.type, astTree, position);
        }
        if (lib_1.ts.isMappedTypeNode(node) && node.type) {
            this.typeCheck(node.type, astTree, position);
        }
        if (lib_1.ts.isUnionTypeNode(node)) {
            node.types.forEach(ty => {
                this.typeCheck(ty, astTree, position);
            });
        }
        if (lib_1.ts.isIntersectionTypeNode(node)) {
            node.types.forEach(ty => {
                this.typeCheck(ty, astTree, position);
            });
        }
        if (lib_1.ts.isTypeLiteralNode(node)) {
            node.members.forEach(property => {
                if (lib_1.ts.isPropertySignature(property) && property.type) {
                    this.typeCheck(property.type, astTree, position);
                }
            });
        }
        if (lib_1.ts.isFunctionTypeNode(node) && lib_1.ts.isTypeAliasDeclaration(astTree)) {
            this.typeCheck(node.type, astTree, position);
        }
        if (lib_1.ts.isArrayTypeNode(node)) {
            this.typeCheck(node.elementType, astTree, position);
        }
        if (lib_1.ts.isConditionalTypeNode(node)) {
            this.typeCheck(node.checkType, astTree, position);
            this.typeCheck(node.extendsType, astTree, position);
            this.typeCheck(node.trueType, astTree, position);
            this.typeCheck(node.falseType, astTree, position);
        }
        if (lib_1.ts.isTypeOperatorNode(node)) {
            this.typeCheck(node.type, astTree, position);
        }
        if (lib_1.ts.isTypeReferenceNode(node) && node.typeArguments) {
            node.typeArguments.forEach(argument => {
                this.typeCheck(argument, astTree, position);
            });
        }
        if ((lib_1.ts.isPropertyDeclaration(node) || lib_1.ts.isPropertySignature(node)) && node.type) {
            this.typeCheck(node.type, astTree, position);
        }
    }
    /**
     * 获取AST节点位置
     */
    getASTNodePosition(code, type) {
        let position = { line: 0, column: 0 };
        let astTree = lib_1.AstTreeUtils.getASTNode('temp', code);
        let rootNode = astTree.statements[0];
        this.traverseNode(astTree, type, position, rootNode);
        return position;
    }
    checkTypeParameter(node, type, position, astTree) {
        if (type === CheckType.Constraint && node.constraint) {
            this.typeCheck(node.constraint, astTree, position);
            return true;
        }
        if (type === CheckType.DefaultCase && node.default) {
            this.typeCheck(node.default, astTree, position);
            return true;
        }
        return false;
    }
    checkFunctionLike(node, type, position, astTree) {
        if (type === CheckType.ReturnType && node.type) {
            this.typeCheck(node.type, astTree, position);
            return true;
        }
        if (type === CheckType.ThisParameter && node.parameters.length > 0) {
            node.parameters.forEach((param) => {
                if (param.type) {
                    this.typeCheck(param.type, astTree, position);
                }
            });
            return true;
        }
        return false;
    }
    checkVariableDeclaration(node, type, position, astTree) {
        if (node.type && type === CheckType.leftOp) {
            this.typeCheck(node.type, astTree, position);
            return true; // 停止遍历
        }
        if (node.initializer && lib_1.ts.isNewExpression(node.initializer) &&
            node.initializer.typeArguments && type === CheckType.rightOp) {
            node.initializer.typeArguments.forEach(argument => {
                this.typeCheck(argument, astTree, position);
            });
            return true; // 停止遍历
        }
        return false;
    }
    /**
     * 遍历AST节点
     */
    traverseNode(node, type, position, astTree) {
        let hasFound = false;
        // 检查函数声明类型节点
        if (this.isFunctionLikeNode(node)) {
            hasFound = this.checkFunctionLike(node, type, position, astTree);
        }
        // 检查类型参数声明
        if (lib_1.ts.isTypeParameterDeclaration(node)) {
            hasFound = this.checkTypeParameter(node, type, position, astTree) || hasFound;
        }
        // 检查映射类型节点
        if (lib_1.ts.isMappedTypeNode(node) && node.type) {
            this.typeCheck(node.type, astTree, position);
            hasFound = true;
        }
        // 检查void表达式
        if (type === CheckType.ThisParameter && node.kind === lib_1.ts.SyntaxKind.VoidExpression) {
            let { line, character } = astTree.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
            position.line = line;
            position.column = character;
            hasFound = true;
        }
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            this.typeCheck(node.type, astTree, position);
            hasFound = true;
        }
        // 检查调用表达式的类型参数
        if (lib_1.ts.isCallExpression(node)) {
            for (const typeArgument of node.typeArguments ?? []) {
                this.typeCheck(typeArgument, astTree, position);
                hasFound = true;
            }
        }
        // 检查变量声明
        if (lib_1.ts.isVariableDeclaration(node)) {
            hasFound = this.checkVariableDeclaration(node, type, position, astTree) || hasFound;
        }
        // 检查类型节点
        if (lib_1.ts.isTypeNode(node)) {
            this.typeCheck(node, astTree, position);
        }
        if (hasFound) {
            return true;
        }
        // 继续遍历子节点
        return node.forEachChild(childNode => {
            if (this.traverseNode(childNode, type, position, astTree)) {
                return true; // 停止遍历
            }
            return false;
        }) || false;
    }
    /**
     * 判断是否为函数相关节点
     */
    isFunctionLikeNode(node) {
        return (lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isArrowFunction(node) ||
            lib_1.ts.isMethodDeclaration(node) ||
            lib_1.ts.isFunctionTypeNode(node) ||
            lib_1.ts.isFunctionLike(node));
    }
    /**
     * 添加错误报告
     */
    report(line, colum, messageId, errorPositions, generic) {
        errorPositions.push({
            line: line,
            colum: colum,
            message: messageId,
            sourceCode: 'void',
            generic
        });
    }
    /**
     * 检查泛型类型参数
     */
    checkGenericTypeArgument(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter, genericName) {
        let invalidType = [lib_1.ClassType, lib_1.AliasType, lib_1.UnclearReferenceType, lib_1.ArrayType];
        if (!(invalidType.some(inType => type instanceof inType) || type instanceof lib_1.GenericType)) {
            return;
        }
        if (Array.isArray(allowInGenericTypeArguments)) {
            if (!genericName) {
                return;
            }
            genericName = genericName?.replace(/ /g, '');
            if (!allowInGenericTypeArguments.map(s => s.replace(/ /g, '')).includes(genericName)) {
                let position = this.getASTNodePosition(originalText, checkType);
                if (position.column > 0) {
                    this.report(position.line + this.line, position.column + this.column, 'invalidVoidForGeneric', errorPositions, genericName);
                }
            }
            return;
        }
        if (!allowInGenericTypeArguments) {
            let position = this.getASTNodePosition(originalText, checkType);
            if (position.column > 0) {
                this.report(position.line + this.line, position.column + this.column, allowAsThisParameter ? 'invalidVoidNotReturnOrThisParam' : 'invalidVoidNotReturn', errorPositions);
            }
        }
    }
    /**
     * 检查联合类型是否有效
     */
    isValidUnionType(type) {
        return type.getTypes().every(member => {
            let types;
            if (member instanceof lib_1.AliasType) {
                types = member.getRealGenericTypes();
            }
            if (member instanceof lib_1.ClassType) {
                types = member.getRealGenericTypes();
                if (!types) {
                    let arkCls = this.globleArkFile.getClassWithName(member.getClassSignature().getClassName().toString());
                }
            }
            if (member instanceof lib_1.UnclearReferenceType) {
                types = member.getGenericTypes();
            }
            return ['void', 'never'].includes(member.getTypeString()) ||
                (types && types.some(type => type.getTypeString() === 'void'));
        });
    }
    /**
     * 获取消息ID
     */
    getNotReturnOrGenericMessageId(type) {
        return type instanceof lib_1.UnionType ?
            'invalidVoidUnionConstituent' : 'invalidVoidNotReturnOrGeneric';
    }
    /**
     * 处理类和别名类型
     */
    handleClassOrAliasType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        let genericName = '';
        let types;
        if (type instanceof lib_1.ClassType) {
            genericName = type.getClassSignature().getClassName().toString();
            types = type.getRealGenericTypes();
        }
        else if (type instanceof lib_1.AliasType) {
            genericName = type.getName();
            types = type.getRealGenericTypes();
        }
        else if (type instanceof lib_1.UnclearReferenceType) {
            genericName = type.getName();
            types = type.getGenericTypes();
        }
        if (checkType === CheckType.NewExpr) {
            if (allowInGenericTypeArguments === true) {
                return;
            }
            types?.forEach(subType => {
                this.checkVoidType(subType, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            });
            return;
        }
        if (types?.some(ty => ty instanceof lib_1.VoidType)) {
            this.checkGenericTypeArgument(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter, genericName);
        }
    }
    /**
     * 处理数组类型
     */
    handleArrayType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        if (type.getBaseType() instanceof lib_1.VoidType) {
            if (/Array<.*?>/.test(originalText)) {
                this.checkGenericTypeArgument(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter, 'Array');
            }
            else {
                this.checkVoidType(type.getBaseType(), originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
        }
    }
    /**
     * 处理联合类型
     */
    handleUnionType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        let isValid = this.isValidUnionType(type);
        if (isValid) {
            for (const ty of type.getTypes()) {
                if (!(ty instanceof lib_1.VoidType)) {
                    this.checkVoidType(ty, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
                }
            }
        }
        return isValid;
    }
    /**
     * 处理Void或Unknown类型
     */
    handleVoidOrUnknownType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        let position;
        if (type instanceof lib_1.UnknownType) {
            position = this.getASTNodePosition(originalText, checkType);
            if (position.column === 0) {
                return;
            }
        }
        if (type instanceof lib_1.VoidType || type instanceof lib_1.UnionType || type instanceof lib_1.IntersectionType || position) {
            if (!position) {
                position = this.getASTNodePosition(originalText, checkType);
            }
            let messageId = allowInGenericTypeArguments && allowAsThisParameter ?
                'invalidVoidNotReturnOrThisParamOrGeneric' : allowInGenericTypeArguments ?
                this.getNotReturnOrGenericMessageId(type) : allowAsThisParameter ?
                'invalidVoidNotReturnOrThisParam' : 'invalidVoidNotReturn';
            if (position.column > 0) {
                this.report(position.line + this.line, position.column + this.column, messageId, errorPositions);
            }
        }
    }
    /**
     * 检查Void类型
     */
    checkVoidType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        // 处理类类型、别名类型或不明确引用类型
        if (type instanceof lib_1.ClassType || type instanceof lib_1.AliasType || type instanceof lib_1.UnclearReferenceType) {
            this.handleClassOrAliasType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            return;
        }
        // 处理keyof类型表达式
        if (type instanceof TypeExpr_1.KeyofTypeExpr) {
            this.checkVoidType(type.getOpType(), originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        // 处理函数类型
        if (type instanceof lib_1.FunctionType) {
            let methodName = type.getMethodSignature().getMethodSubSignature().getMethodName();
            let arkCls = this.globleStmt.getCfg()?.getDeclaringMethod()?.getDeclaringArkClass();
            let method = arkCls?.getMethodWithName(methodName)?.getSignature().getMethodSubSignature();
            method?.getParameters().forEach(parameter => {
                this.checkVoidType(parameter.getType(), originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            });
            if (method?.getReturnType() instanceof lib_1.VoidType) {
                return;
            }
            if (method?.getReturnType().getTypeString().includes('void')) {
                this.checkVoidType(method.getReturnType(), originalText, CheckType.ReturnType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
        }
        // 处理泛型类型
        if (type instanceof lib_1.GenericType) {
            const defaultType = type.getDefaultType();
            const constraint = type.getConstraint();
            if (defaultType) {
                this.checkGenericTypeArgument(type, originalText, CheckType.DefaultCase, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
            if (constraint) {
                this.checkVoidType(constraint, originalText, CheckType.Constraint, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
        }
        // 处理数组类型
        if (type instanceof lib_1.ArrayType) {
            this.handleArrayType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        // 处理联合类型
        if (type instanceof lib_1.UnionType) {
            if (this.handleUnionType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter)) {
                return;
            }
        }
        // 处理void类型或unknown类型
        this.handleVoidOrUnknownType(type, originalText, checkType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
    }
    /**
     * 分析类中的方法
     */
    analyzeMethod(method, useMethods, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        const statements = method.getBody()?.getCfg().getStmts();
        if (statements) {
            statements.forEach((stmt) => {
                this.analyzeStatement(stmt, useMethods, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            });
        }
        this.line = method.getLine() ?? method.getDeclareLines()?.at(0);
        this.column = method.getColumn() ?? method.getDeclareColumns()?.at(0);
        let methodCode = method.getCode();
        if (!this.line || !this.column || !methodCode) {
            return;
        }
        this.analyzeMethodParameters(method, methodCode, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
    }
    /**
     * 分析方法参数
     */
    analyzeMethodParameters(method, methodCode, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        for (const parameter of method.getParameters()) {
            if (allowAsThisParameter &&
                parameter.getType().getTypeString() === 'void' &&
                parameter.getName() === 'this') {
                continue;
            }
            if (parameter.getType().getTypeString().includes('void')) {
                this.checkVoidType(parameter.getType(), methodCode, CheckType.ThisParameter, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
        }
        const genericTypes = method.getGenericTypes();
        if (genericTypes) {
            genericTypes.forEach((genericType) => {
                this.checkVoidType(genericType, methodCode, CheckType.GenericTypeArgument, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            });
        }
        if (method.getReturnType().getTypeString().includes('void')) {
            if (method.getReturnType() instanceof lib_1.VoidType) {
                return;
            }
            this.checkVoidType(method.getReturnType(), methodCode, CheckType.ReturnType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
    }
    /**
     * 分析语句
     */
    analyzeStatement(stmt, useMethods, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        this.globleStmt = stmt;
        let originalText = stmt.getOriginalText() ?? '';
        this.line = stmt.getOriginPositionInfo().getLineNo();
        this.column = stmt.getOriginPositionInfo().getColNo();
        if (stmt instanceof lib_1.ArkAliasTypeDefineStmt) {
            this.checkVoidType(stmt.getAliasType().getOriginalType(), originalText, CheckType.GenericTypeArgument, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        else if (stmt instanceof lib_1.ArkAssignStmt) {
            this.analyzeAssignStatement(stmt, originalText, useMethods, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        else if (stmt instanceof lib_1.ArkInvokeStmt) {
            const genericTypes = stmt.getInvokeExpr().getRealGenericTypes();
            if (genericTypes) {
                genericTypes.forEach((genericType) => {
                    this.checkVoidType(genericType, originalText, CheckType.GenericTypeArgument, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
                });
            }
        }
    }
    /**
     * 分析赋值语句
     */
    analyzeAssignStatement(stmt, originalText, useMethods, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        let rightType = stmt.getRightOp().getType();
        let leftType = stmt.getLeftOp().getType();
        if (leftType.getTypeString().includes('void')) {
            this.checkVoidType(stmt.getLeftOp().getType(), originalText, CheckType.leftOp, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        if (rightType instanceof lib_1.FunctionType) {
            let method = rightType.getMethodSignature().getMethodSubSignature();
            useMethods.push(method.getMethodName());
            if (method.getReturnType() instanceof lib_1.VoidType) {
                return;
            }
            if (method.getReturnType().getTypeString().includes('void')) {
                this.checkVoidType(method.getReturnType(), originalText, CheckType.ReturnType, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            }
        }
        if (stmt.getRightOp() instanceof lib_1.ArkNewExpr) {
            this.checkVoidType(rightType, originalText, CheckType.NewExpr, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
        else if (!(stmt.getRightOp() instanceof lib_1.Local)) {
            this.checkVoidType(rightType, originalText, CheckType.rightOp, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
        }
    }
    /**
     * 分析类的字段
     */
    analyzeFields(cls, errorPositions, allowInGenericTypeArguments, allowAsThisParameter) {
        cls.getFields().forEach(field => {
            let type = field.getSignature().getType();
            //这里 7 表示类属性方法
            if (field.getCategory() === 7 && type instanceof lib_1.VoidType) {
                return;
            }
            this.line = field.getOriginPosition().getLineNo();
            this.column = field.getOriginPosition().getColNo();
            this.checkVoidType(type, field.getCode(), CheckType.ThisParameter, errorPositions, allowInGenericTypeArguments || false, allowAsThisParameter);
        });
    }
    /**
     * 获取错误位置
     */
    getMessage(arkfile, option) {
        let errorPositions = [];
        const allowInGenericTypeArguments = option.allowInGenericTypeArguments;
        const allowAsThisParameter = option.allowAsThisParameter;
        arkfile.getClasses().forEach(cls => {
            if (this.useCls.includes(cls.getSignature().getClassName())) {
                return;
            }
            // 分析类的字段
            this.analyzeFields(cls, errorPositions, allowInGenericTypeArguments, allowAsThisParameter);
            this.useMethods = [];
            // 分析类的方法
            cls.getMethods().forEach(method => {
                //这些方法在其他表达式中已使用
                if (this.useMethods.includes(method.getName())) {
                    return;
                }
                this.analyzeMethod(method, this.useMethods, errorPositions, allowInGenericTypeArguments || false, allowAsThisParameter);
            });
        });
        return errorPositions;
    }
    /**
     * 检查文件
     */
    check = (target) => {
        let options = this.getOption();
        this.globleArkFile = target;
        let errorPositions = this.getMessage(target, options);
        // 对错误位置排序
        errorPositions.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line; // 先按行号排序
            }
            return a.colum - b.colum; // 行号相同时按列号排序
        });
        // 报告所有错误
        errorPositions.forEach(position => {
            this.addIssueReport(target, position.line, position.colum, position.sourceCode, position.message, position.generic);
        });
    };
    /**
     * 添加问题报告
     */
    addIssueReport(arkFile, lineNum, startColum, code, messageId, generic = '') {
        const severity = this.rule.alert ?? this.metaData.severity;
        let message = messageId !== 'invalidVoidForGeneric'
            ? this.metaData.messages[messageId]
            : `${generic} may not have void as a type argument.`;
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoInvalidVoidTypeCheck = NoInvalidVoidTypeCheck;
