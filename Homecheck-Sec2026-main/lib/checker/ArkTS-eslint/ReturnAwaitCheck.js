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
exports.ReturnAwaitCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ReturnAwaitCheck');
class ReturnAwaitCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/return-await.md',
        description: 'Enforce consistent returning of awaited values.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    defaultOptions = ['in-try-catch'];
    promiseTypeCache = new Map();
    ancestorCache = new Map();
    asyncFunctions = [];
    returnStatements = new Map();
    declarationCache = new Map();
    tryStmts = [];
    catchStmts = [];
    norStmts = [];
    filePath = '';
    sourceFile;
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        this.resetCheckerState(target);
        this.processClassMethods(target);
        this.collectAllAsyncFunctions();
        this.analyzeAllAsyncFunctions();
    };
    // 提取的初始化方法
    resetCheckerState(target) {
        this.promiseTypeCache.clear();
        this.ancestorCache.clear();
        this.asyncFunctions = [];
        this.returnStatements.clear();
        this.declarationCache.clear();
        this.filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.sourceFile = sourceFile;
    }
    // 提取的类处理方法
    processClassMethods(target) {
        target.getClasses().forEach(clazz => {
            clazz.getMethods().forEach(method => {
                this.processMethodStatements(method);
            });
        });
    }
    // 提取的方法语句处理
    processMethodStatements(method) {
        const stmts = method?.getBody()?.getCfg().getStmts() ?? [];
        stmts.forEach(stmt => {
            if (stmt !== undefined) {
                this.norStmts.push(stmt);
            }
        });
        method?.getBody()?.getTraps()?.forEach(trap => {
            const tryBlocks = trap.getTryBlocks();
            const catchBlocks = trap.getCatchBlocks();
            tryBlocks?.forEach(tryBlock => {
                this.tryStmts.push(...tryBlock.getStmts());
            });
            catchBlocks?.forEach(catchBlock => this.catchStmts.push(...catchBlock.getStmts()));
        });
    }
    // 提取的异步函数收集
    collectAllAsyncFunctions() {
        this.collectAsyncFunctions(this.sourceFile);
        this.collectDeclarations(this.sourceFile);
        this.collectReturnStatements();
    }
    // 提取的异步函数分析
    analyzeAllAsyncFunctions() {
        this.asyncFunctions.forEach(node => {
            this.analyzeFunction(node, this.filePath);
        });
    }
    collectAsyncFunctions(sourceFile) {
        const visit = (node) => {
            // 新增变量声明检测
            if (lib_1.ts.isVariableDeclaration(node) &&
                node.initializer &&
                lib_1.ts.isArrowFunction(node.initializer) &&
                node.initializer.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
                this.asyncFunctions.push(node.initializer);
            }
            if ((lib_1.ts.isFunctionDeclaration(node) ||
                lib_1.ts.isArrowFunction(node) ||
                lib_1.ts.isMethodDeclaration(node)) &&
                node.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.AsyncKeyword)) {
                this.asyncFunctions.push(node);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(sourceFile, visit);
    }
    collectDeclarations(node) {
        if (lib_1.ts.isVariableDeclaration(node) && lib_1.ts.isIdentifier(node.name)) {
            this.declarationCache.set(node.name.text, node);
        }
        lib_1.ts.forEachChild(node, child => this.collectDeclarations(child));
    }
    collectReturnStatements() {
        this.asyncFunctions.forEach(funcNode => {
            const returns = [];
            const visit = (node) => {
                // 新增嵌套函数过滤逻辑
                if (lib_1.ts.isFunctionLike(node) && node !== funcNode) {
                    return;
                }
                if (lib_1.ts.isReturnStatement(node) && node.expression) {
                    returns.push(node);
                }
                if (lib_1.ts.isArrowFunction(funcNode) &&
                    !lib_1.ts.isBlock(funcNode.body) &&
                    node === funcNode.body) {
                    const virtualReturn = lib_1.ts.factory.createReturnStatement(node);
                    returns.push(virtualReturn);
                }
                lib_1.ts.forEachChild(node, visit);
            };
            lib_1.ts.forEachChild(funcNode, visit);
            this.returnStatements.set(funcNode, returns);
        });
    }
    analyzeFunction(funcNode, filePath) {
        const returns = this.returnStatements.get(funcNode) || [];
        returns.forEach(node => {
            if (node.expression) {
                this.testReturnStatement(node.expression, filePath);
            }
        });
    }
    containsAwait(node) {
        if (lib_1.ts.isAwaitExpression(node)) {
            return true;
        }
        // 递归检查子节点
        let found = false;
        lib_1.ts.forEachChild(node, child => {
            if (this.containsAwait(child)) {
                found = true;
            }
        });
        return found;
    }
    testReturnStatement(expression, filePath) {
        let child;
        const isAwait = lib_1.ts.isAwaitExpression(expression);
        if (isAwait) {
            child = expression.expression;
        }
        else {
            child = expression;
        }
        let isFalseBranch = false;
        let isThenable = false;
        if (this.isPromiseType(child) instanceof Object) {
            let promiseObj = this.isPromiseType(child);
            isThenable = promiseObj.isPromise;
            isFalseBranch = promiseObj.isFalseBranch;
        }
        else {
            isThenable = this.isPromiseType(child);
        }
        if (!isAwait && !isThenable) {
            return;
        }
        if (isAwait && !isThenable) {
            this.reportIssue(expression, filePath, 'nonPromiseAwait', 'not-in-try-catch', isFalseBranch);
            return;
        }
        if (this.defaultOptions[0] === 'never' || (this.defaultOptions[0] === 'in-try-catch' && !this.isInTryCatch(expression))) {
            if (isAwait) {
                this.reportIssue(expression, filePath, 'disallowedPromiseAwait', 'not-in-try-catch', isFalseBranch);
                return;
            }
        }
        if (this.defaultOptions[0] === 'always') {
            this.alwaysOption(expression, isAwait, isThenable, filePath, isFalseBranch);
        }
        if (this.defaultOptions[0] === 'never') {
            this.NeverOption(expression, isAwait, isThenable, filePath, isFalseBranch);
        }
        if (this.defaultOptions[0] === 'in-try-catch') {
            this.inTryCatch(expression, isAwait, isThenable, filePath, isFalseBranch);
        }
    }
    alwaysOption(expression, isAwait, isThenable, filePath, isFalseBranch) {
        if (!isAwait && isThenable) {
            this.reportIssue(expression, filePath, 'requiredPromiseAwait', 'always-fix', isFalseBranch);
        }
        return;
    }
    NeverOption(expression, isAwait, isThenable, filePath, isFalseBranch) {
        if (isAwait) {
            this.reportIssue(expression, filePath, 'disallowedPromiseAwait', 'not-in-try-catch', isFalseBranch);
        }
    }
    inTryCatch(expression, isAwait, isThenable, filePath, isFalseBranch) {
        const isInTry = this.inTry(expression);
        const isInCatch = this.inCatch(expression);
        const isInFinally = this.isReturnPromiseInFinally(expression);
        const hasFinally = this.hasFinallyBlock(expression);
        if (isInTry && isThenable && !isAwait) {
            this.reportIssue(expression, filePath, 'requiredPromiseAwait', 'in-try-catch', isFalseBranch);
            return;
        }
        if (isInCatch && !hasFinally) {
            return;
        }
        if (isInCatch && hasFinally && isThenable && !isAwait) {
            this.reportIssue(expression, filePath, 'requiredPromiseAwait', 'in-try-catch', isFalseBranch);
            return;
        }
        if (isInFinally) {
            return;
        }
    }
    isInTryCatch(expression) {
        const isInTry = this.inTry(expression);
        const isInCatch = this.inCatch(expression);
        const isInFinally = this.isReturnPromiseInFinally(expression);
        return isInTry || isInCatch || isInFinally;
    }
    isPromiseType(node, stmtAwait) {
        let isPromise = false;
        let pos = lib_1.ts.getLineAndCharacterOfPosition(this.sourceFile, node.getStart());
        this.norStmts.forEach(stmt => {
            if (stmt.getOriginPositionInfo().getLineNo() === pos.line + 1) {
                stmtAwait = stmt;
            }
        });
        this.tryStmts.forEach(stmt => {
            if (stmt.getOriginPositionInfo().getLineNo() === pos.line + 1) {
                stmtAwait = stmt;
            }
        });
        this.catchStmts.forEach(stmt => {
            if (stmt.getOriginPositionInfo().getLineNo() === pos.line + 1) {
                stmtAwait = stmt;
            }
        });
        if (stmtAwait instanceof lib_1.ArkReturnStmt) {
            isPromise = this.isVarReturnPro(stmtAwait);
        }
        return isPromise;
    }
    isVarReturnPro(stmt) {
        if (!(stmt instanceof lib_1.ArkReturnStmt)) {
            return false;
        }
        const op = stmt.getOp();
        // 修改返回值结构以包含分支信息
        const ternaryResult = this.checkTernary(stmt);
        if (ternaryResult.isTernary) {
            return {
                isPromise: true,
                isFalseBranch: ternaryResult.isFalseBranch
            };
        }
        return this.checkLocalReturn(op) || this.checkAwaitReturn(op) || this.checkMethodType(op);
    }
    checkTernary(stmt) {
        let typeString = '';
        let isTernary = false;
        let isFalseBranch = false;
        if (stmt instanceof lib_1.ArkReturnStmt) {
            stmt.getCfg().getBlocks().forEach(block => {
                let predecessor = block.getPredecessors();
                typeString = this.TernayString(predecessor);
                if (typeString.includes('Promise<')) {
                    isTernary = true;
                    isFalseBranch = true;
                }
            });
        }
        return { isTernary, isFalseBranch };
    }
    TernayString(blocks) {
        let ternaryString = '';
        if (blocks.length === 2) {
            blocks.forEach(pre => {
                let stmts = pre.getStmts();
                if (stmts.length === 1) {
                    let stmt = stmts[0];
                    ternaryString = this.getTernayString(stmt);
                }
            });
        }
        return ternaryString;
    }
    getTernayString(stmt) {
        let ternaryString = '';
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let right = stmt.getRightOp();
            if (right instanceof lib_1.ArkInstanceInvokeExpr) {
                let base = right.getBase();
                if (base instanceof lib_1.Local) {
                    ternaryString = base.getType().getTypeString();
                }
            }
        }
        return ternaryString;
    }
    checkMethodType(op) {
        if (!(op instanceof lib_1.Local)) {
            return false;
        }
        const methods = this.getRelatedMethods(op);
        return this.checkMethodModifier(methods, op);
    }
    getRelatedMethods(op) {
        const declarer = op.getDeclaringStmt();
        return declarer?.getCfg()?.getDeclaringMethod()
            ?.getDeclaringArkClass()?.getMethods() || [];
    }
    checkMethodModifier(methods, op) {
        const declarer = op.getDeclaringStmt();
        if (!(declarer instanceof lib_1.ArkAssignStmt)) {
            return false;
        }
        const rightOp = declarer.getRightOp();
        if (!(rightOp instanceof lib_1.ArkStaticInvokeExpr)) {
            return false;
        }
        const targetMethodName = rightOp.getMethodSignature()
            .getMethodSubSignature().getMethodName();
        return methods.some(method => method.getName() === targetMethodName &&
            method.getModifiers() === 64);
    }
    checkLocalReturn(op) {
        if (!(op instanceof lib_1.Local)) {
            return false;
        }
        const declear = op.getDeclaringStmt();
        return declear
            ? this.getDlears(declear).includes('Promise<T>')
            : false;
    }
    checkAwaitReturn(op) {
        if (!(op instanceof lib_1.ArkAwaitExpr)) {
            return false;
        }
        const promise = op.getPromise();
        if (!(promise instanceof lib_1.Local)) {
            return false;
        }
        const declear = promise.getDeclaringStmt();
        return declear
            ? this.getDlears(declear).includes('Promise<')
            : false;
    }
    getDlears(declare, depth = 0) {
        // 添加递归深度限制
        if (declare instanceof lib_1.ArkAssignStmt) {
            const right = declare.getRightOp();
            return this.handleExpressionType(right, depth);
        }
        return 'unknown';
    }
    handleExpressionType(expr, depth) {
        if (expr instanceof lib_1.ArkInstanceInvokeExpr) {
            return this.handleInstanceInvoke(expr);
        }
        if (expr instanceof lib_1.ArkPtrInvokeExpr) {
            return this.handlePtrInvoke(expr);
        }
        if (expr instanceof lib_1.ArkStaticInvokeExpr) {
            return this.handleStaticInvoke(expr);
        }
        if (expr instanceof lib_1.Local) {
            return this.handleLocal(expr, depth);
        }
        return 'unknown';
    }
    handleInstanceInvoke(expr) {
        const base = expr.getBase();
        let typeString = '';
        if (base.getName() === 'this') {
            typeString = expr.getMethodSignature().getMethodSubSignature().getReturnType().getTypeString();
        }
        else {
            typeString = base.getType().getTypeString();
        }
        if (base instanceof lib_1.Local) {
            let declaringStmt = base.getDeclaringStmt();
            if (declaringStmt) {
                typeString = this.handleArkAssignStmt(declaringStmt);
            }
        }
        return typeString;
    }
    handleArkAssignStmt(declaringStmt) {
        let typeString = '';
        if (declaringStmt instanceof lib_1.ArkAssignStmt) {
            const right = declaringStmt.getRightOp();
            if (right instanceof lib_1.ArkInstanceInvokeExpr) {
                let base = right.getBase();
                if (base instanceof lib_1.Local) {
                    typeString = base.getType().getTypeString();
                }
            }
        }
        return typeString;
    }
    handlePtrInvoke(expr) {
        const funcPtr = expr.getFuncPtrLocal();
        if (!(funcPtr instanceof lib_1.Local)) {
            return 'unknown';
        }
        const funcType = funcPtr.getType();
        return funcType instanceof lib_1.FunctionType
            ? funcType.getMethodSignature().getMethodSubSignature().getReturnType().getTypeString()
            : 'unknown';
    }
    handleStaticInvoke(expr) {
        return expr.getMethodSignature().getMethodSubSignature().getReturnType().getTypeString();
    }
    handleLocal(expr, depth) {
        const declaringStmt = expr.getDeclaringStmt();
        return declaringStmt ? this.getDlears(declaringStmt, depth + 1) : 'unknown';
    }
    checkAncestor(node, type, predicate) {
        const cacheKey = `${type}_${node.pos}_${node.end}`;
        if (this.ancestorCache.has(cacheKey)) {
            return this.ancestorCache.get(cacheKey);
        }
        let ancestor = node.parent;
        let depth = 0;
        const MAX_DEPTH = 10;
        while (ancestor && !lib_1.ts.isFunctionLike(ancestor) && depth < MAX_DEPTH) {
            if (predicate(ancestor)) {
                this.ancestorCache.set(cacheKey, true);
                return true;
            }
            ancestor = ancestor.parent;
            depth++;
        }
        this.ancestorCache.set(cacheKey, false);
        return false;
    }
    inTry(node) {
        return this.checkAncestor(node, 'try', ancestor => lib_1.ts.isTryStatement(ancestor.parent) &&
            lib_1.ts.isBlock(ancestor) &&
            ancestor.parent.tryBlock === ancestor);
    }
    inCatch(node) {
        return this.checkAncestor(node, 'catch', ancestor => lib_1.ts.isCatchClause(ancestor.parent) &&
            lib_1.ts.isBlock(ancestor) &&
            ancestor.parent.block === ancestor);
    }
    hasFinallyBlock(node) {
        return this.checkAncestor(node, 'finally', ancestor => lib_1.ts.isTryStatement(ancestor) && !!ancestor.finallyBlock);
    }
    isReturnPromiseInFinally(node) {
        return this.checkAncestor(node, 'finallyReturn', ancestor => lib_1.ts.isTryStatement(ancestor.parent) &&
            lib_1.ts.isBlock(ancestor) &&
            ancestor.parent.end === ancestor.end);
    }
    ruleFix(sourceFile, loc) {
        const startPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol - 1);
        if (loc.testObjectText === undefined) {
            return { range: [startPosition, startPosition], text: '' };
        }
        if (loc.returnString === 'in-try-catch') {
            let fixText = `await ${loc.testObjectText}`;
            return { range: [startPosition, startPosition + loc.testObjectText?.length], text: fixText };
        }
        if (loc.returnString === 'not-in-try-catch') {
            const originalText = loc.testObjectText || '';
            const fixedText = this.removeFirstAwait(originalText);
            return { range: [startPosition, startPosition + loc.testObjectText?.length], text: fixedText };
        }
        if (loc.returnString === 'always-fix') {
            let fixText = `await ${loc.testObjectText}`;
            return { range: [startPosition, startPosition + loc.testObjectText?.length], text: fixText };
        }
        return { range: [startPosition, startPosition], text: '' };
    }
    removeFirstAwait(str) {
        // 使用正则表达式匹配 await 关键字及后续空格
        const awaitPattern = /\bawait\s+/;
        const match = str.match(awaitPattern);
        if (!match) {
            return str;
        }
        // 计算需要替换的起始位置和长度
        const startIndex = str.indexOf(match[0]);
        const replaceLength = match[0].length;
        return str.substring(0, startIndex) +
            str.substring(startIndex + replaceLength);
    }
    reportIssue(node, filePath, messageId, returnString, isFalseBranch) {
        // 处理三元表达式的情况
        let targetNode = node;
        if (lib_1.ts.isConditionalExpression(node) && isFalseBranch) {
            // 获取三元表达式的 false 分支（: 后面的部分）
            targetNode = node.whenFalse;
        }
        else if (lib_1.ts.isConditionalExpression(node) && !isFalseBranch) {
            targetNode = node.whenTrue;
        }
        const pos = lib_1.ts.getLineAndCharacterOfPosition(this.sourceFile, targetNode.getStart());
        const endPos = lib_1.ts.getLineAndCharacterOfPosition(this.sourceFile, targetNode.getEnd());
        const description = this.getMessageDescription(messageId);
        let loc = {
            line: pos.line + 1,
            character: pos.character + 1,
            startCol: pos.character + 1,
            endCol: endPos.character + 1,
            returnString: returnString,
            testObjectText: targetNode.getText()
        };
        const defect = new Defects_1.Defects(loc.line, loc.character, loc.endCol, description, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(this.sourceFile, loc);
        this.issues.push(new Defects_2.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getMessageDescription(messageId) {
        switch (messageId) {
            case 'nonPromiseAwait':
                return 'Returning an awaited value that is not a promise is not allowed.';
            case 'disallowedPromiseAwait':
                return 'Returning an awaited promise is not allowed in this context.';
            case 'requiredPromiseAwait':
                return 'Returning an awaited promise is required in this context.';
            default:
                return 'Unknown issue with return statement.';
        }
    }
}
exports.ReturnAwaitCheck = ReturnAwaitCheck;
