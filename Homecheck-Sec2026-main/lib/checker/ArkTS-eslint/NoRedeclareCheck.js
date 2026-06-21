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
exports.NoRedeclareCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoRedeclareCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-redeclare.md',
    description: 'Disallow variable redeclaration.'
};
var CheckType;
(function (CheckType) {
    CheckType[CheckType["interface"] = 0] = "interface";
    CheckType[CheckType["namespace"] = 1] = "namespace";
    CheckType[CheckType["class"] = 2] = "class";
    CheckType[CheckType["function"] = 3] = "function";
    CheckType[CheckType["enum"] = 4] = "enum";
    CheckType[CheckType["typeAlias"] = 5] = "typeAlias";
    CheckType[CheckType["variable"] = 6] = "variable";
    CheckType[CheckType["vars"] = 7] = "vars";
    CheckType[CheckType["param"] = 8] = "param";
    CheckType[CheckType["import"] = 9] = "import";
    CheckType[CheckType["global"] = 10] = "global";
    CheckType[CheckType["globalLabel"] = 11] = "globalLabel";
})(CheckType || (CheckType = {}));
class NoRedeclareCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    defaultTypes = ['Array', 'Object', 'Function', 'Boolean', 'String', 'Number', 'Symbol', 'Date', 'RegExp', 'Promise', 'Proxy', 'Map', 'Set', 'WeakMap',
        'WeakSet', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI',
        'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'Infinity', 'NaN', 'undefined', 'JSON', 'Math', 'Intl', 'Atomics', 'Reflect', 'WebAssembly', 'BigInt', 'toString'];
    builtinGlobals = true;
    ignoreDeclarationMerge = true;
    globalKeyword = 'global';
    globalsKeyword = 'globals';
    keywordList = [this.globalKeyword, this.globalsKeyword];
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        if (this.rule && this.rule.option) {
            const option = this.rule.option;
            if (option.length > 0) {
                this.builtinGlobals = option[0].builtinGlobals;
                this.ignoreDeclarationMerge = option[0].ignoreDeclarationMerge;
            }
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        this.checkGlobals(sourceFile, targetFile);
        this.loopNode(targetFile, sourceFile, sourceFileObject);
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.SyntaxList) {
                if (!arkanalyzer_1.ts.isSourceFile(child.parent)) {
                    this.checkSyntaxListRedeclare(targetFile, sourceFile, child);
                }
            }
            else if (child.kind === arkanalyzer_1.ts.SyntaxKind.Block) {
                this.checkBlockRedeclare(targetFile, sourceFile, child);
            }
            else if (arkanalyzer_1.ts.isImportDeclaration(child)) {
                this.checkImportRedeclare(targetFile, sourceFile, child);
            }
            else {
                const memberList = this.objectNeedCheck(child, child);
                for (const member of memberList) {
                    this.checkRedeclare(targetFile, sourceFile, member);
                }
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    // 检测参数和代码块内的变量是否重定义，例如 function A(p) { var p; }
    checkBlockRedeclare(targetFile, sourceFile, aNode) {
        const parent = aNode.parent;
        if (!parent) {
            return;
        }
        if (arkanalyzer_1.ts.isFunctionDeclaration(parent)) {
            const paramList = [];
            for (const parameter of parent.parameters) {
                const obj = { name: parameter.name.getText(), nameNode: parameter, node: parameter, forParentNode: aNode, type: CheckType.vars };
                paramList.push(obj);
            }
            if (paramList.length === 0) {
                return;
            }
            const syntaxNodeList = this.objectNeedCheck(aNode, aNode.parent);
            for (const node of syntaxNodeList) {
                this.checkRedeclareInMembers(targetFile, sourceFile, node, paramList);
            }
        }
        else {
            const memberList = this.objectNeedCheck(aNode, aNode.parent);
            for (const member of memberList) {
                this.checkRedeclare(targetFile, sourceFile, member);
            }
        }
    }
    // 检测导入的变量，例如 import foo4 from 'bar'
    checkImportRedeclare(targetFile, sourceFile, aNode) {
        const memberList = this.objectNeedCheck(aNode, aNode);
        for (const member of memberList) {
            this.checkRedeclare(targetFile, sourceFile, member);
        }
    }
    checkSyntaxListRedeclare(targetFile, sourceFile, aNode) {
        const memberList = this.getSyntaxListNodes(aNode, aNode);
        for (const checkMember of memberList) {
            this.checkRedeclareInMembers(targetFile, sourceFile, checkMember, memberList);
        }
    }
    getSpecifyChild(aNode, kind) {
        for (const child of aNode.getChildren()) {
            if (child.kind === kind) {
                return child;
            }
            let result = this.getSpecifyChild(child, kind);
            if (result) {
                return result;
            }
        }
    }
    checkRedeclare(targetFile, sourceFile, aNode) {
        let parent = aNode.forParentNode.parent;
        if (!parent) {
            return;
        }
        if (arkanalyzer_1.ts.isBlock(parent)) {
            parent = parent.getChildren()[1];
        }
        let children = parent.getChildren();
        if (children.length === 0) {
            return;
        }
        if (parent.kind === arkanalyzer_1.ts.SyntaxKind.SourceFile) {
            children = children[0].getChildren();
        }
        this.checkRedeclareInNodes(targetFile, sourceFile, aNode, children);
    }
    checkRedeclareInMembers(targetFile, sourceFile, aNode, memberList) {
        let nodeList = [];
        for (const checkMember of memberList) {
            nodeList.push(checkMember.node);
        }
        this.checkRedeclareInNodes(targetFile, sourceFile, aNode, nodeList);
    }
    checkBuiltIn(targetFile, sourceFile, name, startLine, startCol, type, aNode) {
        if (type === CheckType.param || type === CheckType.globalLabel) {
            return false;
        }
        if (this.checkNodeInBlock(aNode)) {
            return false;
        }
        if (this.isBuiltinKeyword(name)) {
            const message = "'" + name + "' is already defined as a built-in global variable.";
            this.addIssueReport(targetFile, startLine, startCol, 0, message);
            return true;
        }
        return false;
    }
    // 检查节点是否在block内: const { weight, toString } = this;
    checkNodeInBlock(aNode) {
        if (aNode.kind === arkanalyzer_1.ts.SyntaxKind.VariableDeclarationList) {
            if (aNode.parent.parent && aNode.parent.parent.kind === arkanalyzer_1.ts.SyntaxKind.SourceFile) {
                return false;
            }
        }
        const parent = aNode.parent;
        if (!parent) {
            return false;
        }
        const children = parent.getChildren();
        if (children[0].kind === arkanalyzer_1.ts.SyntaxKind.OpenBraceToken) {
            return true;
        }
        return this.checkNodeInBlock(parent);
    }
    checkRedeclareInNodes(targetFile, sourceFile, aNode, nodeList) {
        const originStartPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.nameNode.getStart());
        const startLine = originStartPosition.line + 1;
        const startCol = originStartPosition.character + 1;
        if (this.checkBuiltIn(targetFile, sourceFile, aNode.name, startLine, startCol, aNode.type, aNode.forParentNode)) {
            return;
        }
        for (const child of nodeList) {
            const memberList = this.objectNeedCheck(child, aNode.forParentNode);
            for (const member of memberList) {
                if (member.node.pos === aNode.node.pos && member.node.kind === aNode.node.kind) {
                    continue;
                }
                if (member.name !== aNode.name) {
                    continue;
                }
                const targetStartPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, member.nameNode.getStart());
                if (targetStartPosition.line > originStartPosition.line ||
                    (targetStartPosition.line === originStartPosition.line && targetStartPosition.character > originStartPosition.character)) {
                    continue;
                }
                if (this.isNodeChecked(sourceFile, member.nameNode)) {
                    continue;
                }
                if (!this.needCheckIgnoreDeclarationMerge(aNode, member)) {
                    continue;
                }
                let reportIssue = false;
                // 如果两个都是变量，且都是用var声明的，报错
                if (member.type === CheckType.variable && aNode.type === CheckType.variable) {
                    reportIssue = true;
                }
                else {
                    // 在同一作用域，报错
                    reportIssue = (member.node.parent.getText() === aNode.node.parent.getText()) ||
                        (member.node.parent.getText() === aNode.forParentNode.getText() ||
                            (member.scopeNode?.getText() === aNode.scopeNode?.getText()));
                }
                if (reportIssue) {
                    const message = "'" + aNode.name + "' is already defined.";
                    this.addIssueReport(targetFile, startLine, startCol, 0, message);
                }
            }
        }
    }
    // 要检测的节点是否已经在错误列表中
    isNodeChecked(sourceFile, aNode) {
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
        const startLine = startPosition.line + 1;
        const startCol = startPosition.character + 1;
        for (const issue of this.issues) {
            if (issue.defect.reportLine === startLine && issue.defect.reportColumn === startCol) {
                return true;
            }
        }
        return false;
    }
    objectNeedCheck(node, forParentNode, scopeNode) {
        if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
            if (node.name?.text) {
                return [{ name: node.name?.text, node: node, nameNode: node.name, forParentNode: forParentNode, type: CheckType.namespace }];
            }
        }
        else if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            if (node.name?.text) {
                return [{ name: node.name?.text, node: node, nameNode: node.name, forParentNode: forParentNode, type: CheckType.class }];
            }
        }
        else if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
            if (node.name?.text) {
                return [{ name: node.name?.text, node: node, nameNode: node.name, forParentNode: forParentNode, type: CheckType.interface }];
            }
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            if (node.name?.text) {
                return [{ name: node.name?.text, node: node, nameNode: node.name, forParentNode: forParentNode, type: CheckType.typeAlias }];
            }
        }
        else if (arkanalyzer_1.ts.isVariableStatement(node)) {
            return this.getVariableStatementNodes(node, forParentNode);
        }
        else { // 太长，分成两个函数
            return this.objectNeedCheckContinuous(node, forParentNode, scopeNode);
        }
        return [];
    }
    objectNeedCheckContinuous(node, forParentNode, scopeNode) {
        if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node)) {
            return this.getFunctionNodes(node, node);
        }
        else if (arkanalyzer_1.ts.isEnumDeclaration(node)) {
            if (node.name?.text) {
                return [{ name: node.name?.text, nameNode: node.name, node: node, forParentNode: forParentNode, type: CheckType.enum }];
            }
        }
        else if (arkanalyzer_1.ts.isSwitchStatement(node)) {
            return this.getSwitchCaseNodes(node, forParentNode);
        }
        else if (arkanalyzer_1.ts.isIfStatement(node)) {
            return this.getIfNodes(node, forParentNode);
        }
        else if (arkanalyzer_1.ts.isBlock(node)) {
            return (node.getChildren().length === 3) ? this.getSyntaxListNodes(node.getChildren()[1], forParentNode) : [];
        }
        else if (arkanalyzer_1.ts.isParameter(node)) {
            return [{ name: node.name.getText(), nameNode: node.name, node: node, forParentNode: forParentNode, type: CheckType.param }];
        }
        else if (arkanalyzer_1.ts.isVariableDeclarationList(node)) {
            return this.getVariableDeclarationListNode(node, forParentNode);
        }
        else if (arkanalyzer_1.ts.isForStatement(node)) {
            return this.getForStatementNodes(node);
        }
        else if (arkanalyzer_1.ts.isImportDeclaration(node)) {
            return this.getImportDeclarationNodes(node, node);
        }
        else if (arkanalyzer_1.ts.isWhileStatement(node)) {
            return this.getWhileNodesImplement(node, node);
        }
        else if (arkanalyzer_1.ts.isForOfStatement(node) || arkanalyzer_1.ts.isForInStatement(node)) {
            return this.getForNodes(node, node);
        }
        else if (arkanalyzer_1.ts.isImportEqualsDeclaration(node)) {
            return this.getImportEqualsDeclarationNode(node);
        }
        return [];
    }
    getVariableDeclarationListNode(node, forParentNode) {
        let members = [];
        let onlyAllowVar = false;
        if (forParentNode.kind === arkanalyzer_1.ts.SyntaxKind.ForStatement) {
            onlyAllowVar = true;
        }
        else if (node.parent.kind === arkanalyzer_1.ts.SyntaxKind.ForStatement) {
            onlyAllowVar = true;
        }
        // 如果是for循环，只检查var声明的变量
        for (const declaration of node.declarations) {
            const nameNode = declaration.name;
            if (arkanalyzer_1.ts.isArrayBindingPattern(nameNode)) {
                members = members.concat(this.getBindNameNodeMember(nameNode, forParentNode));
            }
            else if (arkanalyzer_1.ts.isObjectBindingPattern(nameNode)) {
                for (const element of nameNode.elements) {
                    members.push({ name: element.name.getText(), nameNode: element.name, node: element,
                        forParentNode: forParentNode.parent, type: CheckType.vars, scopeNode: node.parent.parent });
                }
            }
            else {
                const varDeclare = node.getText().startsWith('var ');
                if (!(onlyAllowVar && !varDeclare)) {
                    members.push({ name: declaration.name.getText(), nameNode: declaration.name, node: declaration,
                        forParentNode: forParentNode, type: (varDeclare ? CheckType.variable : CheckType.vars), scopeNode: node.parent.parent });
                }
            }
        }
        return members;
    }
    getBindNameNodeMember(nameNode, forParentNode) {
        let members = [];
        for (const element of nameNode.elements) {
            if (arkanalyzer_1.ts.isBindingElement(element)) {
                members.push({ name: element.name.getText(), nameNode: element.name, node: element,
                    forParentNode: forParentNode.parent, type: CheckType.vars });
            }
        }
        return members;
    }
    getImportEqualsDeclarationNode(aNode) {
        let members = [];
        const children = aNode.getChildren();
        if (children.length > 1 && children[1].kind === arkanalyzer_1.ts.SyntaxKind.Identifier) {
            const idNode = children[1];
            if (arkanalyzer_1.ts.isIdentifier(idNode)) {
                members.push({ name: idNode.getText(), nameNode: idNode, node: aNode, forParentNode: aNode, type: CheckType.import });
            }
        }
        return members;
    }
    getFunctionNodes(node, forParentNode) {
        let members = [];
        if (!node.body) {
            return members;
        }
        if (node.getChildren()[0].getText() === 'declare') {
            return members;
        }
        if (node.name?.text) {
            members.push({ name: node.name?.text, nameNode: node.name, node: node, forParentNode: forParentNode, type: CheckType.function });
        }
        return members;
    }
    getImportDeclarationNodes(node, forParentNode) {
        let members = [];
        if (node.importClause?.name?.text) { // import Type from 'foo';
            members.push({ name: node.importClause?.name?.text, nameNode: node.importClause?.name, node: node,
                forParentNode: forParentNode, type: CheckType.import, scopeNode: forParentNode.parent });
        }
        // 对如下样例代码的检查：import type { Type } from 'foo';
        const namedBindings = node.importClause?.namedBindings;
        if (!namedBindings) {
            return members;
        }
        const children = namedBindings.getChildren();
        for (const child of children) {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.SyntaxList) {
                members = members.concat(this.getImportNodes(node, children[1], forParentNode));
            }
            else if (arkanalyzer_1.ts.isIdentifier(child)) {
                members.push({ name: child.getText(), nameNode: child, node: node, forParentNode: forParentNode, type: CheckType.import });
            }
        }
        return members;
    }
    getImportNodes(node, aNode, forParentNode) {
        let members = [];
        for (const child of aNode.getChildren()) {
            if (arkanalyzer_1.ts.isImportSpecifier(child)) {
                members.push({ name: child.name.text, nameNode: child.name, node: node, forParentNode: forParentNode, type: CheckType.import });
            }
        }
        return members;
    }
    getVariableStatementNodes(aNode, forParentNode) {
        let declarationList = aNode.declarationList.declarations;
        if (declarationList.length === 0) {
            return [];
        }
        let members = [];
        for (const variableDeclarator of declarationList) {
            let varName = variableDeclarator.name;
            if (arkanalyzer_1.ts.isIdentifier(varName)) {
                const varDeclare = aNode.getText().startsWith('var ');
                members.push({ name: varName.text, nameNode: varName, node: aNode, forParentNode: forParentNode,
                    type: (varDeclare ? CheckType.variable : CheckType.vars), scopeNode: aNode.parent });
            }
            else if (arkanalyzer_1.ts.isObjectBindingPattern(varName)) {
                for (const element of varName.elements) {
                    const obj = { name: element.name.getText(), nameNode: element.name, node: element,
                        forParentNode: forParentNode.parent, type: CheckType.variable, scopeNode: aNode.parent };
                    members.push(obj);
                }
            }
            else if (arkanalyzer_1.ts.isArrayBindingPattern(varName)) {
                members = members.concat(this.getArrayBindingPatternNode(varName, aNode, forParentNode));
            }
        }
        return members;
    }
    getArrayBindingPatternNode(varName, aNode, forParentNode) {
        let members = [];
        for (const element of varName.elements) {
            if (arkanalyzer_1.ts.isBindingElement(element)) {
                members.push({ name: element.name.getText(), nameNode: element.name, node: element,
                    forParentNode: forParentNode.parent, type: CheckType.vars, scopeNode: aNode.parent });
            }
        }
        return members;
    }
    getIfNodes(aNode, forParentNode) {
        return this.getIfNodesImplement(aNode, forParentNode);
    }
    getIfNodesImplement(aNode, forParentNode) {
        let members = [];
        const thenStatement = aNode.thenStatement;
        if (arkanalyzer_1.ts.isBlock(thenStatement)) {
            if (thenStatement.getChildren().length === 3) {
                const syntaxNode = thenStatement.getChildren()[1];
                members = members.concat(this.getSyntaxListNodes(syntaxNode, forParentNode));
            }
        }
        else {
            members = members.concat(this.objectNeedCheck(thenStatement, forParentNode));
        }
        const elseStatement = aNode.elseStatement;
        if (elseStatement) {
            if (arkanalyzer_1.ts.isIfStatement(elseStatement)) {
                members = members.concat(this.getIfNodesImplement(elseStatement, forParentNode));
            }
            else if (arkanalyzer_1.ts.isBlock(elseStatement)) {
                if (thenStatement.getChildren().length === 3) {
                    const syntaxNode = thenStatement.getChildren()[1];
                    members = members.concat(this.getSyntaxListNodes(syntaxNode, forParentNode));
                }
            }
            else {
                members = members.concat(this.objectNeedCheck(elseStatement, forParentNode));
            }
        }
        return members;
    }
    getWhileNodesImplement(aNode, forParentNode) {
        let members = [];
        const children = aNode.statement.getChildren();
        if (children.length === 3) {
            for (const child of children[1].getChildren()) {
                members = members.concat(this.objectNeedCheck(child, aNode));
            }
        }
        return members;
    }
    getForNodes(aNode, forParentNode) {
        let members = [];
        if (arkanalyzer_1.ts.isVariableDeclarationList(aNode.initializer)) {
            const list = members.concat(this.objectNeedCheck(aNode.initializer, aNode));
            for (const checkMember of list) {
                if (checkMember.type === CheckType.variable) {
                    members.push(checkMember);
                }
            }
        }
        const contents = aNode.statement.getChildren();
        if (contents.length === 3) {
            const content = contents[1];
            for (const child of content.getChildren()) {
                members = members.concat(this.objectNeedCheck(child, aNode, aNode.parent));
            }
        }
        else {
            const content = aNode.statement;
            members = members.concat(this.objectNeedCheck(content, aNode, aNode.parent));
        }
        return members;
    }
    getForStatementNodes(aNode) {
        let members = [];
        const contents = aNode.statement.getChildren();
        if (contents.length === 3) {
            const content = contents[1];
            for (const child of content.getChildren()) {
                members = members.concat(this.objectNeedCheck(child, aNode, aNode.parent));
            }
        }
        else {
            const content = aNode.statement;
            members = members.concat(this.objectNeedCheck(content, aNode, aNode.parent));
        }
        if (aNode.initializer && arkanalyzer_1.ts.isVariableDeclarationList(aNode.initializer)) {
            const list = this.objectNeedCheck(aNode.initializer, aNode, aNode.parent);
            for (const member of list) {
                if (member.type === CheckType.variable) {
                    members.push(member);
                }
            }
        }
        return members;
    }
    getSwitchCaseNodes(aNode, forParentNode) {
        const caseNode = this.getSpecifyChild(aNode, arkanalyzer_1.ts.SyntaxKind.CaseBlock);
        if (!caseNode) {
            return [];
        }
        const syntaxNode = this.getSpecifyChild(caseNode, arkanalyzer_1.ts.SyntaxKind.SyntaxList);
        if (!syntaxNode) {
            return [];
        }
        let memberList = [];
        for (const child of syntaxNode.getChildren()) {
            if (!arkanalyzer_1.ts.isCaseOrDefaultClause(child)) {
                continue;
            }
            memberList = memberList.concat(this.getCaseOrDefaultClauseNodes(child, forParentNode));
        }
        return memberList;
    }
    getCaseOrDefaultClauseNodes(child, forParentNode) {
        let memberList = [];
        for (const childElement of child.statements) {
            const members = this.objectNeedCheck(childElement, forParentNode);
            for (const member of members) {
                if (member.type === CheckType.variable) {
                    memberList.push(member);
                }
            }
        }
        return memberList;
    }
    getSyntaxListNodes(aNode, forParentNode) {
        let memberList = [];
        for (const child of aNode.getChildren()) {
            if (arkanalyzer_1.ts.isVariableStatement(child)) {
                const member = this.objectNeedCheck(child, forParentNode);
                memberList = memberList.concat(member);
            }
        }
        return memberList;
    }
    isBuiltinKeyword(keyword) {
        if (this.builtinGlobals) {
            if (this.defaultTypes.includes(keyword)) {
                return true;
            }
        }
        return false;
    }
    needCheckIgnoreDeclarationMerge(firstNode, secondNode) {
        if (this.ignoreDeclarationMerge) {
            if ((firstNode.type === CheckType.interface && secondNode.type === CheckType.interface) ||
                (firstNode.type === CheckType.namespace && secondNode.type === CheckType.namespace) ||
                (firstNode.type === CheckType.class && secondNode.type === CheckType.interface) ||
                (firstNode.type === CheckType.interface && secondNode.type === CheckType.class) ||
                (firstNode.type === CheckType.class && secondNode.type === CheckType.namespace) ||
                (firstNode.type === CheckType.namespace && secondNode.type === CheckType.class) ||
                (firstNode.type === CheckType.interface && secondNode.type === CheckType.namespace) ||
                (firstNode.type === CheckType.namespace && secondNode.type === CheckType.interface) ||
                (firstNode.type === CheckType.enum && secondNode.type === CheckType.namespace) ||
                (firstNode.type === CheckType.namespace && secondNode.type === CheckType.enum)) {
                return false;
            }
        }
        return true;
    }
    checkGlobals(sourceFile, targetFile) {
        let commentsListList = [];
        const comments = this.getComments(sourceFile, targetFile.getFilePath());
        for (const comment of comments) {
            let position = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, comment.pos);
            const commentText = sourceFile.getFullText().substring(comment.pos, comment.end);
            if (comment.kind !== arkanalyzer_1.ts.SyntaxKind.MultiLineCommentTrivia) {
                continue;
            }
            if (commentText.length < 5) {
                continue;
            }
            let content = commentText.substring(2, commentText.length - 2);
            if (this.isGlobal(content)) {
                continue;
            }
            // 找出前面空格数
            let spaceCount = this.getLeftSpace(content);
            content = content.substring(spaceCount);
            const contentIndex = 2 + spaceCount;
            const aSourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(targetFile.getName(), content);
            const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(aSourceFile);
            if (sourceFileObject === undefined) {
                continue;
            }
            let children = sourceFileObject.getChildren();
            if (children.length !== 2) {
                continue;
            }
            children = children[0].getChildren();
            const commentsList = this.getCommonList(sourceFile, targetFile, aSourceFile, position, contentIndex, children);
            if (commentsList.length > 0) {
                commentsListList.push(commentsList);
            }
        }
        this.handleCommonListList(commentsListList, targetFile);
    }
    getCommonList(sourceFile, targetFile, aSourceFile, position, contentIndex, children) {
        let commentsList = [];
        let previousGlobals = false;
        for (let idx = 0; idx < children.length; idx++) {
            const child = children[idx];
            if (this.keywordList.includes(child.getText())) {
                previousGlobals = true;
                continue;
            }
            if (arkanalyzer_1.ts.isLabeledStatement(child)) {
                const result = this.getLabeledStatement(sourceFile, targetFile, aSourceFile, position, contentIndex, child, previousGlobals);
                if (!result.needContinue && result.member) {
                    commentsList.push(result.member);
                }
            }
            else if (arkanalyzer_1.ts.isExpressionStatement(child)) {
                const result = this.handleExpressStatement(sourceFile, targetFile, aSourceFile, position, contentIndex, child, previousGlobals, idx);
                commentsList = commentsList.concat(result.members);
                previousGlobals = result.previousGlobals;
            }
        }
        return commentsList;
    }
    handleExpressStatement(sourceFile, targetFile, aSourceFile, position, contentIndex, child, previousGlobals, idx) {
        let commentsList = [];
        for (const nodeElement of child.getChildren()) {
            let inPreviousGlobals = false;
            if (arkanalyzer_1.ts.isBinaryExpression(nodeElement)) {
                const result = this.handleBinaryExpression(sourceFile, targetFile, aSourceFile, position, contentIndex, nodeElement, previousGlobals, inPreviousGlobals);
                commentsList = commentsList.concat(result.members);
                previousGlobals = result.previousGlobals;
                inPreviousGlobals = result.inPreviousGlobals;
            }
            if (arkanalyzer_1.ts.isIdentifier(nodeElement)) {
                if (this.keywordList.includes(nodeElement.getText())) {
                    previousGlobals = true;
                }
                else {
                    const pos = this.getNodePosition(aSourceFile, nodeElement, position.line, position.character + contentIndex);
                    if (this.checkBuiltIn(targetFile, sourceFile, nodeElement.getText(), pos.line, pos.character, CheckType.global, nodeElement)) {
                        continue;
                    }
                    if (idx === 1 && previousGlobals) {
                        commentsList.push({
                            sourceFile: aSourceFile,
                            node: nodeElement,
                            position: position,
                            contentIndex: contentIndex
                        });
                        previousGlobals = false;
                        inPreviousGlobals = false;
                    }
                }
            }
            previousGlobals = inPreviousGlobals || (arkanalyzer_1.ts.isIdentifier(nodeElement) && this.keywordList.includes(nodeElement.getText()));
        }
        return { previousGlobals: previousGlobals, members: commentsList };
    }
    handleBinaryExpression(sourceFile, targetFile, aSourceFile, position, contentIndex, nodeElement, previousGlobals, inPreviousGlobals) {
        let commentsList = [];
        const nodeElementChildren = this.getBinaryExpressionChildren(nodeElement);
        for (let i = 0; i < nodeElementChildren.length; i++) {
            const element = nodeElementChildren[i];
            const pos = this.getNodePosition(aSourceFile, element, position.line, position.character + contentIndex);
            if (!this.checkBuiltIn(targetFile, sourceFile, element.getText(), pos.line, pos.character, CheckType.global, nodeElement)) {
                if (arkanalyzer_1.ts.isIdentifier(element) && (previousGlobals && i === 0)) {
                    commentsList.push({ sourceFile: aSourceFile, node: element, position: position, contentIndex: contentIndex });
                    previousGlobals = false;
                }
                inPreviousGlobals = arkanalyzer_1.ts.isIdentifier(element) && this.keywordList.includes(element.getText());
            }
        }
        return { previousGlobals: previousGlobals, inPreviousGlobals: inPreviousGlobals, members: commentsList };
    }
    getLabeledStatement(sourceFile, targetFile, aSourceFile, position, contentIndex, child, previousGlobals) {
        let continueFlag = false;
        const pos = this.getNodePosition(sourceFile, child, position.line, position.character + contentIndex);
        if (this.checkBuiltIn(targetFile, aSourceFile, child.label.getText(), pos.line, pos.character, CheckType.globalLabel, child)) {
            continueFlag = true;
        }
        let member;
        if (previousGlobals) {
            const element = child.label;
            member = { sourceFile: aSourceFile, node: element, position: position, contentIndex: contentIndex };
        }
        return { needContinue: continueFlag, member: member };
    }
    // 找出字符串前面空格数
    getLeftSpace(content) {
        let spaceCount = 0;
        for (const contentKey of content) {
            if (contentKey === ' ') {
                spaceCount = spaceCount + 1;
            }
            else if (contentKey === '\r\n') {
                spaceCount = spaceCount + 4;
            }
            else {
                break;
            }
        }
        return spaceCount;
    }
    isGlobal(content) {
        const globalKeyword = this.globalKeyword;
        const globalsKeyword = this.globalsKeyword;
        return (!content.startsWith(' ' + globalKeyword) && !content.startsWith('\r\n' + globalKeyword) &&
            !content.startsWith(' ' + globalsKeyword) && !content.startsWith('\r\n' + globalsKeyword) &&
            !content.startsWith(globalKeyword) && !content.startsWith('\r\n' + globalKeyword) &&
            !content.startsWith(globalsKeyword) && !content.startsWith('\r\n' + globalsKeyword));
    }
    handleCommonListList(commentsListList, targetFile) {
        for (let i = 0; i < commentsListList.length; i++) {
            const list = commentsListList[i];
            for (let j = 0; j < list.length; j++) {
                const sourceNode = list[j];
                this.compareCommon(commentsListList, targetFile, i, sourceNode);
            }
        }
    }
    compareCommon(commentsListList, targetFile, index, sourceNode) {
        for (let m = 0; m < commentsListList.length; m++) {
            const listObject = commentsListList[m];
            if (m === index) {
                continue;
            }
            for (let n = 0; n < listObject.length; n++) {
                const nodeObject = listObject[n];
                if (nodeObject.node.getText() !== sourceNode.node.getText()) {
                    continue;
                }
                const sourceLine = sourceNode.position.line;
                const sourceCol = sourceNode.position.character + nodeObject.contentIndex;
                const line = nodeObject.position.line;
                const col = nodeObject.position.character + nodeObject.contentIndex;
                if (sourceLine < line || (sourceLine === line && sourceCol < col)) {
                    this.addGlobalNode(nodeObject.sourceFile, targetFile, nodeObject.node, line, col);
                }
            }
        }
    }
    getBinaryExpressionChildren(aNode) {
        let children = [];
        const nodeList = aNode.getChildren();
        for (const element of nodeList) {
            if (arkanalyzer_1.ts.isBinaryExpression(element)) {
                children = children.concat(this.getBinaryExpressionChildren(element));
            }
            else {
                if (arkanalyzer_1.ts.isIdentifier(element)) {
                    children.push(element);
                }
            }
        }
        return children;
    }
    getNodePosition(sourceFile, aNode, line, col) {
        const originStartPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
        let startLine = originStartPosition.line + line;
        let startCol = 0;
        if (originStartPosition.line > 0) {
            startCol = originStartPosition.character;
        }
        else {
            startCol = originStartPosition.character + col;
        }
        startLine = startLine + 1;
        startCol = startCol + 1;
        return { line: startLine, character: startCol };
    }
    addGlobalNode(sourceFile, targetFile, aNode, line, col) {
        const position = this.getNodePosition(sourceFile, aNode, line, col);
        const message = "'" + aNode.getText() + "' is already defined.";
        this.addIssueReport(targetFile, position.line, position.character, 0, message);
    }
    // 获取文件中所有注释（包括前导、尾随和未附着的注释）
    getComments(sourceFile, filePath) {
        const text = sourceFile.text;
        const commentRanges = [];
        const seenComments = new Set(); // 用于去重
        const visitNode = (node) => {
            const processCommentRanges = (ranges) => {
                if (!ranges)
                    return;
                ranges.forEach((commentRange) => {
                    const key = `${commentRange.pos}-${commentRange.end}`;
                    if (!seenComments.has(key)) {
                        commentRanges.push(commentRange);
                        seenComments.add(key);
                    }
                });
            };
            const leadingComments = arkanalyzer_1.ts.getLeadingCommentRanges(text, node.pos);
            processCommentRanges(leadingComments);
            const trailingComments = arkanalyzer_1.ts.getTrailingCommentRanges(text, node.end);
            processCommentRanges(trailingComments);
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return commentRanges;
    }
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        for (const issue of this.issues) {
            if (issue.defect.reportLine === line && issue.defect.reportColumn === startCol) {
                return;
            }
        }
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        // 对 issues 进行排序
        this.issues.sort((a, b) => {
            if (a.defect.reportLine === b.defect.reportLine) {
                return a.defect.reportColumn - b.defect.reportColumn;
            }
            return a.defect.reportLine - b.defect.reportLine;
        });
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoRedeclareCheck = NoRedeclareCheck;
