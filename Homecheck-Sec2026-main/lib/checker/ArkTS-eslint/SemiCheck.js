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
exports.SemiCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, "SemiCheck");
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/semi.md",
    description: "Require or disallow semicolons instead of ASI"
};
class SemiCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    arkFile;
    sourceFile;
    sourceCode;
    sourceCodeLength;
    static whitespaceRegex = /\s/;
    static commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*/g;
    static statementContinuationChars = new Set(['[', '(', '/', '+', '-', ',', '.', '*', '`']);
    options = {
        semi: 'always',
        omitLastInOneLineBlock: false,
        omitLastInOneLineClassBody: false,
        beforeStatementContinuationChars: 'any'
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    nodeCache = new Map();
    visitedNodes = new Set();
    blockCache = new Map();
    lineCache = new Map();
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check.bind(this)
        };
        return [matchFileCb];
    }
    check(arkFile) {
        this.arkFile = arkFile;
        this.sourceCode = arkFile.getCode();
        this.sourceCodeLength = this.sourceCode.length;
        this.sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.nodeCache.clear();
        this.visitedNodes.clear();
        this.blockCache.clear();
        this.lineCache.clear();
        if (this.rule && this.rule.option) {
            if (typeof this.rule.option[0] === 'string') {
                this.options.semi = this.rule.option[0];
            }
            if (typeof this.rule.option[1] === 'object') {
                this.options = { ...this.options, ...this.rule.option[1] };
            }
        }
        this.preProcessSemiAtLineStart();
        this.findAndCheckAllFunctions(this.sourceFile);
        this.visitNode(this.sourceFile);
    }
    preProcessSemiAtLineStart() {
        const lines = this.sourceCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const lineStartPos = this.sourceFile.getLineStarts()[i];
            const line = lines[i].trimLeft();
            if (line.startsWith(';')) {
                const indexOfSemi = lines[i].indexOf(';');
                const semiPos = lineStartPos + indexOfSemi;
                const node = this.findNodeAtPosition(semiPos);
                if (node) {
                    this.visitedNodes.add(node);
                }
            }
        }
    }
    findNodeAtPosition(position) {
        let result;
        const visit = (node) => {
            const start = node.getStart();
            const end = node.getEnd();
            if (position >= start && position <= end) {
                if (!result || (end - start < result.getEnd() - result.getStart())) {
                    result = node;
                }
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(this.sourceFile);
        return result;
    }
    getNodeInfo(node) {
        let info = this.nodeCache.get(node);
        if (!info) {
            info = {};
            this.nodeCache.set(node, info);
        }
        return info;
    }
    getLineAndCharacter(pos) {
        const cached = this.lineCache.get(pos);
        if (cached !== undefined) {
            return { line: cached, character: pos - this.getLineStart(cached) };
        }
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(pos);
        this.lineCache.set(pos, line);
        return { line, character };
    }
    getLineStart(line) {
        return this.sourceFile.getLineStarts()[line];
    }
    visitNode(node) {
        if (this.visitedNodes.has(node)) {
            return;
        }
        if (this.processDeclarationNodes(node)) {
            return;
        }
        if (this.processStatementNodes(node)) {
            return;
        }
        if (this.processClassAndInterfaceNodes(node)) {
            return;
        }
        this.processBlockAndFunctionNodes(node);
        if (this.processExpressionNodes(node)) {
            return;
        }
        lib_1.ts.forEachChild(node, child => this.visitNode(child));
    }
    processDeclarationNodes(node) {
        if (lib_1.ts.isImportDeclaration(node)) {
            this.handleImportDeclaration(node);
            return true;
        }
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            this.handleTypeAliasDeclaration(node);
            return true;
        }
        return false;
    }
    processStatementNodes(node) {
        if (lib_1.ts.isBreakStatement(node) || lib_1.ts.isContinueStatement(node)) {
            this.handleBreakContinueStatement(node);
            this.visitedNodes.add(node);
        }
        if (lib_1.ts.isTryStatement(node)) {
            this.handleTryStatement(node);
            lib_1.ts.forEachChild(node, child => this.visitNode(child));
            return true;
        }
        if (lib_1.ts.isIfStatement(node)) {
            this.handleIfStatementNodes(node);
            return true;
        }
        if (lib_1.ts.isWhileStatement(node)) {
            this.handleWhileStatementNodes(node);
            return true;
        }
        if (lib_1.ts.isForStatement(node) || lib_1.ts.isForInStatement(node) || lib_1.ts.isForOfStatement(node)) {
            this.handleForStatement(node);
            return false;
        }
        if (lib_1.ts.isVariableStatement(node)) {
            this.handleVariableStatementNodes(node);
            return true;
        }
        return false;
    }
    processClassAndInterfaceNodes(node) {
        if (lib_1.ts.isInterfaceDeclaration(node) || lib_1.ts.isModuleDeclaration(node) || lib_1.ts.isEnumDeclaration(node)) {
            this.handleInterfaceAndModuleNodes(node);
            return true;
        }
        if (lib_1.ts.isClassDeclaration(node)) {
            if (this.handleClassDeclarationNodes(node)) {
                return true;
            }
            this.handleClassDeclaration(node);
            return true;
        }
        return false;
    }
    processBlockAndFunctionNodes(node) {
        if (lib_1.ts.isBlock(node)) {
            this.handleBlockNodes(node);
        }
        if (lib_1.ts.isReturnStatement(node)) {
            this.handleReturnStatement(node);
            this.visitedNodes.add(node);
        }
        else if (lib_1.ts.isThrowStatement(node)) {
            this.handleThrowStatement(node);
            this.visitedNodes.add(node);
        }
        else if (lib_1.ts.isDoStatement(node)) {
            this.handleDoWhileStatement(node);
            this.visitedNodes.add(node);
        }
        else if (lib_1.ts.isArrowFunction(node) && !lib_1.ts.isBlock(node.body)) {
            this.handleArrowFunctionExpression(node);
            this.visitedNodes.add(node);
        }
        if (lib_1.ts.isFunctionDeclaration(node)) {
            this.handleFunctionDeclaration(node);
        }
        else if (lib_1.ts.isMethodDeclaration(node)) {
            this.handleMethodDeclaration(node);
        }
        else if (lib_1.ts.isClassStaticBlockDeclaration(node)) {
            this.handleClassStaticBlock(node);
        }
        else if (lib_1.ts.isFunctionExpression(node) || lib_1.ts.isArrowFunction(node)) {
            this.handleFunctionExpression(node);
        }
        else if (this.isStatement(node)) {
            this.checkSemicolon(node);
        }
        if (lib_1.ts.isVariableDeclaration(node) && node.initializer &&
            (lib_1.ts.isClassExpression(node.initializer) || lib_1.ts.isClassDeclaration(node.initializer))) {
            this.handleVariableDeclarationWithClass(node);
        }
    }
    processExpressionNodes(node) {
        if (lib_1.ts.isExpressionStatement(node) && lib_1.ts.isCallExpression(node.expression)) {
            this.checkFunctionCallSemicolon(node);
            return true;
        }
        if (lib_1.ts.isExpressionStatement(node)) {
            this.handleExpressionStatementNodes(node);
            return true;
        }
        if (lib_1.ts.isCallExpression(node)) {
            this.handleCallExpressionNodes(node);
        }
        if (lib_1.ts.isObjectLiteralExpression(node)) {
            this.handleObjectLiteralExpressions(node);
        }
        return false;
    }
    handleImportDeclaration(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(node, 'Extra semicolon.');
        }
        this.visitedNodes.add(node);
    }
    handleTypeAliasDeclaration(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(node, 'Extra semicolon.');
        }
        this.visitedNodes.add(node);
    }
    handleIfStatementNodes(node) {
        if (lib_1.ts.isBlock(node.thenStatement)) {
            this.deepVisitBlockStatements(node.thenStatement);
        }
        else {
            this.visitNode(node.thenStatement);
        }
        if (node.elseStatement) {
            if (lib_1.ts.isBlock(node.elseStatement)) {
                this.deepVisitBlockStatements(node.elseStatement);
            }
            else {
                this.visitNode(node.elseStatement);
            }
        }
    }
    handleWhileStatementNodes(node) {
        const statement = node.statement;
        if (lib_1.ts.isBlock(statement)) {
            this.deepVisitBlockStatements(statement);
        }
        else {
            this.visitNode(statement);
        }
    }
    handleInterfaceAndModuleNodes(node) {
        this.visitedNodes.add(node);
        lib_1.ts.forEachChild(node, child => this.visitNode(child));
    }
    handleClassDeclarationNodes(node) {
        const parent = node.parent;
        if (lib_1.ts.isBlock(parent)) {
            const grandParent = parent.parent;
            if (lib_1.ts.isIfStatement(grandParent) ||
                lib_1.ts.isWhileStatement(grandParent) ||
                lib_1.ts.isForStatement(grandParent) ||
                lib_1.ts.isForInStatement(grandParent) ||
                lib_1.ts.isForOfStatement(grandParent) ||
                lib_1.ts.isDoStatement(grandParent) ||
                lib_1.ts.isClassStaticBlockDeclaration(grandParent)) {
                this.visitedNodes.add(node);
                this.handleClassDeclaration(node);
                return true;
            }
        }
        return false;
    }
    handleBlockNodes(node) {
        const parent = node.parent;
        if (lib_1.ts.isIfStatement(parent) ||
            lib_1.ts.isWhileStatement(parent) ||
            lib_1.ts.isForStatement(parent) ||
            lib_1.ts.isForInStatement(parent) ||
            lib_1.ts.isForOfStatement(parent) ||
            lib_1.ts.isDoStatement(parent)) {
            this.visitedNodes.add(node);
        }
    }
    handleVariableStatementNodes(node) {
        this.checkVariableDeclaration(node);
        lib_1.ts.forEachChild(node, child => this.visitNode(child));
    }
    handleExpressionStatementNodes(node) {
        const nodeStart = node.getStart();
        if (this.isSemiAtLineStart(nodeStart)) {
            this.visitedNodes.add(node);
            return;
        }
        const expression = node.expression;
        if (lib_1.ts.isObjectLiteralExpression(expression) ||
            lib_1.ts.isNumericLiteral(expression) ||
            lib_1.ts.isStringLiteral(expression)) {
            const nodeEnd = node.getEnd();
            const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
            if (this.options.semi === 'always' && !hasSemicolon) {
                this.report(node, 'Missing semicolon.');
            }
            else if (this.options.semi === 'never' && hasSemicolon) {
                this.report(node, 'Extra semicolon.');
            }
            this.visitedNodes.add(node);
            lib_1.ts.forEachChild(node, child => this.visitNode(child));
        }
        else {
            this.checkSemicolon(node);
            lib_1.ts.forEachChild(node, child => this.visitNode(child));
        }
    }
    handleCallExpressionNodes(node) {
        this.checkParentNodeContext(node);
        this.checkFunctionArguments(node);
    }
    checkParentNodeContext(node) {
        const parent = node.parent;
        if (lib_1.ts.isExpressionStatement(parent)) {
            // 已经在其他地方处理
            return;
        }
        if (lib_1.ts.isCallExpression(parent)) {
            return;
        }
        const grandParent = parent?.parent;
        if (!grandParent || !lib_1.ts.isBlock(grandParent)) {
            return;
        }
        const statements = grandParent.statements;
        const lastStatement = statements[statements.length - 1];
        if (lastStatement &&
            lib_1.ts.isExpressionStatement(lastStatement) &&
            lastStatement.expression === parent) {
            this.checkCallExpressionSemicolon(lastStatement);
        }
    }
    checkFunctionArguments(node) {
        node.arguments.forEach(arg => {
            if (!(lib_1.ts.isFunctionExpression(arg) || lib_1.ts.isArrowFunction(arg)) || !arg.body) {
                return;
            }
            if (lib_1.ts.isBlock(arg.body)) {
                this.checkFunctionBodyStatements(arg.body);
            }
        });
    }
    checkFunctionBodyStatements(body) {
        body.statements.forEach(stmt => {
            if (lib_1.ts.isExpressionStatement(stmt)) {
                const stmtEnd = stmt.getEnd();
                const hasSemicolon = this.sourceCode[stmtEnd - 1] === ';';
                if (this.options.semi === 'always' && !hasSemicolon) {
                    this.report(stmt, 'Missing semicolon.');
                }
                else if (this.options.semi === 'never' && hasSemicolon) {
                    this.report(stmt, 'Extra semicolon.');
                }
            }
            else {
                this.visitNode(stmt);
            }
        });
    }
    handleObjectLiteralExpressions(node) {
        const parent = node.parent;
        if (lib_1.ts.isExpressionStatement(parent)) {
            // 已经在其他地方处理
        }
        else {
            this.checkParentContextForLiteral(node);
        }
    }
    handleClassDeclaration(node) {
        node.members.forEach(member => {
            if (lib_1.ts.isPropertyDeclaration(member)) {
                this.handlePropertyDeclaration(member);
            }
            else if (lib_1.ts.isMethodDeclaration(member) && !member.body) {
                this.checkSemicolon(member);
            }
            else if (lib_1.ts.isMethodDeclaration(member)) {
                this.handleMethodWithBody(member);
            }
            else if (lib_1.ts.isClassStaticBlockDeclaration(member)) {
                this.handleStaticBlockDeclaration(member);
            }
        });
    }
    handlePropertyDeclaration(member) {
        const nodeEnd = member.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(member, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(member, 'Extra semicolon.');
        }
    }
    handleMethodWithBody(member) {
        if (member.body) {
            member.body.statements.forEach(stmt => {
                this.visitNode(stmt);
            });
        }
    }
    handleStaticBlockDeclaration(member) {
        if (member.body && member.body.statements) {
            member.body.statements.forEach(stmt => {
                this.visitNode(stmt);
            });
        }
    }
    handleFunctionDeclaration(node) {
        const modifiers = node.modifiers;
        if (modifiers && modifiers.some(mod => mod.kind === lib_1.ts.SyntaxKind.DeclareKeyword)) {
            this.checkSemicolon(node);
        }
        else if (node.body) {
            this.visitNode(node.body);
        }
    }
    handleMethodDeclaration(node) {
        if (node.body) {
            node.body.statements.forEach(stmt => {
                this.visitNode(stmt);
            });
        }
    }
    handleClassStaticBlock(node) {
        if (node.body && node.body.statements) {
            node.body.statements.forEach(stmt => {
                this.visitNode(stmt);
            });
        }
    }
    handleFunctionExpression(node) {
        if (!node.body || !lib_1.ts.isBlock(node.body)) {
            return;
        }
        node.body.statements.forEach(stmt => {
            if (lib_1.ts.isExpressionStatement(stmt)) {
                this.checkExpressionStatementSemicolon(stmt);
            }
            else {
                this.visitNode(stmt);
            }
        });
    }
    checkExpressionStatementSemicolon(stmt) {
        const stmtEnd = stmt.getEnd();
        const hasSemicolon = this.sourceCode[stmtEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(stmt, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(stmt, 'Extra semicolon.');
        }
    }
    handleVariableDeclarationWithClass(node) {
        if (node.parent && node.parent.parent) {
            this.checkSemicolon(node.parent.parent);
        }
    }
    checkVariableDeclaration(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(node, 'Extra semicolon.');
        }
    }
    isStatement(node) {
        if (this.isBlockInControlFlow(node) || this.isClassInSpecialContext(node)) {
            return false;
        }
        if (this.isInterfaceOrModuleOrEnum(node)) {
            return false;
        }
        if (this.isControlFlowStatement(node)) {
            return false;
        }
        if (this.isExportedInterface(node)) {
            return false;
        }
        if (this.isFunctionOrMethodWithDeclare(node)) {
            return true;
        }
        return this.isCommonStatementType(node);
    }
    isBlockInControlFlow(node) {
        if (!lib_1.ts.isBlock(node)) {
            return false;
        }
        const parent = node.parent;
        return lib_1.ts.isWhileStatement(parent) ||
            lib_1.ts.isIfStatement(parent) ||
            lib_1.ts.isForStatement(parent) ||
            lib_1.ts.isForInStatement(parent) ||
            lib_1.ts.isForOfStatement(parent) ||
            lib_1.ts.isDoStatement(parent);
    }
    isClassInSpecialContext(node) {
        if (!lib_1.ts.isClassDeclaration(node)) {
            return false;
        }
        const parent = node.parent;
        if (lib_1.ts.isBlock(parent)) {
            const grandParent = parent.parent;
            return lib_1.ts.isIfStatement(grandParent) ||
                lib_1.ts.isWhileStatement(grandParent) ||
                lib_1.ts.isForStatement(grandParent) ||
                lib_1.ts.isForInStatement(grandParent) ||
                lib_1.ts.isForOfStatement(grandParent) ||
                lib_1.ts.isDoStatement(grandParent) ||
                lib_1.ts.isClassStaticBlockDeclaration(grandParent);
        }
        return false;
    }
    isInterfaceOrModuleOrEnum(node) {
        return lib_1.ts.isInterfaceDeclaration(node) ||
            lib_1.ts.isModuleDeclaration(node) ||
            lib_1.ts.isEnumDeclaration(node);
    }
    isControlFlowStatement(node) {
        return lib_1.ts.isWhileStatement(node) ||
            lib_1.ts.isIfStatement(node) ||
            (lib_1.ts.isClassDeclaration(node) && !lib_1.ts.isVariableDeclaration(node.parent));
    }
    isExportedInterface(node) {
        if (!lib_1.ts.isInterfaceDeclaration(node)) {
            return false;
        }
        const modifiers = node.modifiers;
        return modifiers !== undefined &&
            modifiers.some(mod => mod.kind === lib_1.ts.SyntaxKind.ExportKeyword) &&
            modifiers.some(m => m.kind === lib_1.ts.SyntaxKind.DefaultKeyword);
    }
    isFunctionOrMethodWithDeclare(node) {
        if (!lib_1.ts.isFunctionDeclaration(node) && !lib_1.ts.isMethodDeclaration(node)) {
            return false;
        }
        const modifiers = node.modifiers;
        return modifiers !== undefined &&
            modifiers.some(mod => mod.kind === lib_1.ts.SyntaxKind.DeclareKeyword);
    }
    isCommonStatementType(node) {
        return lib_1.ts.isExpressionStatement(node) ||
            lib_1.ts.isVariableStatement(node) ||
            lib_1.ts.isReturnStatement(node) ||
            lib_1.ts.isBreakStatement(node) ||
            lib_1.ts.isContinueStatement(node) ||
            lib_1.ts.isThrowStatement(node) ||
            lib_1.ts.isImportDeclaration(node) ||
            lib_1.ts.isExportDeclaration(node) ||
            lib_1.ts.isDebuggerStatement(node) ||
            lib_1.ts.isEmptyStatement(node) ||
            lib_1.ts.isDoStatement(node) ||
            lib_1.ts.isWhileStatement(node) ||
            lib_1.ts.isExportAssignment(node) ||
            lib_1.ts.isImportEqualsDeclaration(node) ||
            lib_1.ts.isTypeAliasDeclaration(node) ||
            (lib_1.ts.isMethodDeclaration(node) && !node.body) ||
            (lib_1.ts.isPropertyDeclaration(node) && !node.initializer);
    }
    handleIncrementDecrementExpression(node, nodeEnd, hasSemicolon) {
        if (!lib_1.ts.isExpressionStatement(node)) {
            return false;
        }
        const expr = node.expression;
        if (!((lib_1.ts.isPrefixUnaryExpression(expr) || lib_1.ts.isPostfixUnaryExpression(expr)) &&
            (expr.operator === lib_1.ts.SyntaxKind.PlusPlusToken || expr.operator === lib_1.ts.SyntaxKind.MinusMinusToken))) {
            return false;
        }
        const operatorText = expr.operator === lib_1.ts.SyntaxKind.PlusPlusToken ? '++' : '--';
        const nodeText = this.sourceCode.substring(node.getStart(), nodeEnd);
        const hasOperandBefore = nodeText.indexOf(operatorText) > 0;
        const hasOperandAfter = nodeText.indexOf(operatorText) < nodeText.length - 2;
        if (!hasOperandBefore && !hasOperandAfter) {
            return false;
        }
        const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
        if (!nextChar || SemiCheck.whitespaceRegex.test(nextChar)) {
            this.handleSemicolonRule(node, hasSemicolon);
            return true;
        }
        return false;
    }
    handleWhileStatementBlock(node, hasSemicolon) {
        if (!lib_1.ts.isBlock(node.parent) || !lib_1.ts.isWhileStatement(node.parent.parent)) {
            return false;
        }
        const blockText = this.sourceCode.substring(node.parent.getStart(), node.parent.getEnd());
        if (!blockText.includes('\n')) {
            if (lib_1.ts.isBreakStatement(node) || lib_1.ts.isContinueStatement(node)) {
                this.handleSemicolonRule(node, hasSemicolon);
                return true;
            }
        }
        return false;
    }
    handleOneLineBlock(node, hasSemicolon) {
        if (!lib_1.ts.isBlock(node.parent)) {
            return false;
        }
        const blockText = this.sourceCode.substring(node.parent.getStart(), node.parent.getEnd());
        if (!blockText.includes('\n')) {
            const parentParent = node.parent.parent;
            if (parentParent && (lib_1.ts.isForStatement(parentParent) ||
                lib_1.ts.isForInStatement(parentParent) ||
                lib_1.ts.isForOfStatement(parentParent) ||
                lib_1.ts.isWhileStatement(parentParent) ||
                lib_1.ts.isIfStatement(parentParent) ||
                lib_1.ts.isFunctionDeclaration(parentParent))) {
                this.handleSemicolonRule(node, hasSemicolon);
                return true;
            }
        }
        return false;
    }
    handleSemicolonRule(node, hasSemicolon, isASIDangerous) {
        const nodeStart = node.getStart();
        if (this.isSemiAtLineStart(nodeStart)) {
            return;
        }
        if (this.options.semi === 'always') {
            if (!hasSemicolon) {
                if (this.options.omitLastInOneLineBlock && this.isLastInOneLineBlock(node)) {
                    return;
                }
                if (this.options.omitLastInOneLineClassBody && this.isLastInOneLineClassBody(node)) {
                    return;
                }
                this.report(node, 'Missing semicolon.');
            }
        }
        else if (this.options.semi === 'never') {
            if (hasSemicolon) {
                if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                    return;
                }
                if (this.options.beforeStatementContinuationChars === 'never' ||
                    (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                    this.report(node, 'Extra semicolon.');
                }
            }
            else if (isASIDangerous && this.options.beforeStatementContinuationChars === 'always') {
                this.report(node, 'Missing semicolon.');
            }
        }
    }
    checkSemicolon(node) {
        if (this.visitedNodes.has(node)) {
            return;
        }
        this.visitedNodes.add(node);
        if (this.isExpressionInClassStaticBlock(node)) {
            this.checkStaticBlockExpression(node);
            return;
        }
        const nodeStart = node.getStart();
        if (this.isSemiAtLineStart(nodeStart)) {
            return;
        }
        if (this.shouldSkipNodeCheck(node)) {
            return;
        }
        const nodeEnd = node.getEnd();
        const info = this.getNodeInfo(node);
        if (!info) {
            return;
        }
        if (info.hasSemicolon === undefined) {
            info.hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        }
        const hasSemicolon = info.hasSemicolon;
        if (this.handleWhileStatementBlock(node, hasSemicolon) ||
            this.handleOneLineBlock(node, hasSemicolon) ||
            this.handleIncrementDecrementExpression(node, nodeEnd, hasSemicolon)) {
            return;
        }
        this.processSemicolonForNode(node, nodeEnd, info, hasSemicolon);
    }
    isExpressionInClassStaticBlock(node) {
        return lib_1.ts.isExpressionStatement(node) &&
            node.parent &&
            lib_1.ts.isBlock(node.parent) &&
            node.parent.parent &&
            lib_1.ts.isClassStaticBlockDeclaration(node.parent.parent);
    }
    checkStaticBlockExpression(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
    }
    shouldSkipNodeCheck(node) {
        if (this.isControlFlowStatementWithoutSemicolon(node)) {
            return true;
        }
        if (lib_1.ts.isInterfaceDeclaration(node) || lib_1.ts.isModuleDeclaration(node) || lib_1.ts.isEnumDeclaration(node)) {
            return true;
        }
        if (this.isBlockInSpecialContext(node)) {
            return true;
        }
        return false;
    }
    isControlFlowStatementWithoutSemicolon(node) {
        return lib_1.ts.isWhileStatement(node) ||
            lib_1.ts.isIfStatement(node) ||
            lib_1.ts.isForStatement(node) ||
            lib_1.ts.isForInStatement(node) ||
            lib_1.ts.isForOfStatement(node) ||
            lib_1.ts.isDoStatement(node) ||
            (lib_1.ts.isClassDeclaration(node) && !this.isExpressionPartOfVariableDeclaration(node));
    }
    isBlockInSpecialContext(node) {
        if (!lib_1.ts.isBlock(node)) {
            return false;
        }
        const parent = node.parent;
        if (lib_1.ts.isWhileStatement(parent) ||
            lib_1.ts.isIfStatement(parent) ||
            lib_1.ts.isForStatement(parent) ||
            lib_1.ts.isForInStatement(parent) ||
            lib_1.ts.isForOfStatement(parent) ||
            lib_1.ts.isDoStatement(parent)) {
            return true;
        }
        if (node.statements && node.statements.length > 0) {
            const lastStmt = node.statements[node.statements.length - 1];
            return lib_1.ts.isIfStatement(lastStmt) ||
                lib_1.ts.isWhileStatement(lastStmt) ||
                lib_1.ts.isForStatement(lastStmt) ||
                lib_1.ts.isForInStatement(lastStmt) ||
                lib_1.ts.isForOfStatement(lastStmt) ||
                lib_1.ts.isDoStatement(lastStmt);
        }
        return false;
    }
    processSemicolonForNode(node, nodeEnd, info, hasSemicolon) {
        const nextCharacter = this.getNextCharacter(nodeEnd, this.sourceCode);
        const isASIDangerous = this.isStatementContinuationChar(nextCharacter);
        if (!info.lineInfo) {
            info.lineInfo = this.getLineAndCharacter(nodeEnd);
        }
        const currentLine = info.lineInfo.line;
        const nextNonWhitespace = this.getNextNonWhitespaceChar(nodeEnd, this.sourceCode);
        const nextCharPos = this.sourceCode.indexOf(nextNonWhitespace, nodeEnd);
        if (nextCharPos !== -1) {
            const nextLine = this.getLineAndCharacter(nextCharPos).line;
            if (this.isSameLineNonComment(currentLine, nextLine, nextNonWhitespace, nextCharPos) &&
                !this.isStatementContinuationChar(nextNonWhitespace)) {
                if (!lib_1.ts.isExpressionStatement(node) ||
                    (nextNonWhitespace !== '' && !SemiCheck.whitespaceRegex.test(nextNonWhitespace))) {
                    return;
                }
            }
        }
        this.handleSemicolonRule(node, hasSemicolon, isASIDangerous);
    }
    isSameLineNonComment(currentLine, nextLine, nextChar, nextCharPos) {
        return currentLine === nextLine &&
            !this.isCommentStart(nextChar, this.sourceCode.charAt(nextCharPos + 1));
    }
    isLastInOneLineBlock(node) {
        const parent = node.parent;
        if (!parent) {
            return false;
        }
        if (!lib_1.ts.isBlock(parent) && !(lib_1.ts.isClassStaticBlockDeclaration && lib_1.ts.isClassStaticBlockDeclaration(parent))) {
            return false;
        }
        let statements;
        if (lib_1.ts.isBlock(parent)) {
            statements = parent.statements;
        }
        else if (lib_1.ts.isClassStaticBlockDeclaration(parent)) {
            statements = parent.body.statements;
        }
        if (!statements || statements[statements.length - 1] !== node) {
            return false;
        }
        const blockStart = parent.getStart();
        const blockEnd = parent.getEnd();
        const blockText = this.sourceCode.slice(blockStart, blockEnd);
        return !blockText.replace(SemiCheck.commentRegex, '').trim().includes('\n');
    }
    isLastInOneLineClassBody(node) {
        const parent = node.parent;
        if (!parent || !lib_1.ts.isClassDeclaration(parent)) {
            return false;
        }
        const members = parent.members;
        if (members[members.length - 1] !== node) {
            return false;
        }
        const classStart = parent.getStart();
        const classEnd = parent.getEnd();
        const classText = this.sourceCode.slice(classStart, classEnd);
        return !classText.replace(SemiCheck.commentRegex, '').trim().includes('\n');
    }
    getNextCharacter(position, sourceCode) {
        let i = position;
        i = this.skipWhitespaceChars(i, sourceCode);
        if (i >= this.sourceCodeLength) {
            return '';
        }
        const commentResult = this.trySkipComment(i, sourceCode);
        if (commentResult.isComment) {
            return this.getNextCharacter(commentResult.newPosition, sourceCode);
        }
        return i < this.sourceCodeLength ? sourceCode[i] : '';
    }
    skipWhitespaceChars(position, sourceCode) {
        let i = position;
        while (i < this.sourceCodeLength && SemiCheck.whitespaceRegex.test(sourceCode[i])) {
            i++;
        }
        return i;
    }
    trySkipComment(position, sourceCode) {
        if (position >= this.sourceCodeLength - 1) {
            return { isComment: false, newPosition: position };
        }
        const char = sourceCode[position];
        const nextChar = sourceCode[position + 1];
        if (char !== '/' || (nextChar !== '/' && nextChar !== '*')) {
            return { isComment: false, newPosition: position };
        }
        return this.handleCommentSkip(position, nextChar, sourceCode);
    }
    handleCommentSkip(position, commentType, sourceCode) {
        if (commentType === '/') {
            return this.skipLineComment(position, sourceCode);
        }
        return this.skipBlockComment(position, sourceCode);
    }
    skipLineComment(position, sourceCode) {
        const newlinePos = sourceCode.indexOf('\n', position);
        if (newlinePos === -1) {
            return { isComment: true, newPosition: this.sourceCodeLength };
        }
        return { isComment: true, newPosition: newlinePos + 1 };
    }
    skipBlockComment(position, sourceCode) {
        const commentEndPos = sourceCode.indexOf('*/', position + 2);
        if (commentEndPos === -1) {
            return { isComment: true, newPosition: this.sourceCodeLength };
        }
        return { isComment: true, newPosition: commentEndPos + 2 };
    }
    isStatementContinuationChar(char) {
        if (!char) {
            return false;
        }
        if (char === '+' || char === '-') {
            const charIndex = this.sourceCode.indexOf(char);
            const nextChar = this.sourceCode[charIndex + 1];
            if ((char === '+' && nextChar === '+') || (char === '-' && nextChar === '-')) {
                const prevChar = this.sourceCode[charIndex - 1];
                const afterChar = this.sourceCode[charIndex + 2];
                return (!prevChar || SemiCheck.whitespaceRegex.test(prevChar)) &&
                    (!afterChar || SemiCheck.whitespaceRegex.test(afterChar));
            }
        }
        return SemiCheck.statementContinuationChars.has(char);
    }
    isCommentStart(char, nextChar) {
        return (char === '/' && (nextChar === '/' || nextChar === '*'));
    }
    getNextNonWhitespaceChar(position, sourceCode) {
        let i = position;
        while (i < this.sourceCodeLength && SemiCheck.whitespaceRegex.test(sourceCode[i])) {
            i++;
        }
        return sourceCode[i] || '';
    }
    report(node, message) {
        const endPos = node.getEnd();
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(endPos);
        let column = character;
        if (this.options.semi === 'always' || this.options.beforeStatementContinuationChars === 'always') {
            if (message.includes('Missing')) {
                column = character + 1;
            }
        }
        else if (this.options.semi === 'never') {
            if (message.includes('Extra')) {
                column = character;
            }
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line + 1, column, column + 1, message, severity, this.rule.ruleId, this.arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, true);
        let fix;
        if (message.includes('Missing')) {
            fix = { range: [endPos, endPos], text: ';' };
        }
        else if (message.includes('Extra')) {
            fix = { range: [endPos - 1, endPos], text: '' };
        }
        const issue = new Defects_1.IssueReport(defect, fix);
        this.issues.push(issue);
        DefectsList_1.RuleListUtil.push(defect);
    }
    isExpressionPartOfVariableDeclaration(node) {
        if (!node.parent) {
            return false;
        }
        if (lib_1.ts.isVariableDeclaration(node.parent)) {
            return true;
        }
        const parent = node.parent;
        if (lib_1.ts.isExpressionStatement(parent) && parent.expression === node) {
            return true;
        }
        return lib_1.ts.isPropertyAssignment(node.parent) ||
            lib_1.ts.isBinaryExpression(node.parent) ||
            lib_1.ts.isReturnStatement(node.parent);
    }
    checkFunctionCallSemicolon(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
            const isASIDangerous = this.isStatementContinuationChar(nextChar);
            if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                return;
            }
            if (this.options.beforeStatementContinuationChars === 'never' ||
                (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                this.report(node, 'Extra semicolon.');
            }
        }
    }
    handleReturnStatement(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
            const isASIDangerous = this.isStatementContinuationChar(nextChar);
            if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                return;
            }
            if (this.options.beforeStatementContinuationChars === 'never' ||
                (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                this.report(node, 'Extra semicolon.');
            }
        }
    }
    handleTryStatement(node) {
        const visitBlock = (block) => {
            if (block && block.statements) {
                block.statements.forEach(stmt => {
                    this.visitNode(stmt);
                });
            }
        };
        if (node.tryBlock) {
            visitBlock(node.tryBlock);
        }
        if (node.catchClause && node.catchClause.block) {
            visitBlock(node.catchClause.block);
        }
        if (node.finallyBlock) {
            visitBlock(node.finallyBlock);
        }
    }
    handleBreakContinueStatement(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
            const isASIDangerous = this.isStatementContinuationChar(nextChar);
            if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                return;
            }
            if (this.options.beforeStatementContinuationChars === 'never' ||
                (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                this.report(node, 'Extra semicolon.');
            }
        }
    }
    handleThrowStatement(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
            const isASIDangerous = this.isStatementContinuationChar(nextChar);
            if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                return;
            }
            if (this.options.beforeStatementContinuationChars === 'never' ||
                (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                this.report(node, 'Extra semicolon.');
            }
        }
    }
    handleDoWhileStatement(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
            const isASIDangerous = this.isStatementContinuationChar(nextChar);
            if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                return;
            }
            if (this.options.beforeStatementContinuationChars === 'never' ||
                (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                this.report(node, 'Extra semicolon.');
            }
        }
    }
    handleArrowFunctionExpression(node) {
        const parent = node.parent;
        if (lib_1.ts.isExpressionStatement(parent)) {
            const nodeEnd = parent.getEnd();
            const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
            if (this.options.semi === 'always' && !hasSemicolon) {
                this.report(parent, 'Missing semicolon.');
            }
            else if (this.options.semi === 'never' && hasSemicolon) {
                const nextChar = this.getNextCharacter(nodeEnd, this.sourceCode);
                const isASIDangerous = this.isStatementContinuationChar(nextChar);
                if (this.options.beforeStatementContinuationChars === 'always' && isASIDangerous) {
                    return;
                }
                if (this.options.beforeStatementContinuationChars === 'never' ||
                    (this.options.beforeStatementContinuationChars === 'any' && !isASIDangerous)) {
                    this.report(parent, 'Extra semicolon.');
                }
            }
        }
    }
    checkCallExpressionSemicolon(node) {
        const nodeEnd = node.getEnd();
        const hasSemicolon = this.sourceCode[nodeEnd - 1] === ';';
        if (this.options.semi === 'always' && !hasSemicolon) {
            this.report(node, 'Missing semicolon.');
        }
        else if (this.options.semi === 'never' && hasSemicolon) {
            this.report(node, 'Extra semicolon.');
        }
    }
    deepVisitBlockStatements(block) {
        block.statements.forEach(stmt => {
            this.visitNode(stmt);
            if (lib_1.ts.isIfStatement(stmt)) {
                this.processIfStatementBranches(stmt);
            }
            else if (lib_1.ts.isWhileStatement(stmt)) {
                this.processWhileStatement(stmt);
            }
            else if (lib_1.ts.isTryStatement(stmt)) {
                this.processTryStatement(stmt);
            }
            else if (lib_1.ts.isVariableStatement(stmt)) {
                this.processVariableDeclarations(stmt);
            }
        });
    }
    processIfStatementBranches(stmt) {
        if (lib_1.ts.isBlock(stmt.thenStatement)) {
            this.deepVisitBlockStatements(stmt.thenStatement);
        }
        else {
            this.visitNode(stmt.thenStatement);
        }
        if (stmt.elseStatement) {
            if (lib_1.ts.isBlock(stmt.elseStatement)) {
                this.deepVisitBlockStatements(stmt.elseStatement);
            }
            else {
                this.visitNode(stmt.elseStatement);
            }
        }
    }
    processWhileStatement(stmt) {
        const statement = stmt.statement;
        if (lib_1.ts.isBlock(statement)) {
            this.deepVisitBlockStatements(statement);
        }
        else {
            this.visitNode(statement);
        }
    }
    processTryStatement(stmt) {
        if (stmt.tryBlock) {
            this.deepVisitBlockStatements(stmt.tryBlock);
        }
        if (stmt.catchClause && stmt.catchClause.block) {
            this.deepVisitBlockStatements(stmt.catchClause.block);
        }
        if (stmt.finallyBlock) {
            this.deepVisitBlockStatements(stmt.finallyBlock);
        }
    }
    processVariableDeclarations(stmt) {
        stmt.declarationList.declarations.forEach(decl => {
            if (decl.initializer &&
                (lib_1.ts.isFunctionExpression(decl.initializer) || lib_1.ts.isArrowFunction(decl.initializer)) &&
                lib_1.ts.isBlock(decl.initializer.body)) {
                this.deepVisitBlockStatements(decl.initializer.body);
            }
        });
    }
    checkParentContextForLiteral(node) {
        const parent = node.parent;
        if (!parent) {
            return;
        }
        if (lib_1.ts.isVariableDeclaration(parent) && parent.initializer === node) {
            const grandParent = parent.parent?.parent;
            if (grandParent && lib_1.ts.isVariableStatement(grandParent)) {
                this.checkSemicolon(grandParent);
            }
        }
        else if (lib_1.ts.isPropertyAssignment(parent) && parent.initializer === node) {
            this.findExpressionStatementAncestor(parent);
        }
        else if (lib_1.ts.isBinaryExpression(parent) &&
            (parent.left === node || parent.right === node)) {
            this.findExpressionStatementAncestor(parent);
        }
    }
    findExpressionStatementAncestor(node) {
        let current = node;
        while (current && current.parent) {
            if (lib_1.ts.isExpressionStatement(current.parent)) {
                this.checkSemicolon(current.parent);
                break;
            }
            current = current.parent;
        }
    }
    findAndCheckAllFunctions(node) {
        if ((lib_1.ts.isFunctionExpression(node) || lib_1.ts.isArrowFunction(node)) && node.body) {
            if (lib_1.ts.isBlock(node.body)) {
                this.checkFunctionBlockStatements(node.body);
            }
            else if (!lib_1.ts.isBlock(node.body) && lib_1.ts.isIdentifier(node.body)) {
                this.checkIdentifierFunctionBody(node);
            }
        }
        if (lib_1.ts.isCallExpression(node)) {
            this.checkFunctionCallArguments(node);
        }
        lib_1.ts.forEachChild(node, child => this.findAndCheckAllFunctions(child));
    }
    checkFunctionBlockStatements(block) {
        block.statements.forEach(stmt => {
            if (lib_1.ts.isExpressionStatement(stmt)) {
                this.checkExpressionStatementSemicolon(stmt);
                this.visitedNodes.add(stmt);
            }
            else {
                this.visitNode(stmt);
            }
        });
    }
    checkIdentifierFunctionBody(node) {
        const parent = node.parent;
        if (parent && lib_1.ts.isExpressionStatement(parent)) {
            const parentEnd = parent.getEnd();
            const hasSemicolon = this.sourceCode[parentEnd - 1] === ';';
            if (this.options.semi === 'always' && !hasSemicolon) {
                this.report(parent, 'Missing semicolon.');
            }
            else if (this.options.semi === 'never' && hasSemicolon) {
                this.report(parent, 'Extra semicolon.');
            }
        }
    }
    checkFunctionCallArguments(node) {
        node.arguments.forEach(arg => {
            if ((lib_1.ts.isFunctionExpression(arg) || lib_1.ts.isArrowFunction(arg)) && arg.body) {
                if (lib_1.ts.isBlock(arg.body)) {
                    this.checkFunctionArgumentBlockStatements(arg.body);
                }
            }
        });
    }
    checkFunctionArgumentBlockStatements(body) {
        body.statements.forEach(stmt => {
            if (lib_1.ts.isExpressionStatement(stmt)) {
                this.checkExpressionStatementSemicolon(stmt);
                this.visitedNodes.add(stmt);
            }
        });
    }
    isSemiAtLineStart(position) {
        const { line } = this.sourceFile.getLineAndCharacterOfPosition(position);
        const lineStartPos = this.sourceFile.getLineStarts()[line];
        for (let i = lineStartPos; i < position; i++) {
            if (!SemiCheck.whitespaceRegex.test(this.sourceCode[i])) {
                return false;
            }
        }
        return this.sourceCode[position] === ';';
    }
    handleForStatement(node) {
        const statement = node.statement;
        if (lib_1.ts.isBlock(statement)) {
            statement.statements.forEach(stmt => {
                if (this.isStatement(stmt)) {
                    this.checkSemicolon(stmt);
                }
            });
        }
        else if (this.isStatement(statement)) {
            this.checkSemicolon(statement);
        }
        this.visitNode(statement);
    }
}
exports.SemiCheck = SemiCheck;
