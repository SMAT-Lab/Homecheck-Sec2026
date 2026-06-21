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
exports.NoFloatingPromisesCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const ArkBaseModel_1 = require("arkanalyzer/lib/core/model/ArkBaseModel");
const ArkMethodBuilder_1 = require("arkanalyzer/lib/core/model/builder/ArkMethodBuilder");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const numberRex = new RegExp('-?\d+(\.\d+)?');
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoFloatingPromisesCheck');
const targetClasses = ['Promise', 'PromiseLike', 'PromiseConstructor'];
const messageBase = 'Promises must be awaited, end with a call to .catch, or end with a call to .then with a rejection handler.';
const messageBaseVoid = 'Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler' +
    ' or be explicitly marked as ignored with the `void` operator.';
const messageRejectionHandler = 'A rejection handler that is not a function will be ignored.';
const messagePromiseArray = `An array of Promises may be unintentional. Consider handling the promises' fulfillment or rejection with Promise.all or similar.`;
const messagePromiseArrayVoid = `An array of Promises may be unintentional. Consider handling the promises' fulfillment or rejection with Promise.all or similar,` +
    ' or explicitly marking the expression as ignored with the `void` operator.';
const gMetaData = {
    name: 'no-floating-promises',
    severity: 2,
    ruleDocPath: 'docs/no-floating-promises.md',
    description: 'Require Promise-like statements to be handled appropriately',
    messages: {
        floating: messageBase,
        floatingFixAwait: 'Add await operator.',
        floatingVoid: messageBaseVoid,
        floatingFixVoid: 'Add void operator to ignore.',
        floatingUselessRejectionHandler: messageBase + ' ' + messageRejectionHandler,
        floatingUselessRejectionHandlerVoid: messageBaseVoid + ' ' + messageRejectionHandler,
        floatingPromiseArray: messagePromiseArray,
        floatingPromiseArrayVoid: messagePromiseArrayVoid,
    },
    defaultOptions: {
        ignoreVoid: true,
        ignoreIIFE: false,
    }
};
class NoFloatingPromisesCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    errorPositions = [];
    useMethods = [];
    //底座遍历过程中已被调用的方法，不做重复检查，每个class会重置一次
    globalArkFile;
    globalArkCls;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    // 添加缓存机制，避免递归栈溢出
    promiseTypeCache = new Map();
    statementCache = new Map();
    promiseCache = new Map();
    unhandledPromiseCache = new Map();
    maxDepth = 20;
    processedTypes = new Set();
    recursionCount = new Map();
    // 重置缓存
    resetCaches() {
        this.promiseTypeCache.clear();
        this.promiseCache.clear();
        this.unhandledPromiseCache.clear();
        this.processedTypes.clear();
        this.recursionCount.clear();
    }
    // 检查并增加递归次数
    checkAndIncreaseRecursion(key) {
        const count = this.recursionCount.get(key) || 0;
        if (count >= this.maxDepth) {
            // 达到最大递归深度
            return false;
        }
        this.recursionCount.set(key, count + 1);
        return true;
    }
    // 减少递归次数
    decreaseRecursion(key) {
        const count = this.recursionCount.get(key) || 0;
        if (count > 0) {
            this.recursionCount.set(key, count - 1);
        }
    }
    // 获取类型缓存键
    getTypeKey(type) {
        if (type instanceof lib_1.ClassType) {
            return `ClassType:${type.getClassSignature().getClassName()}`;
        }
        return `${type.constructor.name}:${type.toString().substring(0, 50)}`;
    }
    registerMatchers() {
        const fileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileCb];
    }
    ;
    getOption() {
        let option = this.metaData.defaultOptions;
        if (this.rule && this.rule.option[0]) {
            option = this.rule.option[0];
        }
        return option;
    }
    isAsyncIife(node) {
        return lib_1.ts.isCallExpression(node.expression) &&
            lib_1.ts.isParenthesizedExpression(node.expression.expression) &&
            (lib_1.ts.isArrowFunction(node.expression.expression.expression) ||
                lib_1.ts.isFunctionExpression(node.expression.expression.expression));
    }
    getRejectionHandlerFromThenCall(expression) {
        if (lib_1.ts.isPropertyAccessExpression(expression.expression) &&
            lib_1.ts.isIdentifier(expression.expression.name) &&
            expression.expression.name.text === 'then' &&
            expression.arguments.length >= 2) {
            return expression.arguments[1];
        }
        return undefined;
    }
    hasValidRejectionHandler(node, value, stmt) {
        const catchRejectionHandler = this.getRejectionHandlerFromCatchCall(node);
        if (catchRejectionHandler) {
            if (this.isValidCatchHandler(catchRejectionHandler, value)) {
                return { isUnhandled: false };
            }
            return { isUnhandled: true, nonFunctionHandler: true };
        }
        const thenRejectionHandler = this.getRejectionHandlerFromThenCall(node);
        if (thenRejectionHandler) {
            if (this.isValidThenHandler(thenRejectionHandler, value)) {
                return { isUnhandled: false };
            }
            return { isUnhandled: true, nonFunctionHandler: true };
        }
        if (lib_1.ts.isPropertyAccessExpression(node.expression)) {
            const baseExpr = node.expression.expression;
            if (lib_1.ts.isParenthesizedExpression(baseExpr)) {
                return this.isUnhandledPromise(baseExpr.expression, value, stmt);
            }
            if (lib_1.ts.isOptionalChain(baseExpr)) {
                return this.isUnhandledPromise(baseExpr, value, stmt);
            }
            if (lib_1.ts.isTaggedTemplateExpression(baseExpr) && !['then', 'catch'].includes(node.expression.name.getText())) {
                return { isUnhandled: false };
            }
        }
        // `x.finally()` is transparent to resolution of the promise, so check `x`.
        const promiseFinallyObject = this.getObjectFromFinallyCall(node);
        if (promiseFinallyObject) {
            return this.isUnhandledPromise(promiseFinallyObject, value instanceof lib_1.ArkInstanceInvokeExpr ? value.getBase() : value, stmt);
        }
        return { isUnhandled: true };
    }
    getObjectFromFinallyCall(expression) {
        if (lib_1.ts.isPropertyAccessExpression(expression.expression) &&
            lib_1.ts.isIdentifier(expression.expression.name) &&
            expression.expression.name.text === 'finally') {
            return expression.expression.expression;
        }
        return undefined;
    }
    isValidCatchHandler(handler, value) {
        return lib_1.ts.isFunctionExpression(handler) ||
            lib_1.ts.isArrowFunction(handler) ||
            (lib_1.ts.isIdentifier(handler) && value instanceof lib_1.ArkInstanceInvokeExpr && this.isFunctionType(value.getArg(0)));
    }
    isValidThenHandler(handler, value) {
        return lib_1.ts.isFunctionExpression(handler) ||
            lib_1.ts.isArrowFunction(handler) ||
            (lib_1.ts.isIdentifier(handler) && value instanceof lib_1.ArkInstanceInvokeExpr && this.isFunctionType(value.getArg(1)));
    }
    isFunctionType(local) {
        if (local instanceof lib_1.FunctionType) {
            return true;
        }
        if (local?.getType() instanceof lib_1.FunctionType) {
            return true;
        }
        return false;
    }
    getRejectionHandlerFromCatchCall(expression) {
        if (lib_1.ts.isPropertyAccessExpression(expression.expression) &&
            lib_1.ts.isIdentifier(expression.expression.name) &&
            expression.expression.name.text === 'catch' &&
            expression.arguments.length >= 1) {
            return expression.arguments[0];
        }
        return undefined;
    }
    report(stmt, message) {
        const line = stmt.getOriginPositionInfo().getLineNo();
        const col = stmt.getOriginPositionInfo().getColNo();
        return { line, colum: col, message, sourceCode: stmt.getOriginalText() ?? '' };
    }
    getErrorMessage(option, promiseArray, nonFunctionHandler) {
        if (promiseArray) {
            return option.ignoreVoid ? 'floatingPromiseArrayVoid' : 'floatingPromiseArray';
        }
        if (option.ignoreVoid) {
            return nonFunctionHandler ? 'floatingUselessRejectionHandlerVoid' : 'floatingVoid';
        }
        return nonFunctionHandler ? 'floatingUselessRejectionHandler' : 'floating';
    }
    checkArrayLiteralExpression(node, value, stmt) {
        if (!(stmt instanceof lib_1.ArkAssignStmt)) {
            return false;
        }
        if (node.elements.length === 0) {
            return true;
        }
        let leftop = stmt.getLeftOp();
        if (leftop instanceof lib_1.ArkArrayRef) {
            let leftIdx = leftop.getIndex();
            if (leftIdx instanceof Constant_1.NumberConstant) {
                let eles = node.elements.map(element => element);
                let targetElement = eles[parseInt(leftIdx.getValue())];
                // 如果是字面量，直接返回 true
                if (lib_1.ts.isLiteralExpression(targetElement)) {
                    return true;
                }
                // 检查是否是已处理的 Promise
                let result = this.isUnhandledPromise(targetElement, value, stmt);
                return !result.isUnhandled;
            }
        }
        else {
            return true;
        }
        return false;
    }
    checkCommaBinaryExpression(node, value, stmt) {
        let items = [{ name: 'right', node: node.right }, { name: 'left', node: node.left }].map(item => {
            return this.isUnhandledPromise(item.node, (value instanceof lib_1.ArkAssignStmt ? (item.name === 'right' ? value.getRightOp() : value.getLeftOp()) ?? value : value), stmt);
        });
        return items.find(item => item.isUnhandled) ?? { isUnhandled: false };
    }
    getConditionalValue(block, value) {
        let left;
        let right;
        for (let i = 0; i < block.getSuccessors().length; i++) {
            let success = block.getSuccessors()[i];
            if (success.getStmts().length > 0) {
                if (i === 0) {
                    left = success.getStmts()[success.getStmts().length - 1];
                }
                if (i === 1) {
                    right = success.getStmts()[success.getStmts().length - 1];
                }
            }
        }
        return { leftValue: left, rightValue: right };
    }
    checkConditional(node, value, stmt) {
        if (!(value instanceof lib_1.ArkIfStmt)) {
            return { isUnhandled: false };
        }
        let leftValue;
        let rightVlaue;
        for (const block of value.getCfg().getBlocks()) {
            if (block.getStmts().some(stmt => value === stmt)) {
                let result = this.getConditionalValue(block, value);
                leftValue = result.leftValue;
                rightVlaue = result.rightValue;
            }
        }
        if (!leftValue && !rightVlaue) {
            return { isUnhandled: false };
        }
        // We must be getting the promise-like value from one of the branches of the
        // ternary. Check them directly.
        const alternateResult = this.isUnhandledPromise(node.whenTrue, leftValue ?? value, stmt);
        if (alternateResult.isUnhandled) {
            return alternateResult;
        }
        return this.isUnhandledPromise(node.whenFalse, rightVlaue ?? value, stmt);
    }
    isUnhandledPromise(node, value, stmt) {
        // 创建缓存键
        const cacheKey = `isUnhandled_${node.pos}_${node.end}_${value.toString().substring(0, 50)}`;
        // 检查缓存
        if (this.unhandledPromiseCache.has(cacheKey)) {
            return this.unhandledPromiseCache.get(cacheKey);
        }
        // 检查递归深度
        if (!this.checkAndIncreaseRecursion(cacheKey)) {
            this.decreaseRecursion(cacheKey);
            return { isUnhandled: false }; // 递归太深，保守返回不是未处理的promise
        }
        let result;
        try {
            result = this._determineUnhandledPromise(node, value, stmt);
        }
        catch (e) {
            logger.error(`isUnhandledPromise error: ${e}`);
            result = { isUnhandled: false };
        }
        // 缓存结果
        this.unhandledPromiseCache.set(cacheKey, result);
        // 减少递归计数
        this.decreaseRecursion(cacheKey);
        return result;
    }
    _determineUnhandledPromise(node, value, stmt) {
        // 处理各种表达式类型
        // 1. "as"表达式
        if (lib_1.ts.isAsExpression(node)) {
            return this.isUnhandledPromise(node.expression, value, stmt);
        }
        // 2. 数组字面量表达式
        if (lib_1.ts.isArrayLiteralExpression(node)) {
            return this.checkArrayExpression(node, value, stmt);
        }
        // 3. 逗号表达式
        if (lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken) {
            return this.checkCommaBinaryExpression(node, value, stmt);
        }
        // 4. await表达式
        if (lib_1.ts.isAwaitExpression(node) ||
            (lib_1.ts.isCallExpression(node) && lib_1.ts.isIdentifier(node.expression) &&
                node.expression.getText() === 'await')) {
            return this.checkAwaitExpression(node, value, stmt);
        }
        // 处理属性访问表达式
        if (lib_1.ts.isPropertyAccessExpression(node)) {
            if (lib_1.ts.isParenthesizedExpression(node.expression) && lib_1.ts.isAwaitExpression(node.expression.expression)) {
                return { isUnhandled: false };
            }
        }
        // 5. void表达式
        if (this.getOption().ignoreVoid && lib_1.ts.isVoidExpression(node)) {
            return { isUnhandled: false };
        }
        // 6. 条件表达式
        if (lib_1.ts.isConditionalExpression(node)) {
            return this.checkConditional(node, value, stmt);
        }
        // 7. Promise数组
        if (this.isPromiseArray(value, node)) {
            return { isUnhandled: true, promiseArray: true };
        }
        // 8. 检查是否类似Promise
        if (!this.isPromiseLike(value, node)) {
            return { isUnhandled: false };
        }
        return this.checkNodeIsPromise(node, value, stmt);
    }
    checkAwaitExpression(node, value, stmt) {
        if (value instanceof lib_1.ArkAwaitExpr && !this.isPromise(value.getPromise(), node)) {
            return this.isUnhandledPromise(node.expression, value.getPromise(), stmt);
        }
        return { isUnhandled: false };
    }
    checkArrayExpression(node, value, stmt) {
        if (!(value instanceof lib_1.ArkAssignStmt) || this.checkArrayLiteralExpression(node, value, stmt)) {
            return { isUnhandled: false };
        }
        return { isUnhandled: true };
    }
    checkNodeIsPromise(node, value, stmt) {
        if (lib_1.ts.isCallExpression(node)) {
            if (lib_1.ts.isParenthesizedExpression(node.expression)) {
                return this.isUnhandledPromise(node.expression.expression, value, stmt);
            }
            // 处理可选链调用
            if (lib_1.ts.isIdentifier(node.expression) && node.questionDotToken) {
                return this.isUnhandledPromise(node, value, stmt);
            }
            return this.hasValidRejectionHandler(node, value, stmt);
        }
        else if (lib_1.ts.isBinaryExpression(node) &&
            [lib_1.ts.SyntaxKind.QuestionQuestionToken, lib_1.ts.SyntaxKind.BarBarToken, lib_1.ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
            // 处理逻辑运算符
            return this.checkNormalBinop(value, stmt, node);
        }
        return { isUnhandled: true };
    }
    checkNormalBinop(value, stmt, node) {
        if (value instanceof lib_1.ArkAssignStmt) {
            value = value.getRightOp();
        }
        if (value instanceof lib_1.ArkNormalBinopExpr) {
            let left = value.getOp1();
            let right = value.getOp2();
            if (left instanceof lib_1.ArkAwaitExpr && left.getPromise()) {
                left = left.getPromise();
            }
            if (lib_1.ts.isVoidExpression(node.left) && value.getOperator() === '&&') {
                return { isUnhandled: false };
            }
            let leftResult = this.checkNormalBinopLeftValue(left, value, stmt, node);
            if (leftResult) {
                return leftResult;
            }
            return this.isUnhandledPromise(node.right, right, stmt);
        }
        return { isUnhandled: false };
    }
    checkNormalBinopLeftValue(left, value, stmt, node) {
        if (left.getType() instanceof lib_1.BooleanType && left instanceof lib_1.Local) {
            //当逻辑符&&左边为false时，右边不会执行，所以不会有promise
            let leftDeclar = left.getDeclaringStmt();
            if (leftDeclar instanceof lib_1.ArkAssignStmt && this.checkQueryValue(leftDeclar, value, stmt, left)) {
                return { isUnhandled: false };
            }
        }
        else {
            let leftRs = this.isUnhandledPromise(node.left, left, stmt);
            if (leftRs.isUnhandled) {
                return leftRs;
            }
        }
        return false;
    }
    checkQueryValueStmt(block, stmt) {
        let seekIdx = block.getStmts().length - 1;
        for (let i = 0; i < block.getStmts().length; i++) {
            let valueStmt = block.getStmts()[i];
            if (valueStmt === stmt) {
                seekIdx = i;
                break;
            }
        }
        return seekIdx;
    }
    checkQueryBySeekIndex(seekIdx, block, queryValue, leftValue) {
        for (let i = seekIdx; i > 0; i--) {
            let seekStmt = block.getStmts()[i];
            if (seekStmt instanceof lib_1.ArkAssignStmt && seekStmt.getLeftOp() === queryValue) {
                let seekleft = seekStmt.getLeftOp();
                let seekright = seekStmt.getRightOp();
                if (seekleft instanceof lib_1.Local &&
                    queryValue.getName() === seekleft.getName() &&
                    seekright instanceof Constant_1.BooleanConstant) {
                    //找到变量赋值语句
                    leftValue = seekright;
                    break;
                }
            }
        }
        return leftValue;
    }
    checkQueryValue(leftDeclar, value, stmt, queryValue) {
        let leftValue = leftDeclar.getRightOp();
        let leftDeclar_left = leftDeclar.getLeftOp();
        if (leftDeclar_left instanceof lib_1.Local && !leftDeclar_left.getConstFlag()) {
            //当左边为变量时，判断变量是否为false
            for (const block of stmt.getCfg().getBlocks()) {
                let seekIdx = this.checkQueryValueStmt(block, stmt);
                leftValue = this.checkQueryBySeekIndex(seekIdx, block, queryValue, leftValue);
            }
        }
        if (leftValue instanceof Constant_1.BooleanConstant) {
            let leftVl = leftValue.getValue();
            if (leftVl === 'false' && value.getOperator() === '&&') {
                return true;
            }
            if (leftVl === 'true' && ['||', '??'].includes(value.getOperator())) {
                return true;
            }
        }
        return false;
    }
    preCheck(tsNode, value) {
        //如果是变量声明，并且右值为方法时，就把方法名加入到useMethods中
        if ((lib_1.ts.isVariableStatement(tsNode) || lib_1.ts.isVariableDeclaration(tsNode)) && value instanceof lib_1.ArkAssignStmt) {
            let initType = value.getRightOp().getType();
            //如果是函数类型，就把函数名加入到useMethods中
            if (initType instanceof lib_1.FunctionType) {
                this.useMethods.push(initType.getMethodSignature().getMethodSubSignature().getMethodName());
            }
        }
    }
    checkExpr(stmt, option) {
        const sourceCode = lib_1.AstTreeUtils.getASTNode('temp', stmt.getOriginalText() ?? '');
        const tsNode = lib_1.ts.isSourceFile(sourceCode) && sourceCode.statements.length > 0 ? sourceCode.statements[0] : sourceCode;
        let checkValue = stmt;
        let position = { line: 0, colum: 0, message: '', sourceCode: '' };
        this.preCheck(tsNode, checkValue);
        if (!lib_1.ts.isExpressionStatement(tsNode) || (option.ignoreIIFE && this.isAsyncIife(tsNode))) {
            return position;
        }
        if ((lib_1.ts.isArrowFunction(tsNode.expression) || lib_1.ts.isFunctionExpression(tsNode.expression)) &&
            !lib_1.ts.isCallExpression(tsNode.parent)) {
            return position;
        }
        let expression = tsNode.expression;
        if (stmt instanceof lib_1.ArkInvokeStmt) {
            checkValue = stmt.getInvokeExpr();
        }
        if (stmt instanceof lib_1.ArkAssignStmt && stmt.getRightOp() instanceof lib_1.AbstractExpr) {
            if (stmt.getRightOp() instanceof lib_1.ArkNormalBinopExpr || stmt.getRightOp() instanceof lib_1.ArkAwaitExpr) {
                checkValue = stmt.getRightOp();
            }
            else {
                return position;
            }
        }
        const { isUnhandled, nonFunctionHandler, promiseArray } = this.isUnhandledPromise(expression, checkValue, stmt);
        if (isUnhandled) {
            const message = this.getErrorMessage(option, promiseArray ?? false, nonFunctionHandler ?? false);
            return this.report(stmt, message);
        }
        return position;
    }
    isInVildNode(node) {
        if (!node) {
            return true;
        }
        if (lib_1.ts.isLiteralExpression(node) || lib_1.ts.isLiteralTypeNode(node)) {
            return true;
        }
        if ([lib_1.ts.SyntaxKind.NullKeyword, lib_1.ts.SyntaxKind.UndefinedKeyword].includes(node.kind)) {
            return true;
        }
        return false;
    }
    checkIsPromise(value, node) {
        let valueDeclar = value.getDeclaringStmt();
        if (value.getType() instanceof lib_1.UnknownType) {
            let unknownDeclar = value.getDeclaringStmt();
            if (unknownDeclar && unknownDeclar instanceof lib_1.ArkAssignStmt) {
                return this.isPromise(unknownDeclar.getRightOp(), this.getNode(node));
            }
        }
        else {
            return this.isPromiseType(value.getType()) || (valueDeclar instanceof lib_1.ArkAssignStmt && this.isPromise(valueDeclar.getRightOp(), node));
        }
        return false;
    }
    checkFieldRef(declarCls, value, node) {
        for (const field of declarCls?.getFields() ?? []) {
            if (field.getSignature().getFieldName() === value.getFieldSignature().getFieldName()) {
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
            if (declarCls && this.checkFieldRef(declarCls, value, node)) {
                return true;
            }
        }
        if (this.isPromiseArray(value.getBase(), node) && this.isNumericUsingIsNaN(value.getFieldSignature().getFieldName())) {
            return true;
        }
        return false;
    }
    isPromise(value, node) {
        // 创建缓存键
        const cacheKey = `isPromise_${value.toString().substring(0, 50)}_${node.pos}_${node.end}`;
        // 检查缓存
        if (this.statementCache.has(value.toString())) {
            return this.statementCache.get(value.toString()) ?? false;
        }
        if (this.promiseCache.has(cacheKey)) {
            return this.promiseCache.get(cacheKey) ?? false;
        }
        // 检查递归深度
        if (!this.checkAndIncreaseRecursion(cacheKey)) {
            this.decreaseRecursion(cacheKey);
            return false; // 递归太深，保守返回false
        }
        let result = false;
        try {
            result = this._determineIsPromise(value, node);
        }
        catch (e) {
            logger.error(`isPromise error: ${e}`);
            result = false;
        }
        // 保存到缓存
        this.promiseCache.set(cacheKey, result);
        this.statementCache.set(value.toString(), result);
        // 减少递归计数
        this.decreaseRecursion(cacheKey);
        return result;
    }
    _determineIsPromise(value, node) {
        // 快速判断
        if (this.isInVildNode(node)) {
            return false;
        }
        // 针对不同情况的处理
        if (lib_1.ts.isPropertyAccessExpression(node) &&
            lib_1.ts.isIdentifier(node.expression) &&
            targetClasses.includes(node.expression.text)) {
            return true;
        }
        if (value instanceof lib_1.Local && this.checkIsPromise(value, node)) {
            return true;
        }
        if (value instanceof lib_1.ArkInstanceFieldRef && this.checkFieldRefIsPromise(value, node)) {
            return true;
        }
        if (value instanceof lib_1.ArkStaticInvokeExpr) {
            return this._checkStaticInvokeExpr(value);
        }
        if (value instanceof lib_1.ArkNormalBinopExpr) {
            return this.isPromise(value.getOp1(), node) || this.isPromise(value.getOp2(), node);
        }
        if (value instanceof lib_1.ArkInstanceInvokeExpr) {
            return this.isPromise(value.getBase(), this.getNode(node));
        }
        if (value instanceof lib_1.ArkNewExpr) {
            return this.isPromiseType(value.getType());
        }
        if (value instanceof lib_1.ArkPtrInvokeExpr && this.checkPrtIsPromise(value)) {
            return true;
        }
        return false;
    }
    _checkStaticInvokeExpr(value) {
        const methodSignature = value.getMethodSignature().getMethodSubSignature();
        const arkMethod = this.globalArkCls.getMethodWithName(methodSignature.getMethodName());
        if (arkMethod?.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
            return true;
        }
        return this.isPromiseType(methodSignature.getReturnType());
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
    isPsArray(type, isArray = false) {
        // 创建缓存键
        const typeKey = this.getTypeKey(type);
        const cacheKey = `isPsArray_${typeKey}_${isArray}`;
        // 检查缓存
        if (this.promiseCache.has(cacheKey)) {
            return this.promiseCache.get(cacheKey);
        }
        // 检查递归深度
        if (!this.checkAndIncreaseRecursion(cacheKey)) {
            this.decreaseRecursion(cacheKey);
            return false; // 递归太深，保守返回false
        }
        // 检查类型是否已处理过
        if (this.processedTypes.has(typeKey)) {
            this.decreaseRecursion(cacheKey);
            return false;
        }
        this.processedTypes.add(typeKey);
        let result = false;
        try {
            result = this._determineIsPsArray(type, isArray);
        }
        catch (e) {
            logger.error(`isPsArray error: ${e}`);
            result = false;
        }
        // 移除处理标记
        this.processedTypes.delete(typeKey);
        // 缓存结果
        this.promiseCache.set(cacheKey, result);
        // 减少递归计数
        this.decreaseRecursion(cacheKey);
        return result;
    }
    _determineIsPsArray(type, isArray) {
        // 快速判断特定类型
        if (type instanceof lib_1.LiteralType || type instanceof lib_1.FunctionType) {
            return false;
        }
        // 处理数组类型
        if (type instanceof lib_1.ArrayType) {
            if (isArray) {
                return true;
            }
            return this.isPromiseType(type.getBaseType());
        }
        // 处理元组类型
        if (type instanceof lib_1.TupleType) {
            return this._checkTypesCollection(type.getTypes());
        }
        // 处理泛型类型
        if (type instanceof lib_1.GenericType) {
            return this._checkGenericPsArray(type, isArray);
        }
        // 处理联合类型
        if (type instanceof lib_1.UnionType) {
            return this._checkUnionPsArray(type, isArray);
        }
        // 处理别名类型
        if (type instanceof lib_1.AliasType) {
            return this._checkAliasPsArray(type, isArray);
        }
        // 处理交集类型
        if (type instanceof lib_1.IntersectionType) {
            return this._checkIntersectionPsArray(type, isArray);
        }
        // 处理不明确的引用类型
        if (type instanceof lib_1.UnclearReferenceType) {
            return this._checkUnclearReferencePsArray(type, isArray);
        }
        return false;
    }
    _checkGenericPsArray(type, isArray) {
        const constraint = type.getConstraint();
        if (!constraint) {
            return false;
        }
        const constraintKey = this.getTypeKey(constraint);
        if (this.processedTypes.has(constraintKey)) {
            return false;
        }
        return this.isPsArray(constraint, isArray);
    }
    _checkUnionPsArray(type, isArray) {
        return type.getTypes().some(t => {
            const tKey = this.getTypeKey(t);
            if (this.processedTypes.has(tKey)) {
                return false;
            }
            return this.isPsArray(t, isArray);
        });
    }
    _checkAliasPsArray(type, isArray) {
        const origTypeKey = this.getTypeKey(type.getOriginalType());
        if (this.processedTypes.has(origTypeKey)) {
            return false;
        }
        return this.isPsArray(type.getOriginalType(), isArray);
    }
    _checkIntersectionPsArray(type, isArray) {
        return type.getTypes().some(t => {
            const tKey = this.getTypeKey(t);
            if (this.processedTypes.has(tKey)) {
                return false;
            }
            return this.isPsArray(t, isArray);
        });
    }
    _checkUnclearReferencePsArray(type, isArray) {
        if (type.getName() !== 'Array') {
            return false;
        }
        if (isArray) {
            return true;
        }
        return type.getGenericTypes().some(t => {
            const tKey = this.getTypeKey(t);
            if (this.processedTypes.has(tKey)) {
                return false;
            }
            return this.isPromiseType(t);
        });
    }
    typesIsPromiseArray(types) {
        return types.some(ty => {
            if (ty instanceof lib_1.ArrayType) {
                return this.isPsArray(ty.getBaseType());
            }
            if (ty instanceof lib_1.GenericType) {
                let baseConstraint = ty.getConstraint();
                if (baseConstraint !== undefined && baseConstraint instanceof lib_1.UnclearReferenceType && baseConstraint.getName() === 'Array') {
                    return baseConstraint.getGenericTypes().some(t => this.isPsArray(t));
                }
            }
            return false;
        });
    }
    isPromiseArray(stmt, node) {
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            let leftOp = stmt.getLeftOp();
            if ([rightOp, leftOp].some(op => this.isPsArray(op.getType()))) {
                return true;
            }
            if (leftOp instanceof lib_1.ArkArrayRef && this.isPromise(rightOp, node)) {
                return true;
            }
            if (rightOp instanceof lib_1.ArkInstanceFieldRef &&
                rightOp.getBase() instanceof lib_1.Local &&
                this.isNumericUsingIsNaN(rightOp.getFieldSignature().getFieldName())) {
                let baseType = rightOp.getBase().getType();
                let tys = [baseType];
                if (baseType instanceof lib_1.UnionType) {
                    tys = baseType.getTypes();
                }
                if (this.typesIsPromiseArray(tys)) {
                    return true;
                }
            }
        }
        if (stmt instanceof lib_1.ArkStaticInvokeExpr) {
            return this.isPsArray(stmt.getMethodSignature().getMethodSubSignature().getReturnType());
        }
        if (stmt instanceof lib_1.ArkInstanceInvokeExpr) {
            let methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
            if (stmt.getBase().getType() instanceof lib_1.ArrayType &&
                methodName === 'map' &&
                stmt.getArgs().some(arg => this.isPromise(arg, node))) {
                return true;
            }
        }
        if (stmt instanceof lib_1.Local) {
            let tys = [stmt.getType()];
            if (tys[0] instanceof lib_1.UnionType) {
                tys = tys[0].getTypes();
            }
            if (tys.some(type => this.isPsArray(type))) {
                return true;
            }
        }
        return false;
    }
    getNode(node) {
        if (lib_1.ts.isCallExpression(node) || lib_1.ts.isPropertyAccessExpression(node)) {
            return node.expression;
        }
        return node;
    }
    isNumericUsingIsNaN(str) {
        return !isNaN(Number(str)) && isFinite(Number(str));
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
    isPromiseType(type) {
        // 检查缓存
        if (this.statementCache.has(type.toString())) {
            return this.statementCache.get(type.toString());
        }
        const typeKey = this.getTypeKey(type);
        if (this.promiseTypeCache.has(typeKey)) {
            return this.promiseTypeCache.get(typeKey);
        }
        // 检查递归深度
        if (!this.checkAndIncreaseRecursion(typeKey)) {
            this.decreaseRecursion(typeKey);
            return false; // 递归太深，保守返回false
        }
        // 检查类型是否已经处理过，避免循环引用导致递归栈溢出
        if (this.processedTypes.has(typeKey)) {
            this.decreaseRecursion(typeKey);
            return false;
        }
        // 标记为正在处理
        this.processedTypes.add(typeKey);
        let result = false;
        try {
            result = this._determinePromiseType(type, typeKey);
        }
        catch (e) {
            logger.error(`isPromiseType error: ${e}`);
            result = false;
        }
        // 结束处理，移除标记
        this.processedTypes.delete(typeKey);
        // 保存到缓存
        this.statementCache.set(type.toString(), result);
        this.promiseTypeCache.set(typeKey, result);
        // 减少递归计数
        this.decreaseRecursion(typeKey);
        return result;
    }
    _determinePromiseType(type, typeKey) {
        // 快速处理简单类型
        if (type instanceof lib_1.LiteralType) {
            return false;
        }
        // 处理不同类型的具体逻辑
        if (type instanceof lib_1.ClassType) {
            return this.checkIsPromiseCls(type);
        }
        if (type instanceof lib_1.TupleType) {
            return this._checkTupleType(type);
        }
        if (type instanceof lib_1.FunctionType) {
            return this._checkFunctionType(type);
        }
        if (type instanceof lib_1.UnclearReferenceType) {
            return targetClasses.includes(type.getName());
        }
        if (type instanceof lib_1.IntersectionType) {
            return this._checkTypesCollection(type.getTypes());
        }
        if (type instanceof lib_1.AliasType) {
            return this._checkAliasType(type);
        }
        if (type instanceof lib_1.UnionType) {
            return this._checkTypesCollection(type.getTypes());
        }
        return false;
    }
    _checkTypesCollection(types) {
        for (const t of types) {
            const tKey = this.getTypeKey(t);
            if (this.processedTypes.has(tKey)) {
                continue;
            }
            if (this.isPromiseType(t)) {
                return true;
            }
        }
        return false;
    }
    _checkTupleType(type) {
        return this._checkTypesCollection(type.getTypes());
    }
    _checkAliasType(type) {
        const origTypeKey = this.getTypeKey(type.getOriginalType());
        if (this.processedTypes.has(origTypeKey)) {
            return false;
        }
        return this.isPromiseType(type.getOriginalType());
    }
    _checkFunctionType(type) {
        const methodName = type.getMethodSignature().getMethodSubSignature().getMethodName();
        const arkMethod = this.globalArkCls.getMethodWithName(methodName);
        if (!this.useMethods.includes(methodName)) {
            this.useMethods.push(methodName);
        }
        // 异步方法直接返回true
        if (arkMethod?.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
            return true;
        }
        const returnType = arkMethod?.getSignature().getMethodSubSignature().getReturnType();
        if (!returnType) {
            return false;
        }
        // 处理未知类型
        if (returnType instanceof lib_1.UnknownType) {
            return !!arkMethod?.getBodyBuilder()?.getGlobals()?.has('Promise');
        }
        const rtKey = this.getTypeKey(returnType);
        if (this.processedTypes.has(rtKey)) {
            return false;
        }
        return this.isPromiseType(returnType);
    }
    isPromiseLike(value, node) {
        if (value instanceof lib_1.ArkAssignStmt) {
            return this.isPromise(value.getRightOp(), this.getNode(node)) || this.isPromise(value.getLeftOp(), this.getNode(node));
        }
        if (value instanceof lib_1.ArkInvokeStmt) {
            return this.isPromise(value.getInvokeExpr(), this.getNode(node));
        }
        if (value instanceof lib_1.Local || value instanceof lib_1.AbstractExpr) {
            return this.isPromise(value, this.getNode(node));
        }
        //使用底座推到变量类型
        return false;
    }
    checkMethod = (method) => {
        method.getCfg()?.getStmts().forEach(stmt => {
            this.checkStmt(stmt);
        });
    };
    checkClass = (cls) => {
        this.useMethods = [];
        this.globalArkCls = cls;
        // 每次处理新类时重置缓存
        this.resetCaches();
        cls.getMethods().forEach(method => {
            if (this.useMethods.includes(method.getSignature().getMethodSubSignature().getMethodName())) {
                return;
            }
            this.checkMethod(method);
        });
    };
    checkStmt = (stmt) => {
        if (!stmt.getOriginalText()) {
            return;
        }
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp().getType();
            if (rightOp instanceof lib_1.NumberType) {
                return;
            }
        }
        let pos = this.checkExpr(stmt, this.getOption());
        if (pos.line !== 0 && pos.colum !== 0) {
            this.errorPositions.push(pos);
        }
    };
    check = (target) => {
        this.statementCache.clear();
        this.globalArkFile = target;
        // 每次处理新文件时完全重置缓存
        this.resetCaches();
        target.getClasses().forEach(cls => {
            this.checkClass(cls);
        });
        // 对 errorPositions 进行排序
        this.errorPositions.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line; // 先按行号排序
            }
            return a.colum - b.colum; // 行号相同时按列号排序
        });
        this.errorPositions.forEach(position => {
            this.addIssueReport(target, position.line, position.colum, position.sourceCode, position.message);
        });
    };
    addIssueReport(arkFile, lineNum, startColum, code, messageId) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let message = this.metaData.messages[messageId];
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoFloatingPromisesCheck = NoFloatingPromisesCheck;
