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
exports.NoMisusedPromisesCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const ArkMethodBuilder_1 = require("arkanalyzer/lib/core/model/builder/ArkMethodBuilder");
const ArkBaseModel_1 = require("arkanalyzer/lib/core/model/ArkBaseModel");
const TypeExpr_1 = require("arkanalyzer/lib/core/base/TypeExpr");
const targetClasses = ['Promise', 'PromiseLike', 'PromiseConstructor'];
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoMisusedPromisesCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-misused-promises.md',
    description: 'Disallow Promises in places not designed to handle them',
    messages: {
        conditional: 'Expected non-Promise value in a boolean conditional.',
        spread: 'Expected a non-Promise value to be spreaded in an object.',
        voidReturnArgument: 'Promise returned in function argument where a void return was expected.',
        voidReturnAttribute: 'Promise-returning function provided to attribute where a void return was expected.',
        voidReturnProperty: 'Promise-returning function provided to property where a void return was expected.',
        voidReturnReturnValue: 'Promise-returning function provided to return value where a void return was expected.',
        voidReturnVariable: 'Promise-returning function provided to variable where a void return was expected.',
    },
    defaultOptions: { checksConditionals: true, checksSpreads: true, checksVoidReturn: true }
};
function parseCheckVoidReturn(checksVoidReturn) {
    if (checksVoidReturn === false) {
        return false;
    }
    if (checksVoidReturn === true || checksVoidReturn === undefined) {
        return {
            arguments: true,
            attributes: true,
            properties: true,
            returns: true,
            variables: true,
        };
    }
    return {
        arguments: checksVoidReturn.arguments ?? true,
        attributes: checksVoidReturn.attributes ?? true,
        properties: checksVoidReturn.properties ?? true,
        returns: checksVoidReturn.returns ?? true,
        variables: checksVoidReturn.variables ?? true,
    };
}
const LogicalTypes = [lib_1.ts.SyntaxKind.AmpersandAmpersandToken, lib_1.ts.SyntaxKind.BarBarToken, lib_1.ts.SyntaxKind.QuestionQuestionToken];
class NoMisusedPromisesCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    globalArkCls;
    globalArkFile;
    globalArkMethod;
    globalNode;
    globalStmt;
    useMethods = [];
    errorPositions = [];
    visitedNodes = new Set();
    typeCache = new Map();
    methodCache = new Map();
    MAX_RECURSION_DEPTH = 3;
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    getOption() {
        let option = this.metaData.defaultOptions;
        if (this.rule && this.rule.option[0]) {
            option = this.rule.option[0];
        }
        return option;
    }
    getNodeKey(value, node) {
        return `${value.constructor.name}-${value instanceof lib_1.Local ? value.getName() : value.constructor.name}-${node.getText()}`;
    }
    getTypeKey(type, cls) {
        return `${type.constructor.name}-${cls?.getSignature().getClassName() ?? 'null'}`;
    }
    getMethodKey(cls, methodName) {
        return `${cls.getSignature().getClassName()}-${methodName}`;
    }
    getMethodWithCache(cls, methodName) {
        const key = this.getMethodKey(cls, methodName);
        if (this.methodCache.has(key)) {
            return this.methodCache.get(key);
        }
        const method = cls.getMethodWithName(methodName) ?? undefined;
        this.methodCache.set(key, method);
        return method;
    }
    checkIsPromise(value, node, cls, depth = 0) {
        if (depth > this.MAX_RECURSION_DEPTH) {
            return false;
        }
        if (!node) {
            return false;
        }
        const nodeKey = this.getNodeKey(value, node);
        if (this.visitedNodes.has(nodeKey)) {
            return false;
        }
        this.visitedNodes.add(nodeKey);
        try {
            const valueDeclar = value.getDeclaringStmt();
            const type = value.getType();
            if (type instanceof lib_1.UnknownType) {
                return this.handleUnknownType(valueDeclar, node, cls);
            }
            const typeKey = this.getTypeKey(type, cls);
            if (this.typeCache.has(typeKey)) {
                return this.typeCache.get(typeKey) ?? false;
            }
            const isPromiseResult = this.isPromiseType(type, cls);
            this.typeCache.set(typeKey, isPromiseResult);
            if (isPromiseResult) {
                return true;
            }
            return this.checkDeclarationStatement(valueDeclar, node, depth, cls);
        }
        finally {
            this.visitedNodes.delete(nodeKey);
        }
    }
    handleUnknownType(valueDeclar, node, cls) {
        if (valueDeclar instanceof lib_1.ArkAssignStmt) {
            return this.isPromise(valueDeclar.getRightOp(), this.getExpressionNode(node), cls);
        }
        return false;
    }
    checkDeclarationStatement(valueDeclar, node, depth, cls) {
        if (valueDeclar instanceof lib_1.ArkAssignStmt) {
            return this.isPromise(valueDeclar.getRightOp(), node, cls, depth + 1);
        }
        return false;
    }
    isPromiseType(type, cls) {
        if (type instanceof lib_1.LiteralType) {
            return false;
        }
        const typeKey = this.getTypeKey(type, cls);
        if (this.typeCache.has(typeKey)) {
            return this.typeCache.get(typeKey) ?? false;
        }
        const result = this.checkTypeForPromise(type, cls);
        this.typeCache.set(typeKey, result);
        return result;
    }
    checkTypeForPromise(type, cls) {
        if (type instanceof lib_1.ClassType) {
            return this.checkIsPromiseCls(type);
        }
        if (type instanceof lib_1.TupleType) {
            return type.getTypes().some(t => this.isPromiseType(t, cls));
        }
        if (type instanceof lib_1.FunctionType) {
            return this.checkFunctionTypeForPromise(type, cls);
        }
        if (type instanceof lib_1.ArrayType) {
            return this.isPromiseType(type.getBaseType(), cls);
        }
        if (type instanceof lib_1.UnclearReferenceType) {
            return targetClasses.includes(type.getName());
        }
        if (type instanceof lib_1.IntersectionType) {
            return type.getTypes().some(t => this.isPromiseType(t, cls));
        }
        if (type instanceof lib_1.AliasType) {
            return this.isPromiseType(type.getOriginalType(), cls);
        }
        if (type instanceof lib_1.UnionType) {
            return type.getTypes().some(t => this.isPromiseType(t, cls));
        }
        return false;
    }
    checkFunctionTypeForPromise(type, cls) {
        const methodName = type.getMethodSignature().getMethodSubSignature().getMethodName();
        const arkMethod = this.getMethodWithCache(cls ?? this.globalArkCls, methodName);
        if (!this.useMethods.includes(methodName)) {
            this.useMethods.push(methodName);
        }
        if (arkMethod?.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
            return true;
        }
        if (arkMethod?.getBodyBuilder()?.getGlobals()?.has('Promise')) {
            return true;
        }
        const returnType = arkMethod?.getSignature().getMethodSubSignature().getReturnType();
        if (returnType instanceof lib_1.UnionType) {
            return returnType.getTypes().some(t => this.isPromiseType(t, cls));
        }
        if (returnType) {
            return this.isPromiseType(returnType, cls);
        }
        return false;
    }
    getExpressionNode(node) {
        if (node && (lib_1.ts.isCallExpression(node) || lib_1.ts.isIfStatement(node) || lib_1.ts.isPropertyAccessExpression(node))) {
            return node.expression;
        }
        return node;
    }
    checkConditional(stmt, node, checkRight = false) {
        stmt = this.handleIfStatement(stmt);
        stmt = this.handleAssignStatement(stmt);
        if (!node || !this.isValidBinaryExpression(node)) {
            return;
        }
        node = this.handleParenthesizedExpression(node);
        stmt = this.handleLocalVariable(stmt, node);
        if (this.handleUnaryExpression(stmt, node)) {
            checkRight = true;
        }
        if (stmt instanceof lib_1.ArkAssignStmt) {
            this.checkConditional(stmt.getRightOp(), node, checkRight);
            return;
        }
        if (stmt instanceof lib_1.ArkConditionExpr) {
            this.handleConditionExpression(stmt, node, checkRight);
            return;
        }
        if (stmt instanceof lib_1.ArkNormalBinopExpr && lib_1.ts.isBinaryExpression(node)) {
            this.handleBinaryExpression(stmt, node, checkRight);
            return;
        }
        if (node && this.isPromiseLike(stmt, node)) {
            this.handlePromiseLikeExpression(node);
        }
    }
    handleIfStatement(stmt) {
        if (stmt instanceof lib_1.ArkIfStmt) {
            return stmt.getConditionExpr();
        }
        return stmt;
    }
    handleAssignStatement(stmt) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            const rightOp = stmt.getRightOp();
            const leftOp = stmt.getLeftOp();
            if (leftOp instanceof lib_1.Local && leftOp.getUsedStmts().length > 0) {
                return stmt;
            }
            return rightOp;
        }
        return stmt;
    }
    isValidBinaryExpression(node) {
        if (node && lib_1.ts.isBinaryExpression(node) && node.operatorToken && !LogicalTypes.includes(node.operatorToken.kind)) {
            return false;
        }
        return true;
    }
    handleParenthesizedExpression(node) {
        if (node && lib_1.ts.isParenthesizedExpression(node)) {
            return node.expression;
        }
        return node;
    }
    handleLocalVariable(stmt, node) {
        if (stmt instanceof lib_1.Local) {
            const declarStmt = stmt.getDeclaringStmt();
            if (declarStmt && declarStmt instanceof lib_1.ArkAssignStmt) {
                this.checkConditional(declarStmt.getRightOp(), node, false);
                return stmt;
            }
        }
        return stmt;
    }
    handleUnaryExpression(stmt, node) {
        if (stmt instanceof lib_1.ArkUnopExpr) {
            if (stmt.getOperator() !== lib_1.UnaryOperator.LogicalNot) {
                return false;
            }
            return true;
        }
        return false;
    }
    handleConditionExpression(stmt, node, checkRight) {
        this.checkConditional(stmt.getOp1(), node, checkRight);
        this.checkConditional(stmt.getOp2(), node, checkRight);
    }
    handleBinaryExpression(stmt, node, checkRight) {
        if (node.left && (stmt.getOperator() !== lib_1.NormalBinaryOperator.NullishCoalescing || checkRight)) {
            this.checkConditional(stmt.getOp1(), node.left, checkRight);
        }
        if (node.right && checkRight) {
            this.checkConditional(stmt.getOp2(), node.right, checkRight);
        }
    }
    handlePromiseLikeExpression(node) {
        let currentNode = node;
        if (this.isControlStatement(node)) {
            if (node && (lib_1.ts.isIfStatement(node) || lib_1.ts.isWhileStatement(node) || lib_1.ts.isDoStatement(node))) {
                currentNode = node.expression;
            }
        }
        if (node && this.isVariableDeclaration(node)) {
            currentNode = this.getVariableDeclarationNode(node);
        }
        if (node && lib_1.ts.isConditionalExpression(currentNode)) {
            currentNode = currentNode.condition;
        }
        if (node && lib_1.ts.isForStatement(currentNode) && currentNode.condition) {
            currentNode = currentNode.condition;
        }
        if (node && lib_1.ts.isPrefixUnaryExpression(currentNode)) {
            currentNode = currentNode.operand;
        }
        this.report('conditional', currentNode);
    }
    isControlStatement(node) {
        return lib_1.ts.isIfStatement(node) ||
            lib_1.ts.isWhileStatement(node) ||
            lib_1.ts.isDoStatement(node);
    }
    isVariableDeclaration(node) {
        return lib_1.ts.isVariableStatement(node) || lib_1.ts.isVariableDeclaration(node);
    }
    getVariableDeclarationNode(node) {
        if (node && lib_1.ts.isVariableStatement(node)) {
            node = node.declarationList.declarations[0];
        }
        if (node && lib_1.ts.isVariableDeclaration(node) && node.initializer) {
            return node.initializer;
        }
        return node;
    }
    isTestExprForBinaryExpression(node) {
        if (!node || !node.parent) {
            return false;
        }
        return lib_1.ts.isIfStatement(node.parent) ||
            lib_1.ts.isWhileStatement(node.parent) ||
            lib_1.ts.isDoStatement(node.parent) ||
            (lib_1.ts.isConditionalExpression(node.parent) && node.parent.condition === node);
    }
    report(messageId, node) {
        if (node && lib_1.ts.isParenthesizedExpression(node)) {
            node = node.expression;
            this.report(messageId, node);
            return;
        }
        let startLine = this.globalStmt.getOriginPositionInfo().getLineNo();
        let startCol = this.globalStmt.getOriginPositionInfo().getColNo();
        let { line, character } = this.globalNode.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        startLine += line;
        character = startCol !== 1 ? (character + startCol) : character + 1;
        this.errorPositions.push({
            line: startLine,
            colum: character,
            message: messageId,
            sourceCode: node.getText()
        });
    }
    checkIsPromiseCls(type) {
        if (targetClasses.includes(type.getClassSignature().getClassName())) {
            return true;
        }
        else {
            //自定义类中包含then方法，并且两个参数都是方法类型
            let declaringCls = this.globalArkFile.getClassWithName(type.getClassSignature().getClassName());
            if (!declaringCls) {
                return false;
            }
            //自定义类中包含then方法，并且两个参数都是方法类型
            if (this.checkIsCustemClsPromise(declaringCls)) {
                return true;
            }
            //自定义类继承自包含then方法的类，并且两个参数都是方法类型
            let heritageClassKeys = declaringCls.getAllHeritageClasses();
            let hasTargetClass = false;
            // 遍历 keys
            for (const clsName of heritageClassKeys) {
                if (targetClasses.includes(clsName.getName())) {
                    hasTargetClass = true;
                    break;
                }
            }
            return hasTargetClass;
        }
    }
    checkIsCustemClsPromise(declaringCls) {
        return declaringCls.getMethods().some(method => {
            let methodSignature = method.getSignature().getMethodSubSignature();
            return methodSignature.getMethodName() === 'then' &&
                methodSignature.getParameters().length === 2 &&
                methodSignature.getParameters().every(param => param instanceof ArkMethodBuilder_1.MethodParameter);
        }) ||
            //自定义类继承自包含then方法的类，并且两个参数都是方法类型
            declaringCls?.getAllHeritageClasses().some(herCls => {
                return herCls.getMethods().some(method => {
                    let methodSignature = method.getSignature().getMethodSubSignature();
                    return methodSignature.getMethodName() === 'then' &&
                        methodSignature.getParameters().length === 2 &&
                        methodSignature.getParameters().every(param => param instanceof ArkMethodBuilder_1.MethodParameter);
                });
            });
    }
    isPromise(value, node, cls, depth = 0) {
        depth++;
        if (depth > this.MAX_RECURSION_DEPTH || this.isInVildNode(node) || value instanceof lib_1.ArkAwaitExpr) {
            return false;
        }
        if (node && lib_1.ts.isPropertyAccessExpression(node) &&
            lib_1.ts.isIdentifier(node.expression) &&
            targetClasses.includes(node.expression.text)) {
            return true;
        }
        if (value instanceof lib_1.Local) {
            return this.checkIsPromise(value, node, cls, depth);
        }
        return this.checkAbsArkIsPromise(value, node, cls, depth);
    }
    checkAbsArkIsPromise(value, node, cls, depth = 0) {
        if (value instanceof lib_1.ArkInstanceFieldRef && this.checkFieldRefIsPromise(value, node)) {
            return true;
        }
        if (value instanceof lib_1.ArkPtrInvokeExpr && this.checkPrtIsPromise(value)) {
            return true;
        }
        if (value instanceof lib_1.ArkStaticInvokeExpr) {
            let methodSignature = value.getMethodSignature().getMethodSubSignature();
            let arkMethod = this.globalArkCls.getMethodWithName(methodSignature.getMethodName());
            if (arkMethod?.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
                return true;
            }
            return this.isPromiseType(methodSignature.getReturnType());
        }
        if (value instanceof lib_1.ArkNormalBinopExpr) {
            const op1 = value.getOp1();
            const op2 = value.getOp2();
            return this.isPromise(op1, node, cls, depth) || this.isPromise(op2, node, cls, depth);
        }
        if (value instanceof lib_1.ArkInstanceInvokeExpr) {
            return this.isPromise(value.getBase(), this.getExpressionNode(node), cls, depth);
        }
        if (value instanceof lib_1.ArkConditionExpr) {
            return this.isPromise(value.getOp1(), this.getExpressionNode(node), cls, depth) ||
                this.isPromise(value.getOp2(), node, cls, depth);
        }
        if (value instanceof lib_1.ArkUnopExpr) {
            return this.isPromise(value.getOp(), node, cls, depth);
        }
        if (value instanceof lib_1.ArkNewExpr) {
            return this.isPromiseType(value.getType(), cls);
        }
        return false;
    }
    checkFieldRef(declarCls, value, node) {
        for (const field of declarCls?.getFields() ?? []) {
            if (node && field.getSignature().getFieldName() === value.getFieldSignature().getFieldName()) {
                return this.isPromiseType(field.getType()) ||
                    field.getInitializer().some(init => init instanceof lib_1.ArkAssignStmt &&
                        this.isPromise(init.getRightOp(), node));
            }
        }
        return false;
    }
    checkFieldRefIsPromise(value, node) {
        let declarSignature = value.getFieldSignature().getDeclaringSignature();
        if (declarSignature instanceof lib_1.ClassSignature) {
            let declarCls = this.globalArkCls.getDeclaringArkFile().getClassWithName(declarSignature.getClassName());
            if (declarCls && node && this.checkFieldRef(declarCls, value, node)) {
                return true;
            }
        }
        return false;
    }
    isPromiseLike(value, node, cls, depth = 0) {
        if (value instanceof lib_1.ArkAssignStmt) {
            return this.isPromise(value.getRightOp(), this.getExpressionNode(node), cls) ||
                this.isPromise(value.getLeftOp(), this.getExpressionNode(node), cls);
        }
        if (value instanceof lib_1.ArkReturnStmt) {
            return this.isPromise(value.getOp(), this.getExpressionNode(node), cls);
        }
        if (value instanceof lib_1.ArkInvokeStmt) {
            return this.isPromise(value.getInvokeExpr(), this.getExpressionNode(node), cls);
        }
        if (value instanceof lib_1.Local || value instanceof lib_1.AbstractExpr) {
            return this.isPromise(value, this.getExpressionNode(node), cls);
        }
        return false;
    }
    isInVildNode(node) {
        if (!node) {
            return true;
        }
        if (lib_1.ts.isLiteralExpression(node) ||
            lib_1.ts.isLiteralTypeNode(node) ||
            lib_1.ts.isAwaitExpression(node)) {
            return true;
        }
        if (lib_1.ts.isPropertyAccessExpression(node) && lib_1.ts.isIdentifier(node.expression) && node.questionDotToken) {
            return true;
        }
        if ([lib_1.ts.SyntaxKind.NullKeyword, lib_1.ts.SyntaxKind.UndefinedKeyword].includes(node.kind)) {
            return true;
        }
        return false;
    }
    checkPrtIsPromise(value) {
        let funcExpr = value.getFuncPtrLocal();
        if (!(funcExpr instanceof lib_1.Local)) {
            return false;
        }
        let methodName = funcExpr.getName();
        let arkMethod = this.globalArkCls.getMethodWithName(methodName);
        let methodDeclar = funcExpr.getDeclaringStmt();
        if (methodDeclar && methodDeclar instanceof lib_1.ArkAssignStmt) {
            let functionleftType = methodDeclar.getLeftOp().getType();
            let functionrightType = methodDeclar.getRightOp().getType();
            if ([functionleftType, functionrightType].some(funtype => funtype instanceof lib_1.FunctionType && this.isPromiseType(funtype))) {
                return true;
            }
        }
        if (arkMethod?.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
            return true;
        }
        return false;
    }
    checkNoMisusedPromises(stmt) {
        const option = this.getOption();
        const checksVoidReturn = parseCheckVoidReturn(option.checksVoidReturn);
        if (!stmt.getOriginalText()) {
            return;
        }
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp().getType();
            if (rightOp instanceof lib_1.NumberType) {
                return;
            }
        }
        const sourceFile = lib_1.AstTreeUtils.getASTNode('temp.ts', stmt.getOriginalText() ?? '');
        let tsNode = lib_1.ts.isSourceFile(sourceFile) && sourceFile.statements.length > 0 ? sourceFile.statements[0] : sourceFile;
        if (lib_1.ts.isExpressionStatement(tsNode)) {
            tsNode = tsNode.expression;
        }
        this.globalNode = tsNode;
        if (option.checksConditionals) {
            if (stmt instanceof lib_1.ArkIfStmt ||
                ((lib_1.ts.isBinaryExpression(tsNode) ||
                    lib_1.ts.isConditionalExpression(tsNode)) &&
                    stmt instanceof lib_1.ArkAssignStmt && stmt.getRightOp() instanceof lib_1.ArkNormalBinopExpr)) {
                this.checkConditional(stmt, tsNode, this.isTestExprForBinaryExpression(tsNode));
            }
        }
        if (checksVoidReturn) {
            this.checkVoidReturn(stmt, tsNode, checksVoidReturn);
        }
        if (option.checksSpreads) {
            //因为底座返回语句不能确定是否Spread，所以遍历ts.Node看是否存在SpreadElement
            this.checkSpread(stmt, tsNode);
        }
    }
    getArgumentsPtrFunction(type, count = 0) {
        let funcMethod = null;
        if (count > this.MAX_RECURSION_DEPTH * 2) {
            return null;
        }
        count++;
        if (type instanceof lib_1.FunctionType) {
            let methodName = type.getMethodSignature().getMethodSubSignature().getMethodName();
            funcMethod = this.globalArkCls.getMethodWithName(methodName);
        }
        if (type instanceof TypeExpr_1.TypeQueryExpr) {
            return this.getArgumentsPtrFunction(type.getGenerateTypes()?.find(ty => ty instanceof lib_1.AliasType) ?? type.getType(), count);
        }
        if (type instanceof lib_1.AliasType) {
            return this.getArgumentsPtrFunction(type.getOriginalType(), count);
        }
        if (type instanceof lib_1.UnionType) {
            return this.getArgumentsPtrFunction(type.getTypes().find(ty => ty instanceof lib_1.FunctionType) ?? type, count);
        }
        return funcMethod;
    }
    checkGetDeclarStmt(declarName) {
        // 首先在全局语句中查找
        const globalStmt = this.findDeclarationInStmts(this.globalStmt.getCfg().getStmts(), declarName);
        if (globalStmt) {
            return globalStmt;
        }
        // 然后在方法体中查找
        return this.findDeclarationInStmts(this.globalArkMethod.getBody()?.getCfg().getStmts() ?? [], declarName);
    }
    findDeclarationInStmts(stmts, declarName) {
        return stmts.find(stmt => {
            if (stmt instanceof lib_1.ArkAssignStmt && stmt.getLeftOp() instanceof lib_1.Local) {
                const local = stmt.getLeftOp();
                return local.getName() === declarName;
            }
            return false;
        }) ?? null;
    }
    handleAssignStmt(stmt) {
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return { stmt, funcMethod: undefined };
        }
        let assignLeft = stmt.getLeftOp();
        let assignRight = stmt.getRightOp();
        let funcMethod;
        if (assignLeft instanceof lib_1.Local && assignRight instanceof lib_1.ArkNewExpr) {
            const usedStmt = assignLeft.getUsedStmts().find(sm => sm instanceof lib_1.ArkInvokeStmt);
            if (usedStmt instanceof lib_1.ArkInvokeStmt) {
                stmt = usedStmt.getInvokeExpr();
            }
            let assignCls = this.globalArkFile.getClassWithName(assignRight.getClassType().getClassSignature().getClassName());
            const constructorMethod = assignCls?.getMethodWithName('constructor');
            funcMethod = constructorMethod ?? undefined;
        }
        return { stmt, funcMethod };
    }
    handleInvokeExpr(stmt) {
        let method = stmt.getMethodSignature().getMethodSubSignature();
        let funcMethod;
        if (stmt instanceof lib_1.ArkPtrInvokeExpr) {
            let funcExpr = stmt.getFuncPtrLocal();
            const ptrMethod = this.getArgumentsPtrFunction(funcExpr.getType());
            funcMethod = ptrMethod ?? undefined;
        }
        if (stmt instanceof lib_1.ArkStaticInvokeExpr) {
            let methodName = method.getMethodName();
            const staticMethod = this.globalArkCls.getMethodWithName(methodName);
            funcMethod = staticMethod ?? undefined;
            if (!funcMethod) {
                let ptrStmt = this.checkGetDeclarStmt(methodName);
                if (ptrStmt instanceof lib_1.ArkAssignStmt) {
                    let local = ptrStmt.getLeftOp();
                    const ptrMethod = this.getArgumentsPtrFunction(local.getType());
                    funcMethod = ptrMethod ?? undefined;
                }
            }
        }
        return funcMethod;
    }
    handleSpreadElement(node, i, stmt) {
        let arg = stmt.getArg(i);
        if (node && node.arguments && node.arguments[i] && lib_1.ts.isSpreadElement(node.arguments[i])) {
            let argument = node.arguments[i];
            if (argument.expression && lib_1.ts.isIdentifier(argument.expression)) {
                let declarStmt = this.checkGetDeclarStmt(argument.expression.text);
                if (declarStmt instanceof lib_1.ArkAssignStmt) {
                    arg = declarStmt.getRightOp();
                }
            }
        }
        return arg;
    }
    getParamType(funcMethod, i, stmt) {
        if (!funcMethod || !funcMethod.getParameters() || funcMethod.getParameters().length === 0) {
            return funcMethod?.getReturnType();
        }
        let funcMethodParam = funcMethod.getParameters()[i];
        if (!funcMethodParam || i === funcMethod.getParameters().length - 1) {
            funcMethodParam = funcMethod.getParameters()[funcMethod.getParameters().length - 1];
            if (stmt.getArgs().length > funcMethod.getParameters().length) {
                let funcMethodParamType = funcMethodParam.getType();
                if (funcMethodParamType instanceof lib_1.ArrayType) {
                    return funcMethodParamType.getBaseType();
                }
                if (funcMethodParamType instanceof lib_1.TupleType) {
                    let k = i - (funcMethod.getParameters().length - 1);
                    return funcMethodParamType.getTypes()[k];
                }
                return funcMethodParamType;
            }
        }
        return funcMethodParam.getType();
    }
    checkArgumentType(arg, node, method, methodReturnType, funcMethod, i, stmt) {
        if (!node || !node.arguments || !this.isPromiseLike(arg, node.arguments[i])) {
            return;
        }
        const paramType = this.getParamType(funcMethod, i, stmt);
        const isVoidParam = paramType && this.isVoidType(paramType);
        const isForEachFirstArg = method.getMethodName() === 'forEach' && i === 0;
        const isConstructorWithPromiseReturn = method.getMethodName() === 'constructor' && this.isPromiseType(methodReturnType);
        if (isVoidParam || isForEachFirstArg || isConstructorWithPromiseReturn) {
            this.report('voidReturnArgument', node.arguments[i]);
        }
    }
    processInvokeExpr(stmt, node) {
        const funcMethod = this.handleInvokeExpr(stmt);
        const method = stmt.getMethodSignature().getMethodSubSignature();
        const methodReturnType = method.getReturnType();
        for (let i = 0; i < stmt.getArgs().length; i++) {
            const arg = this.handleSpreadElement(node, i, stmt);
            this.checkArgumentType(arg, node, method, methodReturnType, funcMethod, i, stmt);
        }
    }
    checkArguments(stmt, node) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            const result = this.handleAssignStmt(stmt);
            stmt = result.stmt;
        }
        if (stmt instanceof lib_1.ArkInvokeStmt) {
            stmt = stmt.getInvokeExpr();
        }
        if (stmt instanceof lib_1.AbstractInvokeExpr) {
            this.processInvokeExpr(stmt, node);
        }
    }
    isVoidType(type) {
        if (type instanceof lib_1.UnionType) {
            if (type.getTypes().some(type => this.isPromiseType(type))) {
                return false;
            }
            return type.getTypes().some(type => this.isVoidType(type));
        }
        if (type instanceof lib_1.UnclearReferenceType) {
            if (type.getName() === 'Record') {
                return type.getGenericTypes().some(generic => this.isVoidType(generic));
            }
        }
        if (type instanceof lib_1.ArrayType) {
            return this.isVoidType(type.getBaseType());
        }
        if (type instanceof lib_1.AliasType) {
            return this.isVoidType(type.getOriginalType());
        }
        if (type instanceof lib_1.TupleType) {
            return type.getTypes().some(type => this.isVoidType(type));
        }
        if (type instanceof lib_1.FunctionType) {
            let returnType = type.getMethodSignature().getMethodSubSignature().getReturnType();
            return this.isVoidType(returnType);
        }
        if (type instanceof lib_1.VoidType) {
            return true;
        }
        return false;
    }
    checkProperty(stmt, node) {
        if (node && lib_1.ts.isReturnStatement(node)) {
            this.handleReturnStatement(stmt, node);
        }
        const { leftType, rightType, rightCls, leftCls } = this.getPropertyTypes(stmt);
        if (!rightCls) {
            return;
        }
        const propertyName = this.getPropertyName(node);
        if (!propertyName) {
            return;
        }
        if (node && lib_1.ts.isPropertyAssignment(node)) {
            this.handlePropertyAssignment(node, propertyName, leftType, rightCls, leftCls);
        }
        else if (node && lib_1.ts.isShorthandPropertyAssignment(node)) {
            this.handleShorthandPropertyAssignment(node, propertyName, leftType, rightCls, leftCls);
        }
        else if (node && lib_1.ts.isMethodDeclaration(node)) {
            this.handleMethodDeclaration(node, propertyName, leftType, rightCls, leftCls);
        }
        node.getChildren().forEach(child => {
            this.checkProperty(stmt, child);
        });
    }
    handleReturnStatement(stmt, node) {
        if (node && node.expression && lib_1.ts.isObjectLiteralExpression(node.expression)) {
            node.expression.properties?.forEach(ch => {
                this.checkProperty(stmt, ch);
            });
        }
    }
    getPropertyTypes(stmt) {
        let leftType;
        let rightType;
        let rightCls;
        let leftCls;
        if (stmt instanceof lib_1.ArkReturnStmt) {
            leftType = this.globalArkMethod.getSignature().getMethodSubSignature().getReturnType();
            rightType = stmt.getOp().getType();
        }
        if (stmt instanceof lib_1.ArkAssignStmt) {
            leftType = stmt.getLeftOp().getType();
            rightType = stmt.getRightOp().getType();
        }
        if (leftType instanceof lib_1.AliasType) {
            leftType = leftType.getOriginalType();
        }
        if (rightType instanceof lib_1.FunctionType) {
            rightType = rightType.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        if (leftType instanceof lib_1.FunctionType) {
            leftType = leftType.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        if (rightType instanceof lib_1.ClassType) {
            const cls = this.globalArkFile.getClassWithName(rightType.getClassSignature().getClassName());
            if (cls) {
                rightCls = cls;
            }
        }
        if (leftType instanceof lib_1.ClassType) {
            const cls = this.globalArkFile.getClassWithName(leftType.getClassSignature().getClassName());
            leftCls = cls ?? undefined;
            if (leftCls === rightCls) {
                return { leftType, rightType, rightCls, leftCls };
            }
        }
        return { leftType, rightType, rightCls, leftCls };
    }
    getPropertyName(node) {
        if (node && (lib_1.ts.isPropertyAssignment(node) || lib_1.ts.isShorthandPropertyAssignment(node) || lib_1.ts.isMethodDeclaration(node))) {
            return node.name.getText();
        }
        return undefined;
    }
    handlePropertyAssignment(node, propertyName, leftType, rightCls, leftCls) {
        if (!node || !node.initializer) {
            return;
        }
        if (leftType instanceof lib_1.ClassType) {
            const cls = this.globalArkFile.getClassWithName(leftType.getClassSignature().getClassName());
            if (cls) {
                leftCls = cls;
            }
        }
        let fieldType = leftCls?.getFieldWithName(propertyName)?.getType();
        let rightReturnType = rightCls.getFieldWithName(propertyName)?.getType();
        if ((fieldType && this.isVoidType(fieldType) || leftType && this.isVoidType(leftType)) &&
            rightCls && rightReturnType && this.isPromiseType(rightReturnType, rightCls)) {
            this.report('voidReturnProperty', node);
        }
    }
    handleShorthandPropertyAssignment(node, propertyName, leftType, rightCls, leftCls) {
        let rightRtType = rightCls?.getFieldWithName(propertyName)?.getType();
        let rightMethod;
        if (rightRtType instanceof lib_1.UnknownType || rightRtType === undefined) {
            let declare = this.getDeclarByName(propertyName);
            if (declare instanceof lib_1.Type || declare === null) {
                rightRtType = declare ?? rightRtType;
            }
            else {
                rightMethod = declare;
            }
        }
        let leftRtType = leftCls?.getFieldWithName(propertyName)?.getType();
        if ((leftRtType && this.isVoidType(leftRtType) || leftType && this.isVoidType(leftType)) &&
            (rightRtType && this.isPromiseType(rightRtType, rightCls) ||
                rightMethod && (rightMethod.containsModifier(ArkBaseModel_1.ModifierType.ASYNC) ||
                    (this.isPromiseType(rightMethod.getReturnType()))))) {
            this.report('voidReturnProperty', node);
        }
    }
    handleMethodDeclaration(node, propertyName, leftType, rightCls, leftCls) {
        let rightReturnType = rightCls?.getMethodWithName(propertyName)?.getReturnType();
        let leftReturnType = leftCls?.getFieldWithName(propertyName)?.getSignature().getType();
        let returnStmt;
        if (rightReturnType instanceof lib_1.UnknownType || rightReturnType === undefined) {
            let rightMethod = rightCls?.getMethodWithName(propertyName);
            returnStmt = rightMethod?.getBody()?.getCfg().getStmts().find(sm => sm instanceof lib_1.ArkReturnStmt);
        }
        if (leftReturnType instanceof lib_1.UnknownType || leftReturnType === undefined) {
            leftReturnType = leftCls?.getMethodWithName(propertyName)?.getSignature().getMethodSubSignature().getReturnType();
        }
        if (leftReturnType && this.isVoidType(leftReturnType) &&
            ((rightReturnType && this.isPromiseType(rightReturnType, rightCls)) ||
                (returnStmt && this.isPromiseLike(returnStmt, node)))) {
            this.report('voidReturnProperty', node);
        }
    }
    getDeclarByName(propertyName) {
        let type = null;
        let declarStmt = this.globalStmt.getCfg().getStmts().find(sm => {
            if (sm instanceof lib_1.ArkAssignStmt && sm.getLeftOp() instanceof lib_1.Local) {
                let leftLocal = sm.getLeftOp();
                if (leftLocal.getName() === propertyName) {
                    return sm;
                }
            }
            return null;
        });
        if (declarStmt instanceof lib_1.ArkAssignStmt) {
            type = declarStmt.getRightOp().getType();
        }
        if (!type) {
            type = this.globalArkCls.getMethodWithName(propertyName);
        }
        return type ? type : null;
    }
    checkReturnType(op, node) {
        let opDeclar = op.getDeclaringStmt();
        let method = this.globalArkMethod.getSignature().getMethodSubSignature();
        let returnType = method.getReturnType();
        if ((returnType instanceof lib_1.UnknownType || returnType === undefined) && this.globalStmt instanceof lib_1.ArkAssignStmt) {
            let leftTy = this.globalStmt.getLeftOp().getType();
            if (leftTy instanceof lib_1.AliasType) {
                leftTy = leftTy.getOriginalType();
            }
            if (leftTy instanceof lib_1.ClassType) {
                let leftCls = this.globalArkFile.getClassWithName(leftTy.getClassSignature().getClassName());
                let clsRtTy = leftCls?.getMethodWithName(method.getMethodName())?.getSignature().getMethodSubSignature().getReturnType();
                returnType = clsRtTy ?? returnType;
            }
        }
        if (!this.isVoidType(returnType)) {
            return false;
        }
        if (this.isPromiseType(op.getType())) {
            return true;
        }
        return opDeclar && this.isPromiseLike(opDeclar, node) || false;
    }
    checkReturnStatement(stmt, node) {
        if (node && lib_1.ts.isReturnStatement(node) && stmt instanceof lib_1.ArkReturnStmt) {
            const op = stmt.getOp();
            if (op && op instanceof lib_1.Local && this.checkReturnType(op, node) && node.expression) {
                this.report('voidReturnReturnValue', node.expression);
            }
        }
    }
    checkAssignment(stmt, node) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let leftOp = stmt.getLeftOp();
            let right = stmt.getRightOp();
            if (!(leftOp instanceof lib_1.Local && right instanceof lib_1.Local)) {
                return;
            }
            if (node && lib_1.ts.isVariableDeclaration(node) &&
                node.name?.getText() === leftOp.getName() &&
                this.leftVoidReturn(leftOp) &&
                this.isPromiseLike(right, node.initializer ?? node)) {
                this.report('voidReturnVariable', node.initializer ?? node);
            }
            if (node && lib_1.ts.isBinaryExpression(node) &&
                this.leftVoidReturn(leftOp) &&
                this.isPromiseLike(right, lib_1.ts.isBinaryExpression(node) ? node.right : node)) {
                this.report('voidReturnVariable', lib_1.ts.isBinaryExpression(node) ? node.right : node);
            }
        }
    }
    checkVariableDeclarations(stmt, node) {
        if (!node) {
            return;
        }
        let declarations = lib_1.ts.isVariableStatement(node) ? node.declarationList.declarations : [node];
        declarations.forEach(declaration => {
            if (lib_1.ts.isVariableDeclaration(declaration) && declaration.initializer && lib_1.ts.isCallOrNewExpression(declaration.initializer)) {
                this.checkArguments(stmt, declaration.initializer);
            }
        });
    }
    checkVariableAssignments(stmt, node) {
        if (node && lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
            this.checkAssignment(stmt, node);
        }
        if (node && (lib_1.ts.isVariableStatement(node) || lib_1.ts.isVariableDeclaration(node))) {
            let declarations = lib_1.ts.isVariableStatement(node) ? node.declarationList.declarations : [node];
            for (const declaration of declarations) {
                this.checkAssignment(stmt, declaration);
            }
        }
    }
    checkVoidReturn(stmt, node, checksVoidReturn) {
        if (checksVoidReturn.arguments) {
            if (node && (lib_1.ts.isVariableDeclaration(node) || lib_1.ts.isVariableStatement(node))) {
                this.checkVariableDeclarations(stmt, node);
            }
            if (node && lib_1.ts.isCallOrNewExpression(node)) {
                this.checkArguments(stmt, node);
            }
        }
        if (checksVoidReturn.attributes && node && lib_1.ts.isJsxAttribute(node)) {
            //todo checkJSXAttribute
        }
        if (checksVoidReturn.properties) {
            this.checkProperty(stmt, node);
        }
        if (checksVoidReturn.returns) {
            this.checkReturnStatement(stmt, node);
        }
        if (checksVoidReturn.variables) {
            this.checkVariableAssignments(stmt, node);
        }
    }
    leftVoidReturn(left) {
        let leftType = left.getType();
        if (leftType instanceof lib_1.FunctionType) {
            let methodName = leftType.getMethodSignature().getMethodSubSignature().getMethodName();
            let leftMethod = this.globalArkCls.getMethodWithName(methodName);
            let leftReturnType = leftMethod?.getSignature().getMethodSubSignature().getReturnType();
            if (leftReturnType && this.isVoidType(leftReturnType)) {
                return true;
            }
        }
        return false;
    }
    checkSpread(stmt, node) {
        if (node && (lib_1.ts.isSpreadAssignment(node) || lib_1.ts.isSpreadElement(node))) {
            if (this.checkTsNodeIsPromise(node.expression)) {
                this.report('spread', node.expression);
            }
        }
        node.forEachChild(child => {
            this.checkSpread(stmt, child);
        });
    }
    checkTsNodeIsPromise(node) {
        if (node && lib_1.ts.isAwaitExpression(node)) {
            return false;
        }
        if (node && lib_1.ts.isParenthesizedExpression(node)) {
            return this.checkTsNodeIsPromise(node.expression);
        }
        if (node && lib_1.ts.isConditionalExpression(node)) {
            return this.checkTsNodeIsPromise(node.whenTrue) || this.checkTsNodeIsPromise(node.whenFalse);
        }
        if (node && lib_1.ts.isBinaryExpression(node)) {
            return this.checkTsNodeIsPromise(node.left) || this.checkTsNodeIsPromise(node.right);
        }
        if (node && lib_1.ts.isCallExpression(node)) {
            return this.checkTsNodeIsPromise(node.expression);
        }
        if (node && lib_1.ts.isPropertyAccessExpression(node)) {
            return this.checkTsNodeIsPromise(node.expression);
        }
        if (node && lib_1.ts.isIdentifier(node)) {
            if (node.text === 'Promise') {
                return true;
            }
            let declare = this.checkGetDeclarStmt(node.text);
            let rightType = declare?.getRightOp().getType();
            if (declare && rightType instanceof lib_1.FunctionType) {
                return this.isPromiseLike(declare, node) ?? false;
            }
        }
        return false;
    }
    checkMethod(arkMethod) {
        this.globalArkMethod = arkMethod;
        if (this.useMethods.includes(arkMethod.getSignature().getMethodSubSignature().getMethodName())) {
            return;
        }
        arkMethod.getBody()?.getCfg().getStmts().forEach(stmt => {
            this.globalStmt = stmt;
            this.checkNoMisusedPromises(stmt);
        });
    }
    checkClass(arkCls) {
        this.globalArkCls = arkCls;
        arkCls.getMethods().forEach(method => {
            this.checkMethod(method);
        });
    }
    checkFile(arkFile) {
        this.globalArkFile = arkFile;
        arkFile.getClasses().forEach(classDeclaration => {
            this.globalArkCls = classDeclaration;
            this.checkClass(classDeclaration);
        });
    }
    check = (target) => {
        // 清理所有缓存
        this.visitedNodes.clear();
        this.typeCache.clear();
        this.methodCache.clear();
        this.checkFile(target);
        this.sortAndReportErrors(target);
    };
    sortAndReportErrors(target) {
        this.errorPositions.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line;
            }
            return a.colum - b.colum;
        });
        this.errorPositions.forEach(position => {
            this.addIssueReport(target, position.line, position.colum, position.sourceCode, position.message);
        });
    }
    addIssueReport(arkFile, lineNum, startColum, code, messageId, generic = '') {
        const severity = this.rule.alert ?? this.metaData.severity;
        let message = this.metaData.messages[messageId];
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoMisusedPromisesCheck = NoMisusedPromisesCheck;
