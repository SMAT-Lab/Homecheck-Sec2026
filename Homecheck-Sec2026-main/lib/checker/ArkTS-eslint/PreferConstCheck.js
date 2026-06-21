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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferConstCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
class Scope {
    parent;
    variables = new Map();
    type;
    loopDepth = 0;
    isClassStaticBlock = false;
    constructor(parent, type = 'block') {
        this.parent = parent;
        this.type = type;
        this.loopDepth = parent?.loopDepth || 0;
    }
    ;
    getVariable(name) {
        return this.variables.get(name) ?? this.parent?.getVariable(name);
    }
    ;
    isVariableInCurrentScope(name) {
        return this.variables.has(name);
    }
    ;
    isWithinFunctionOf(targetScope) {
        let current = this;
        while (current) {
            if (current === targetScope) {
                return true;
            }
            ;
            // 遇到函数作用域时停止向上查找（利用 type 属性）
            if (current.type === 'function') {
                return false;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    }
    ;
}
class Variable {
    name;
    declarations = [];
    references = [];
    scope;
    declaredAt; // 新增字段
    constructor(name, scope, declaredAt) {
        this.name = name;
        this.scope = scope;
        this.declaredAt = declaredAt;
    }
    ;
    addReference(ref) {
        this.references.push(ref);
    }
    ;
}
class Reference {
    isWrite;
    read;
    node;
    isInitial;
    scope;
    meta;
    // 新增字段：关联的声明节点（用于溯源初始化状态）
    declarationNode;
    constructor(node, isWrite, isInitial = false, scope, meta, declarationNode) {
        this.node = node;
        this.isWrite = isWrite;
        this.read = !isWrite;
        this.isInitial = isInitial;
        this.scope = scope;
        this.meta = {
            isCrossScope: meta?.isCrossScope || false,
            patternDepth: meta?.patternDepth || 0,
            inClassStaticBlock: scope.isClassStaticBlock,
            inParenthesis: meta?.inParenthesis || false,
            isInitializerRead: meta?.isInitializerRead,
            isAccess: meta?.isAccess || false,
            isInCondition: meta?.isInCondition || false,
            isConditionalWrite: meta?.isConditionalWrite || false,
            isConstructorCall: meta?.isConstructorCall || false
        };
        this.declarationNode = declarationNode;
    }
    ;
}
class PreferConstCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/prefer-const.md',
        description: 'Require `const` declarations for variables that are never reassigned after declared.'
    };
    defaultOptions = [{
            destructuring: 'any',
            ignoreReadBeforeAssign: false
        }];
    config = {
        destructuring: 'any',
        ignoreReadBeforeAssign: false
    };
    rule;
    defects = [];
    issues = [];
    scopeStack = [];
    ast;
    currentArkFile;
    fileMatcher = { matcherType: Matchers_1.MatcherTypes.FILE };
    loopStack = [];
    currentLoopParts = [];
    allLoopContexts = [];
    currentScope() {
        return this.scopeStack[this.scopeStack.length - 1];
    }
    ;
    enterScope(type) {
        const newScope = new Scope(this.currentScope(), type);
        newScope.loopDepth = this.currentScope()?.loopDepth || 0;
        this.scopeStack.push(newScope);
    }
    ;
    exitScope() {
        if (this.scopeStack.length > 1) {
            const exitedScope = this.scopeStack.pop();
            exitedScope?.variables.forEach(variable => {
                if (!this.isReassigned(variable)) {
                    this.reportConstSuggestion(variable);
                }
                ;
            });
        }
        ;
    }
    ;
    enterLoop() {
        const currentScope = this.currentScope();
        currentScope.loopDepth++;
        this.loopStack.push(currentScope);
    }
    ;
    exitLoop() {
        const exited = this.loopStack.pop();
        if (exited) {
            exited.loopDepth--;
        }
        ;
    }
    ;
    enterLoopPart(part) {
        this.currentLoopParts.push(part);
    }
    ;
    exitLoopPart() {
        this.currentLoopParts.pop();
    }
    ;
    registerMatchers() {
        return [{
                matcher: this.fileMatcher,
                callback: this.check,
            }];
    }
    ;
    parseConfig() {
        this.defaultOptions = this.rule?.option?.[0] ? this.rule.option : this.defaultOptions;
        this.config.destructuring = this.defaultOptions[0].destructuring || 'any';
        this.config.ignoreReadBeforeAssign = this.defaultOptions[0].ignoreReadBeforeAssign || false;
    }
    ;
    check = (target) => {
        this.parseConfig();
        if (target instanceof lib_1.ArkFile) {
            this.checkPreferConst(target);
            this.issues.sort((a, b) => a.defect.reportLine - b.defect.reportLine || a.defect.reportColumn - b.defect.reportColumn);
            this.issues.forEach(issue => DefectsList_1.RuleListUtil.push(issue.defect));
        }
        ;
    };
    checkPreferConst(arkFile) {
        this.currentArkFile = arkFile;
        this.ast = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.scopeStack = [new Scope(undefined, 'global')];
        const visitors = {
            enter: (node) => {
                this.enter(node);
            },
            leave: (node) => {
                this.leave(node);
            },
            visitVariableDeclaration: (node) => {
                this.visitVariableDeclaration(node);
            },
            visitBinaryExpression: (node) => {
                this.visitBinaryExpression(node);
            },
            visitPrefixUnaryExpression: (node) => {
                if ([lib_1.ts.SyntaxKind.PlusPlusToken, lib_1.ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
                    this.processAssignment(node.operand);
                }
            },
            visitPostfixUnaryExpression: (node) => {
                if ([lib_1.ts.SyntaxKind.PlusPlusToken, lib_1.ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
                    this.processAssignment(node.operand);
                }
            },
            visitForStatement: (node) => {
                this.visitForStatement(node, visitors);
            },
            visitForOfStatement: (node) => {
                this.visitForOfStatement(node, visitors);
            },
            visitForInStatement: (node) => {
                this.visitForInStatement(node, visitors);
            }
        };
        this.walkNodes(this.ast, visitors);
        const globalScope = this.scopeStack[0];
        globalScope?.variables.forEach(variable => {
            if (!this.isReassigned(variable)) {
                this.reportConstSuggestion(variable);
            }
            ;
        });
    }
    enter(node) {
        if (lib_1.ts.isSwitchStatement(node)) {
            // 为 switch 语句创建新的块级作用域
            this.enterScope('block');
        }
        if (lib_1.ts.isClassStaticBlockDeclaration(node)) {
            this.enterScope('block');
            this.currentScope().isClassStaticBlock = true;
        }
        ;
        if (lib_1.ts.isBlock(node) || lib_1.ts.isFunctionLike(node)) {
            this.enterScope('block');
        }
        ;
    }
    leave(node) {
        if (lib_1.ts.isForOfStatement(node) || lib_1.ts.isForInStatement(node)) {
            const exitedScope = this.currentScope();
            this.exitScope();
            exitedScope?.variables.forEach(variable => {
                if (!this.isReassigned(variable)) {
                    this.reportConstSuggestion(variable);
                }
                ;
            });
        }
        ;
        if (lib_1.ts.isSwitchStatement(node)) {
            // 退出 switch 的作用域并分析变量
            const exitedScope = this.currentScope();
            this.exitScope();
            exitedScope?.variables.forEach(variable => {
                if (!this.isReassigned(variable)) {
                    this.reportConstSuggestion(variable);
                }
            });
        }
        if (lib_1.ts.isClassStaticBlockDeclaration(node)) {
            const exitedScope = this.currentScope();
            this.exitScope();
            // 处理静态块作用域内的变量
            exitedScope?.variables.forEach(variable => {
                if (!this.isReassigned(variable)) {
                    this.reportConstSuggestion(variable);
                }
                ;
            });
        }
        ;
        if (lib_1.ts.isBlock(node) || lib_1.ts.isFunctionLike(node)) {
            const exitedScope = this.currentScope();
            this.exitScope();
            exitedScope?.variables.forEach(variable => {
                if (!this.isReassigned(variable)) {
                    this.reportConstSuggestion(variable);
                }
                ;
            });
        }
        ;
    }
    visitVariableDeclaration(node) {
        const declarationList = node.parent;
        const keywordToken = declarationList.getChildren().find(child => lib_1.ts.isToken(child) && [lib_1.ts.SyntaxKind.LetKeyword, lib_1.ts.SyntaxKind.ConstKeyword, lib_1.ts.SyntaxKind.VarKeyword].includes(child.kind));
        if (keywordToken?.kind === lib_1.ts.SyntaxKind.LetKeyword) {
            this.processLetDeclaration(node);
        }
        else if (keywordToken?.kind === lib_1.ts.SyntaxKind.VarKeyword) {
            this.processVarDeclaration(node);
        }
        ;
    }
    visitBinaryExpression(node) {
        if (node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
            // 检测整个赋值表达式是否被括号包裹
            let current = node;
            let hasParenthesis = false;
            while (lib_1.ts.isParenthesizedExpression(current.parent) && (lib_1.ts.isBlock(current.parent.parent.parent) &&
                !lib_1.ts.isClassStaticBlockDeclaration(current.parent.parent.parent.parent))) {
                current = current.parent;
                hasParenthesis = true;
            }
            ;
            // 将括号状态传入processAssignment
            this.processAssignment(node.left, hasParenthesis); // 注意传递node.left
        }
        ;
    }
    visitForStatement(node, visitors) {
        this.enterLoop();
        try {
            if (node.initializer) {
                this.enterLoopPart('initializer');
                this.enterScope('block');
                this.walkNodes(node.initializer, visitors);
                this.exitScope();
                this.exitLoopPart();
            }
            ;
            if (node.condition) {
                this.enterLoopPart('condition');
                this.walkNodes(node.condition, visitors);
                this.exitLoopPart();
            }
            ;
            if (node.incrementor) {
                this.enterLoopPart('incrementor');
                this.walkNodes(node.incrementor, visitors);
                this.exitLoopPart();
            }
            ;
            this.enterLoopPart('body');
            this.enterScope('block');
            this.walkNodes(node.statement, visitors);
            this.exitScope();
            this.exitLoopPart();
        }
        finally {
            this.exitLoop();
        }
        ;
    }
    visitForOfStatement(node, visitors) {
        this.enterLoop();
        try {
            // 关键修改：为整个循环创建独立作用域
            this.enterScope('block');
            // 处理迭代表达式
            this.enterLoopPart('initializer');
            this.walkNodes(node.expression, visitors);
            this.exitLoopPart();
            // 处理 initializer（如 `let a`）
            this.enterLoopPart('initializer');
            this.walkNodes(node.initializer, visitors);
            this.exitLoopPart();
            // 处理循环体
            this.enterLoopPart('body');
            this.walkNodes(node.statement, visitors);
            this.exitLoopPart();
            // 退出循环作用域
            this.exitScope();
        }
        finally {
            this.exitLoop();
        }
    }
    visitForInStatement(node, visitors) {
        this.enterLoop();
        try {
            // 处理迭代表达式
            this.enterLoopPart('initializer');
            this.walkNodes(node.expression, visitors);
            this.exitLoopPart();
            // 处理声明部分
            this.enterLoopPart('initializer');
            this.enterScope('block');
            this.walkNodes(node.initializer, visitors);
            this.exitScope();
            this.exitLoopPart();
            // 处理循环体
            this.enterLoopPart('body');
            this.enterScope('block');
            this.walkNodes(node.statement, visitors);
            this.exitScope();
            this.exitLoopPart();
        }
        finally {
            this.exitLoop();
        }
    }
    walkNodes(node, visitors) {
        this.enhancedVisitors.enter(node);
        visitors.enter?.(node);
        if (lib_1.ts.isVariableDeclaration(node)) {
            visitors.visitVariableDeclaration?.(node);
        }
        else if (lib_1.ts.isBinaryExpression(node)) {
            visitors.visitBinaryExpression?.(node);
        }
        else if (lib_1.ts.isPrefixUnaryExpression(node)) {
            visitors.visitPrefixUnaryExpression?.(node);
        }
        else if (lib_1.ts.isPostfixUnaryExpression(node)) {
            visitors.visitPostfixUnaryExpression?.(node);
        }
        else if (lib_1.ts.isForStatement(node)) {
            visitors.visitForStatement?.(node);
        }
        else if (lib_1.ts.isForOfStatement(node)) {
            visitors.visitForOfStatement?.(node);
        }
        else if (lib_1.ts.isForInStatement(node)) {
            visitors.visitForInStatement?.(node);
        }
        ;
        if (lib_1.ts.isAsExpression(node)) {
            // 当遇到类型断言时，优先处理类型部分
            this.walkNodes(node.expression, visitors);
            return;
        }
        ;
        lib_1.ts.forEachChild(node, child => this.walkNodes(child, visitors));
        visitors.leave?.(node);
        this.enhancedVisitors.leave(node);
    }
    collectReferencesInExpression(node, refSet) {
        const isWriteAccess = (n) => {
            const parent = n.parent;
            return (
            // 检查赋值表达式左侧
            (lib_1.ts.isBinaryExpression(parent) && parent.left === n && parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) ||
                // 检查自增/自减表达式
                lib_1.ts.isPostfixUnaryExpression(parent) ||
                lib_1.ts.isPrefixUnaryExpression(parent) ||
                // 检查变量声明中的初始化
                lib_1.ts.isVariableDeclaration(parent));
        };
        const visitNode = (n) => {
            if (lib_1.ts.isIdentifier(n) && !isWriteAccess(n)) { // 收集只读引用
                refSet.add(n.text);
            }
            lib_1.ts.forEachChild(n, visitNode);
        };
        visitNode(node);
    }
    checkForStatement = (node) => {
        const loopContext = this.createLoopContext();
        this.allLoopContexts.push(loopContext);
        // 捕获初始化变量
        if (node.initializer) {
            if (lib_1.ts.isVariableDeclarationList(node.initializer)) {
                node.initializer.declarations.forEach(decl => {
                    this.collectDeclaredVariables(decl.name, loopContext.initializedVars);
                });
            }
            else {
                // 处理表达式形式的初始化（如逗号表达式）
                this.walkForExpression(node.initializer, (id) => {
                    loopContext.initializedVars.add(id.text);
                });
            }
            ;
        }
        ;
        // 收集条件中的引用
        if (node.condition) {
            this.collectReferencesInExpression(node.condition, loopContext.conditionRefs);
        }
        ;
        // 收集递增部分的引用
        if (node.incrementor) {
            this.collectReadRefs(node.incrementor, loopContext.incrementorRefs);
        }
        ;
    };
    enhancedVisitors = {
        enter: (node) => {
            // 捕获标识符的读取操作
            if (lib_1.ts.isIdentifier(node) && this.isReadAccess(node)) {
                const variable = this.currentScope().getVariable(node.text);
                if (variable) {
                    const isInCondition = this.isInConditionContext(node);
                    // 创建读取引用（isWrite: false, read: true）
                    variable.references.push(new Reference(node, false, false, this.currentScope(), {
                        ...variable.references[variable.references.length - 1]?.meta,
                        isInCondition
                    }));
                }
                ;
            }
            ;
            if (lib_1.ts.isNewExpression(node)) {
                const expr = node.expression;
                if (lib_1.ts.isIdentifier(expr)) {
                    const variable = this.currentScope().getVariable(expr.text);
                    variable?.references.push(new Reference(expr, false, false, this.currentScope(), { isConstructorCall: true }));
                }
            }
            ;
            if (lib_1.ts.isWhileStatement(node) || lib_1.ts.isDoStatement(node)) {
                const ctx = this.createLoopContext();
                this.collectLoopConditionWrites(node.expression, ctx.writeVarsInLoop);
                this.allLoopContexts.push(ctx);
            }
            ;
            if (lib_1.ts.isForStatement(node)) {
                this.checkForStatement(node);
            }
            ;
            if (lib_1.ts.isIdentifier(node) && this.isReadAccess(node)) {
                const parent = node.parent;
                const isAccess = (lib_1.ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
                    (lib_1.ts.isElementAccessExpression(parent) && parent.expression === node);
                const variable = this.currentScope().getVariable(node.text);
                if (variable) {
                    variable.references.push(new Reference(node, false, false, this.currentScope(), {
                        ...variable.references[variable.references.length - 1]?.meta,
                        isAccess
                    }));
                }
            }
        },
        leave: (node) => { }
    };
    isInConditionContext(node) {
        let current = node;
        while (current.parent) {
            const parent = current.parent;
            if ((lib_1.ts.isIfStatement(parent) && parent.expression === current) ||
                (lib_1.ts.isWhileStatement(parent) && parent.expression === current) ||
                (lib_1.ts.isForStatement(parent) && parent.condition === current) ||
                (lib_1.ts.isConditionalExpression(parent) && parent.condition === current)) {
                return true;
            }
            ;
            current = parent;
        }
        ;
        return false;
    }
    ;
    isReadAccess(node) {
        const parent = node.parent;
        // 排除写入场景（赋值左侧、自增、变量声明等）
        if ((lib_1.ts.isBinaryExpression(parent) &&
            parent.left === node &&
            parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) ||
            lib_1.ts.isPostfixUnaryExpression(parent) ||
            lib_1.ts.isPrefixUnaryExpression(parent) ||
            lib_1.ts.isVariableDeclaration(parent) ||
            (lib_1.ts.isForInStatement(parent) && parent.initializer === node) ||
            (lib_1.ts.isForOfStatement(parent) && parent.initializer === node)) {
            return false;
        }
        ;
        // 其他情况视为读取
        return true;
    }
    ;
    // 创建新的循环上下文
    createLoopContext() {
        return {
            initializedVars: new Set(),
            conditionRefs: new Set(),
            incrementorRefs: new Set(),
            writeVarsInLoop: new Set(),
        };
    }
    ;
    collectLoopConditionWrites(expr, target) {
        if (!expr) {
            return;
        }
        ;
        const detector = (n) => {
            // 检测赋值表达式（a = foo()）
            if (lib_1.ts.isBinaryExpression(n) && n.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
                this.trackAssignmentTarget(n.left, target);
            }
            // 检测复合赋值（a += 1）
            else if (lib_1.ts.isBinaryExpression(n) && [
                lib_1.ts.SyntaxKind.PlusEqualsToken,
                lib_1.ts.SyntaxKind.MinusEqualsToken
            ].includes(n.operatorToken.kind)) {
                this.trackAssignmentTarget(n.left, target);
            }
            lib_1.ts.forEachChild(n, detector);
        };
        detector(expr);
    }
    ;
    // 递归追踪赋值目标（支持解构）
    trackAssignmentTarget(pattern, target) {
        const checkElement = (n) => {
            n.elements.forEach(elem => {
                if (lib_1.ts.isBindingElement(elem)) {
                    visit(elem.name);
                }
                ;
            });
        };
        const visit = (n) => {
            if (lib_1.ts.isIdentifier(n)) {
                target.add(n.text);
            }
            else if (lib_1.ts.isArrayBindingPattern(n) || lib_1.ts.isObjectBindingPattern(n)) {
                checkElement(n);
            }
        };
        visit(pattern);
    }
    ;
    walkForExpression(node, callback) {
        if (lib_1.ts.isIdentifier(node)) {
            callback(node);
        }
        else if (lib_1.ts.isBinaryExpression(node) && node.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
            this.walkForExpression(node.left, callback);
        }
        else if (lib_1.ts.isParenthesizedExpression(node)) {
            this.walkForExpression(node.expression, callback);
        }
        else if (lib_1.ts.isCommaListExpression(node)) {
            node.elements.forEach(elem => this.walkForExpression(elem, callback));
        }
    }
    ;
    collectDeclaredVariables(pattern, targetSet) {
        const checkElement = (elem) => {
            if (lib_1.ts.isIdentifier(elem.name)) {
                targetSet.add(elem.name.text);
            }
            else if (lib_1.ts.isObjectBindingPattern(elem.name) || lib_1.ts.isArrayBindingPattern(elem.name)) {
                processPattern(elem.name);
            }
            ;
        };
        const processPattern = (p) => {
            p.elements.forEach(elem => {
                if (lib_1.ts.isBindingElement(elem)) {
                    checkElement(elem);
                }
                ;
            });
        };
        if (lib_1.ts.isIdentifier(pattern)) {
            targetSet.add(pattern.text);
        }
        else if (lib_1.ts.isObjectBindingPattern(pattern) || lib_1.ts.isArrayBindingPattern(pattern)) {
            processPattern(pattern);
        }
        ;
    }
    ;
    processPatternForContext(pattern, targetSet) {
        pattern.elements.forEach(elem => {
            if (lib_1.ts.isBindingElement(elem)) {
                if (lib_1.ts.isIdentifier(elem.name)) {
                    targetSet.add(elem.name.text);
                }
                else if (lib_1.ts.isObjectBindingPattern(elem.name) || lib_1.ts.isArrayBindingPattern(elem.name)) {
                    this.processPatternForContext(elem.name, targetSet);
                }
                ;
            }
            ;
        });
    }
    ;
    collectReadRefs(node, targetSet) {
        const visit = (n) => {
            if (lib_1.ts.isIdentifier(n) && !this.isWriteAccess(n)) {
                targetSet.add(n.text);
            }
            lib_1.ts.forEachChild(n, visit);
        };
        visit(node);
    }
    ;
    isWriteAccess(node) {
        const parent = node.parent;
        return ((lib_1.ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) ||
            lib_1.ts.isPostfixUnaryExpression(parent) ||
            lib_1.ts.isPrefixUnaryExpression(parent) ||
            lib_1.ts.isVariableDeclaration(parent));
    }
    ;
    hasReadBeforeAssign(variable) {
        if (!variable.declaredAt || this.config.ignoreReadBeforeAssign === false) {
            return false;
        }
        ;
        const declarationPos = variable.declaredAt.getStart();
        return variable.references.some(ref => {
            // 使用原有Reference结构判断
            return ref.read && ref.node.getStart() < declarationPos;
        });
    }
    ;
    //变量声明的方法
    processLetDeclaration(node) {
        if (lib_1.ts.isIdentifier(node.name)) {
            if (!this.currentScope().isVariableInCurrentScope(node.name.text)) {
                this.registerVariable(node.name);
            }
            ;
            if (node.initializer) {
                const variable = this.currentScope().getVariable(node.name.text);
                variable?.references.push(new Reference(node.name, true, true, this.currentScope(), {}, node));
            }
            ;
        }
        else if (lib_1.ts.isObjectBindingPattern(node.name) || lib_1.ts.isArrayBindingPattern(node.name)) {
            this.processBindingPattern(node.name, node);
        }
        ;
    }
    ;
    visitVarBindingName = (elem, parentDeclaration, bindingName) => {
        const varName = bindingName.text;
        if (varName === 'globalThis' && elem.initializer) {
            this.walkNodes(elem.initializer, {
                enter: (node) => {
                    if (lib_1.ts.isBindingElement(node.parent)) {
                        const variable = this.currentScope()?.getVariable(varName);
                        variable?.references.push(new Reference(bindingName, true, true, this.currentScope(), {}, parentDeclaration));
                    }
                    ;
                },
                leave: () => { }
            });
        }
        ;
    };
    processVarBindingPattern(pattern, parentDeclaration) {
        const processElement = (elem, depth = 0) => {
            const bindingName = elem.name;
            if (lib_1.ts.isIdentifier(bindingName)) {
                this.visitVarBindingName(elem, parentDeclaration, bindingName);
            }
            else if (lib_1.ts.isObjectBindingPattern(elem.name)) {
                this.processVarBindingPattern(elem.name, lib_1.ts.factory.createVariableDeclaration(elem.name, undefined, undefined, undefined));
            }
            ;
        };
        if (lib_1.ts.isObjectBindingPattern(pattern)) {
            pattern.elements.forEach(processElement);
        }
        ;
    }
    ;
    processVarDeclaration(node) {
        if (lib_1.ts.isObjectBindingPattern(node.name)) {
            this.processVarBindingPattern(node.name, node);
        }
        ;
    }
    ;
    // 解构模式
    processBindingPattern(pattern, parentDeclaration) {
        const processElement = (elem, depth = 0) => {
            const declaredAt = lib_1.ts.isIdentifier(elem.name)
                ? elem.name
                : parentDeclaration.name;
            if (lib_1.ts.isIdentifier(elem.name)) {
                // 2. 正确注册变量并关联声明节点
                const variable = new Variable(elem.name.text, this.currentScope(), declaredAt);
                variable.declarations.push(elem.name); // 存储标识符
                this.currentScope().variables.set(elem.name.text, variable);
                // 3. 记录初始引用（关联到父级声明节点）
                variable.references.push(new Reference(elem.name, true, true, this.currentScope(), { patternDepth: depth }, parentDeclaration));
            }
            else if (lib_1.ts.isObjectBindingPattern(elem.name) || lib_1.ts.isArrayBindingPattern(elem.name)) {
                // 4. 递归处理嵌套解构
                this.processBindingPattern(elem.name, lib_1.ts.factory.createVariableDeclaration(elem.name, undefined, undefined, undefined));
            }
            ;
            // 处理默认值
            if (elem.initializer) {
                this.walkNodes(elem.initializer, this.enhancedVisitors);
            }
            ;
        };
        if (lib_1.ts.isArrayBindingPattern(pattern)) {
            pattern.elements.forEach(elem => {
                if (lib_1.ts.isBindingElement(elem)) {
                    processElement(elem);
                }
                ;
            });
        }
        else {
            pattern.elements.forEach(processElement);
        }
        ;
    }
    ;
    registerVariable(identifier) {
        if (this.scopeStack.length === 0) {
            this.scopeStack = [new Scope(undefined, 'global')];
        }
        ;
        const variable = new Variable(identifier.text, this.currentScope(), identifier);
        this.currentScope().variables.set(identifier.text, variable);
        variable.declarations.push(identifier);
    }
    ;
    parseAssignmentIsParenthesizedExpression(left, inParenthesis) {
        if (lib_1.ts.isParenthesizedExpression(left)) {
            this.processAssignment(left.expression, inParenthesis); // 传递 inParenthesis 为 true
            return true;
        }
        return false;
    }
    ;
    // 处理对象或数组解构赋值
    processAssignment(left, inParenthesis = false) {
        if (this.parseAssignmentIsParenthesizedExpression(left, inParenthesis) || this.isInExportAssignment(left)) {
            return;
        }
        ;
        const isConditionalWrite = this.isInConditionContext(left);
        const processIdentifier = (node, patternDepth) => {
            const variable = this.currentScope()?.getVariable(node.text);
            if (variable) {
                const isCrossScope = variable.scope !== this.currentScope();
                variable.references.push(new Reference(node, true, false, this.currentScope(), { isCrossScope, patternDepth, inParenthesis, isConditionalWrite }));
            }
            ;
        };
        const checkElement = (element, depth) => {
            if (lib_1.ts.isIdentifier(element.name)) {
                processIdentifier(element.name, depth);
            }
            else if (lib_1.ts.isArrayBindingPattern(element.name) || lib_1.ts.isObjectBindingPattern(element.name)) {
                processBindingPattern(element.name, depth + 1);
            }
            ;
        };
        const processBindingPattern = (pattern, depth) => {
            pattern.elements.forEach(element => {
                if (lib_1.ts.isBindingElement(element)) {
                    checkElement(element, depth);
                }
                ;
            });
        };
        if (lib_1.ts.isIdentifier(left)) {
            processIdentifier(left, 0);
        }
        else if (lib_1.ts.isObjectBindingPattern(left) || lib_1.ts.isArrayBindingPattern(left)) {
            processBindingPattern(left, 1);
        }
        else if (lib_1.ts.isObjectLiteralExpression(left)) {
            left.properties.forEach(prop => {
                if (lib_1.ts.isShorthandPropertyAssignment(prop)) {
                    processIdentifier(prop.name, 1);
                }
                else if (lib_1.ts.isPropertyAssignment(prop)) {
                    this.processAssignment(prop.initializer, inParenthesis);
                }
                ;
            });
        }
        else if (lib_1.ts.isArrayLiteralExpression(left)) {
            left.elements.forEach(element => {
                if (lib_1.ts.isIdentifier(element)) {
                    processIdentifier(element, 1);
                }
                else if (lib_1.ts.isSpreadElement(element)) {
                    this.processAssignment(element.expression, inParenthesis);
                }
                else {
                    this.processAssignment(element, inParenthesis);
                }
                ;
            });
        }
        ;
    }
    ;
    isReassigned(variable) {
        return variable.references.filter(ref => ref.isWrite).length > 1;
    }
    ;
    isVariableInitialized(variable) {
        // 遍历所有初始化的引用，检查是否有初始化表达式
        return variable.references.some(ref => ref.isInitial &&
            ref.declarationNode?.initializer !== undefined);
    }
    ;
    isInExportAssignment(node) {
        let parent = node.parent;
        while (parent) {
            if (lib_1.ts.isExportAssignment(parent)) {
                return true;
            }
            ;
            parent = parent.parent;
        }
        ;
        return false;
    }
    ;
    isVoidZeroInitializer(variable) {
        const findParentDeclaration = (node) => {
            let parent = node.parent;
            while (parent) {
                if (lib_1.ts.isVariableDeclaration(parent)) {
                    return parent;
                }
                ;
                parent = parent.parent;
            }
            ;
            return undefined;
        };
        const isVoidZeroExpression = (node) => {
            // 处理括号包裹的情况：(void 0)
            if (lib_1.ts.isParenthesizedExpression(node)) {
                return isVoidZeroExpression(node.expression);
            }
            ;
            return lib_1.ts.isVoidExpression(node) &&
                lib_1.ts.isNumericLiteral(node.expression) &&
                node.expression.text === '0';
        };
        return variable.declarations.some(decl => {
            const declaration = findParentDeclaration(decl);
            return declaration?.initializer && isVoidZeroExpression(declaration.initializer);
        });
    }
    ;
    isVariableInLoop(variable) {
        return variable.references.some(ref => {
            let current = ref.node;
            while (current.parent) {
                if (lib_1.ts.isForStatement(current.parent) || lib_1.ts.isForInStatement(current.parent) || lib_1.ts.isForOfStatement(current.parent)) {
                    return true;
                }
                current = current.parent;
            }
            ;
            return false;
        });
    }
    ;
    isObjectLiteral(variable) {
        if (variable.references.length > 1) {
            if (lib_1.ts.isSpreadAssignment(variable.references[1].node.parent) && lib_1.ts.isObjectLiteralExpression(variable.references[1].node.parent.parent)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    reportConstSuggestion(variable) {
        const noInitializer = !this.isVariableInitialized(variable);
        // void 0检测以及
        if (noInitializer && variable.references.filter(ref => ref.isWrite).length === 0 &&
            !this.isVariableInLoop(variable) && !this.isObjectLiteral(variable)) {
            return;
        }
        // 优先检查未初始化且存在属性访问
        if (variable.references.length > 0 && lib_1.ts.isPostfixUnaryExpression(variable.references[0].node.parent)) {
            return;
        }
        ;
        const isUninitializedWithAccess = noInitializer &&
            variable.references.some(ref => ref.meta?.isAccess);
        const UninitializedWithHasConditionRead = noInitializer && variable.references.some(ref => (ref.read && ref.meta?.isInCondition) || (ref.isWrite && ref.meta?.isConditionalWrite));
        //是否在循环条件中被写
        const isWrittenInLoop = this.allLoopContexts.some(ctx => ctx.writeVarsInLoop.has(variable.name));
        if (isUninitializedWithAccess || UninitializedWithHasConditionRead || this.hasReadBeforeAssign(variable) || isWrittenInLoop) {
            return; // 跳过未初始化但有属性访问的变量 跳过先读后写的变量
        }
        ;
        // 新增：检查是否循环控制变量	
        const isLoopControlVar = this.allLoopContexts.some(ctx => ctx.initializedVars.has(variable.name) &&
            (ctx.conditionRefs.has(variable.name) || ctx.incrementorRefs.has(variable.name)));
        if (this.shouldSkip(variable) || isLoopControlVar) {
            return;
        }
        ;
        variable.declarations.forEach(decl => {
            this.analyzeVariableDeclaration(decl, variable);
        });
    }
    ;
    shouldSkip(variable) {
        const shouldSkip = variable.references.some(ref => {
            // 跳过跨作用域的解构赋值（用例1）
            if (ref.meta?.isCrossScope && ref.meta.patternDepth > 0) {
                return true;
            }
            ;
            // 跳过类静态块中的解构赋值（用例2）
            if (ref.meta?.inClassStaticBlock && ref.meta.patternDepth > 0) {
                return true;
            }
            ;
            // 新增条件：若引用在括号内的解构中，跳过上报
            if (ref.meta?.inParenthesis && ref.isWrite) {
                return true;
            }
            ;
            return false;
        });
        return shouldSkip;
    }
    ;
    analyzeVariableDeclaration(decl, variable) {
        const declarationList = decl.parent.parent;
        const hasCrossScopeWrite = variable.references.some(ref => ref.isWrite && !ref.isInitial && ref.scope !== variable.scope);
        const writeCount = variable.references
            .filter(ref => ref.isWrite && !ref.isInitial)
            .reduce((sum, ref) => sum + (ref.scope.loopDepth > 0 ? 2 : 1), 0);
        // 1. 动态获取声明列表（兼容解构模式）
        const { declarations, isForInOf } = this.getDeclarationsAndLoopType(declarationList);
        const hasRead = variable.references.some(ref => ref.read);
        // ||  // 有读取
        const hasWrite = variable.references.filter(ref => ref.isWrite).length > 0;
        // 2. 安全解构检查（独立方法封装）
        const hasUnsafeDestructuring = this.checkUnsafeDestructuring(declarations);
        // 3. 初始化检查（兼容解构模式）
        const allInitialized = this.checkAllInitialized(declarations);
        // 只声明，未给初始值，没赋值，没调用
        if (!hasRead && !hasWrite && !allInitialized) {
            return;
        }
        ;
        // 最终修复条件
        const shouldFix = !hasUnsafeDestructuring &&
            (isForInOf || allInitialized);
        if (!hasCrossScopeWrite && writeCount <= 1) {
            const isInitialized = this.isVariableInitialized(variable);
            // 确定报告节点
            let reportNode = variable.declarations[0]; // 默认声明位置
            if (!isInitialized) {
                // 查找第一个非初始化的写操作
                const firstWriteRef = variable.references.find(ref => ref.isWrite && !ref.isInitial);
                if (firstWriteRef) {
                    reportNode = firstWriteRef.node; // 使用赋值位置
                }
                ;
            }
            ;
            const diagnostic = this.createDiagnostic(reportNode);
            let ruleFix;
            if (shouldFix) {
                ruleFix = this.createFix(declarationList);
            }
            this.addIssueReport(diagnostic, ruleFix);
        }
        ;
    }
    ;
    // 动态获取声明列表并判断循环类型 node 可能为 VariableDeclarationList 或解构模式节点
    getDeclarationsAndLoopType(node) {
        let declarations = [];
        let isForInOf = false;
        // 处理标准声明列表
        if (lib_1.ts.isVariableDeclarationList(node)) {
            declarations = [...node.declarations];
            const parent = node.parent;
            isForInOf = lib_1.ts.isForInStatement(parent) || lib_1.ts.isForOfStatement(parent);
        }
        // 处理解构模式（如 [x, y]）
        else if (lib_1.ts.isArrayBindingPattern(node) || lib_1.ts.isObjectBindingPattern(node)) {
            const parentVarDecl = node.parent;
            if (lib_1.ts.isVariableDeclaration(parentVarDecl)) {
                declarations = [{
                        ...parentVarDecl,
                        name: node,
                        initializer: parentVarDecl.initializer
                    }];
            }
            ;
            // 循环类型判断：祖父节点可能是 ForIn/OfStatement
            const grandParent = parentVarDecl?.parent?.parent;
            isForInOf = lib_1.ts.isForInStatement(grandParent) || lib_1.ts.isForOfStatement(grandParent);
        }
        ;
        return { declarations, isForInOf };
    }
    ;
    // 解构安全检查（如 obj.x 或 arr[0]）
    checkUnsafeDestructuring(declarations) {
        return declarations.some(declaration => {
            if (!(lib_1.ts.isArrayBindingPattern(declaration.name) || lib_1.ts.isObjectBindingPattern(declaration.name))) {
                return false;
            }
            ;
            let unsafe = false;
            const checkNode = (node) => {
                if (lib_1.ts.isPropertyAccessExpression(node) || lib_1.ts.isElementAccessExpression(node)) {
                    unsafe = true;
                }
                lib_1.ts.forEachChild(node, checkNode);
            };
            checkNode(declaration.name);
            return unsafe;
        });
    }
    ;
    // 初始化检查（解构模式默认视为已初始化）
    checkAllInitialized(declarations) {
        return declarations.every(declaration => ((lib_1.ts.isArrayBindingPattern(declaration.name) || lib_1.ts.isObjectBindingPattern(declaration.name))) ? true : !!declaration.initializer);
    }
    ;
    createFix(declarationList) {
        const start = declarationList.getStart();
        const end = start + 'let'.length;
        return { range: [start, end], text: 'const' };
    }
    ;
    createDiagnostic(node) {
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(this.ast, node.getStart());
        return {
            line: line + 1,
            column: character + 1,
            columnEnd: character + 1 + (lib_1.ts.isIdentifier(node) ? node.getText().length : 0),
            message: `'${lib_1.ts.isIdentifier(node) ? node.text : 'variable'}' is never reassigned. Use 'const' instead.`,
            filePath: this.currentArkFile.getFilePath() ?? '',
            fixCode: 'const'
        };
    }
    ;
    addIssueReport(issue, ruleFix) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, (ruleFix !== undefined ? true : false));
        this.issues.push(new Defects_1.IssueReport(defects, ruleFix));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.PreferConstCheck = PreferConstCheck;
