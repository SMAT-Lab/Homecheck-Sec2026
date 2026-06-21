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
exports.NoShadowCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoShadowCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-shadow.md',
    description: 'Disallow variable declarations from shadowing variables declared in the outer scope.'
};
var CheckType;
(function (CheckType) {
    CheckType[CheckType["interface"] = 0] = "interface";
    CheckType[CheckType["namespace"] = 1] = "namespace";
    CheckType[CheckType["class"] = 2] = "class";
    CheckType[CheckType["function"] = 3] = "function";
    CheckType[CheckType["enum"] = 4] = "enum";
    CheckType[CheckType["typeAlias"] = 5] = "typeAlias";
    CheckType[CheckType["let"] = 6] = "let";
    CheckType[CheckType["var"] = 7] = "var";
    CheckType[CheckType["param"] = 8] = "param";
    CheckType[CheckType["import"] = 9] = "import";
    CheckType[CheckType["global"] = 10] = "global";
    CheckType[CheckType["globalLabel"] = 11] = "globalLabel";
    CheckType[CheckType["module"] = 12] = "module";
    CheckType[CheckType["const"] = 13] = "const";
})(CheckType || (CheckType = {}));
class NoShadowCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    ruleOptions = { ignoreTypeValueShadow: true, ignoreFunctionTypeParameterNameValueShadow: true };
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    // 定义需要特殊处理的节点类型检查器
    static SPECIAL_NODE_CHECKS = [
        arkanalyzer_1.ts.isCatchClause,
        arkanalyzer_1.ts.isEnumMember,
        arkanalyzer_1.ts.isEnumDeclaration,
        arkanalyzer_1.ts.isGetAccessorDeclaration,
        arkanalyzer_1.ts.isSetAccessorDeclaration,
        arkanalyzer_1.ts.isForStatement,
    ];
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        let options = this.rule.option;
        if (options.length > 0) {
            this.ruleOptions = options[0];
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        this.loopNode(targetFile, sourceFile, sourceFileObject);
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (this.isObjectGlobal(child) || arkanalyzer_1.ts.isToken(child)) {
                continue;
            }
            this.checkObject(targetFile, sourceFile, child);
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkObject(targetFile, sourceFile, aNode) {
        const members = this.getCheckObject(targetFile, sourceFile, aNode);
        for (const member of members) {
            this.checkShadow(targetFile, sourceFile, member);
        }
    }
    // 获取需要检查的对象
    getCheckObject(targetFile, sourceFile, aNode) {
        let members = [];
        if (arkanalyzer_1.ts.isParameter(aNode) || arkanalyzer_1.ts.isTypeParameterDeclaration(aNode)) {
            this.handleNamedNode(aNode, CheckType.param, members);
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(aNode) || arkanalyzer_1.ts.isInterfaceDeclaration(aNode)) {
            members = members.concat(this.handleTypeNode(aNode));
        }
        else if (arkanalyzer_1.ts.isEnumMember(aNode)) {
            this.handleEnumMember(aNode, members);
        }
        else if (arkanalyzer_1.ts.isClassDeclaration(aNode) || arkanalyzer_1.ts.isClassExpression(aNode)) {
            this.handleNamedNode(aNode, CheckType.class, members);
        }
        else if (arkanalyzer_1.ts.isModuleDeclaration(aNode)) {
            this.handleNamedNode(aNode, CheckType.module, members);
        }
        else if (arkanalyzer_1.ts.isFunctionExpression(aNode) || arkanalyzer_1.ts.isFunctionDeclaration(aNode)) {
            this.handleNamedNode(aNode, CheckType.function, members);
        }
        else if (arkanalyzer_1.ts.isVariableDeclarationList(aNode)) {
            members = members.concat(this.getVariableDeclarationListNodes(aNode));
        }
        else if (arkanalyzer_1.ts.isTryStatement(aNode) || arkanalyzer_1.ts.isCatchClause(aNode)) {
            members = members.concat(this.getTryStatementNodes(aNode));
        }
        else if (arkanalyzer_1.ts.isEnumDeclaration(aNode)) {
            this.handleNamedNode(aNode, CheckType.enum, members);
        }
        return members;
    }
    // 处理单个命名节点
    handleNamedNode(node, type, members) {
        if (node.name) {
            const member = this.getBindingNameNode(node.name, type);
            if (member) {
                members.push(member);
            }
        }
    }
    // 处理枚举成员
    handleEnumMember(node, members) {
        const member = this.getPropertyNameNode(node.name, CheckType.enum);
        if (member) {
            members.push(member);
        }
    }
    // 处理代码块中的变量声明
    handleBlockStatements(block, members) {
        if (!block?.statements?.length) {
            return;
        }
        // 使用 for...of 替代 for 循环，更简洁且性能更好
        for (const statement of block.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(statement)) {
                members.push(...this.getVariableDeclarationListNodes(statement.declarationList));
            }
        }
    }
    getTryStatementNodes(aNode) {
        let members = [];
        // 提前进行类型检查
        if (!aNode) {
            return members;
        }
        if (arkanalyzer_1.ts.isTryStatement(aNode)) {
            // 处理 try 块
            if (aNode.tryBlock) {
                this.handleBlockStatements(aNode.tryBlock, members);
            }
            // 处理 finally 块
            if (aNode.finallyBlock) {
                this.handleBlockStatements(aNode.finallyBlock, members);
            }
        }
        else if (arkanalyzer_1.ts.isCatchClause(aNode)) {
            // 处理 catch 参数
            const { variableDeclaration, block } = aNode;
            if (variableDeclaration?.name) {
                this.handleNamedNode(variableDeclaration, CheckType.let, members);
            }
            // 处理 catch 块
            if (block) {
                this.handleBlockStatements(block, members);
            }
        }
        return members;
    }
    handleTypeNode(aNode) {
        let members = [];
        let member = undefined;
        if (this.ruleOptions.ignoreTypeValueShadow) {
            if (arkanalyzer_1.ts.isTypeAliasDeclaration(aNode) && arkanalyzer_1.ts.isTypeQueryNode(aNode.type)) {
                member = this.getBindingNameNode(aNode.name, CheckType.typeAlias);
            }
        }
        else {
            member = this.getBindingNameNode(aNode.name, arkanalyzer_1.ts.isInterfaceDeclaration(aNode) ? CheckType.interface : CheckType.typeAlias);
        }
        if (member) {
            members.push(member);
        }
        return members;
    }
    getVariableDeclarationListNodes(aNode) {
        let members = [];
        for (const declaration of aNode.declarations) {
            const member = this.getMember(aNode, declaration);
            if (member) {
                members.push(member);
            }
        }
        return members;
    }
    getMember(child, declaration) {
        let member = undefined;
        const isVar = child.getText().startsWith('var');
        const isLet = child.getText().startsWith('let');
        const isConst = child.getText().startsWith('const');
        if (isVar) {
            member = this.getBindingNameNode(declaration.name, CheckType.var);
        }
        else if (isLet) {
            member = this.getBindingNameNode(declaration.name, CheckType.let);
        }
        else if (isConst) {
            member = this.getBindingNameNode(declaration.name, CheckType.const);
        }
        return member;
    }
    getPropertyNameNode(nameNode, type) {
        let member = undefined;
        if (arkanalyzer_1.ts.isIdentifier(nameNode)) {
            if (nameNode.escapedText) {
                if (nameNode.escapedText !== 'this') {
                    member = { name: nameNode.escapedText, node: nameNode, type: type };
                }
            }
        }
        else if (arkanalyzer_1.ts.isStringLiteral(nameNode)) {
            member = { name: nameNode.text, node: nameNode, type: type };
        }
        else if (arkanalyzer_1.ts.isNumericLiteral(nameNode)) {
            member = { name: nameNode.text, node: nameNode, type: type };
        }
        else if (arkanalyzer_1.ts.isComputedPropertyName(nameNode)) {
            member = { name: nameNode.getText(), node: nameNode, type: type };
        }
        else if (arkanalyzer_1.ts.isPrivateIdentifier(nameNode)) {
            if (nameNode.escapedText) {
                member = { name: nameNode.escapedText, node: nameNode, type: type };
            }
        }
        return member;
    }
    getBindingNameNode(nameNode, type) {
        let member = undefined;
        if (arkanalyzer_1.ts.isIdentifier(nameNode)) {
            if (nameNode.escapedText) {
                if (nameNode.escapedText !== 'this') {
                    member = { name: nameNode.escapedText, node: nameNode, type: type };
                }
            }
        }
        else if (arkanalyzer_1.ts.isArrayBindingPattern(nameNode)) {
            for (const element of nameNode.elements) {
                if (arkanalyzer_1.ts.isBindingElement(element)) {
                    member = { name: element.name.getText(), node: element.name, type: type };
                }
            }
        }
        else if (arkanalyzer_1.ts.isObjectBindingPattern(nameNode)) {
            for (const element of nameNode.elements) {
                if (arkanalyzer_1.ts.isBindingElement(element)) {
                    member = { name: element.name.getText(), node: element.name, type: type };
                }
            }
        }
        else if (arkanalyzer_1.ts.isStringLiteral(nameNode)) {
            member = { name: nameNode.text, node: nameNode, type: type };
        }
        return member;
    }
    isObjectGlobal(aNode) {
        if (arkanalyzer_1.ts.isModuleDeclaration(aNode)) {
            const children = aNode.getChildren();
            if (children.length >= 2) {
                if (children[0].getText() === 'global' ||
                    (children[0].getText() === 'declare' && children[1].getText() === 'global')) {
                    return true;
                }
            }
        }
        return false;
    }
    checkShadow(targetFile, sourceFile, aNode) {
        const scopeNode = this.getNodeScopeNode(aNode.node, aNode.type);
        if (scopeNode) {
            this.checkShadowInParent(targetFile, sourceFile, aNode, scopeNode);
        }
    }
    getNodeScopeNode(aNode, type) {
        let parentNode = aNode.parent;
        if (parentNode === undefined) {
            return undefined;
        }
        if (arkanalyzer_1.ts.isEnumMember(parentNode)) {
            return parentNode.parent;
        }
        else if ((parentNode.kind >= arkanalyzer_1.ts.SyntaxKind.ArrayLiteralExpression && parentNode.kind <= arkanalyzer_1.ts.SyntaxKind.DebuggerStatement) ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.SourceFile ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.FunctionDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.TypeAliasDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.InterfaceDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.MethodDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.Constructor ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.EnumDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.ModuleDeclaration ||
            parentNode.kind === arkanalyzer_1.ts.SyntaxKind.ClassDeclaration) {
            const topScope = this.isTopScope(type);
            if ((arkanalyzer_1.ts.isForOfStatement(parentNode) ||
                arkanalyzer_1.ts.isFunctionDeclaration(parentNode) ||
                arkanalyzer_1.ts.isTypeAliasDeclaration(parentNode) ||
                arkanalyzer_1.ts.isInterfaceDeclaration(parentNode)) && !topScope) {
                parentNode = parentNode.getChildren()[0];
            }
            return parentNode;
        }
        else {
            return this.getNodeScopeNode(parentNode, type);
        }
    }
    isTopScope(type) {
        return type === CheckType.function || type === CheckType.typeAlias || type === CheckType.interface || type === CheckType.module;
    }
    // 检查当前节点是否需要特殊处理
    isSpecialNodeType(node) {
        let current = node;
        // 向上遍历所有父节点
        while (current) {
            // 检查当前节点是否匹配任一特殊类型
            if (NoShadowCheck.SPECIAL_NODE_CHECKS.some(check => check(current))) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 修改后的 checkShadowInParent 方法
    checkShadowInParent(targetFile, sourceFile, sourceNode, currentNode) {
        let parentNode = currentNode.parent;
        if (parentNode === undefined) {
            return;
        }
        let parentsNode = []; // 父节点和父节点的兄弟节点
        const parentParentNode = parentNode.parent;
        if (parentParentNode === undefined) {
            parentsNode.push(parentNode);
        }
        else {
            parentsNode = parentParentNode.getChildren();
        }
        let parents = this.getParentNodes(parentsNode, parentNode, sourceNode);
        for (const parent of parents) {
            // 如果找到同名的，则返回，避免找到多余的同名节点
            if (this.checkShadowInNodeChildren(targetFile, sourceFile, sourceNode, parent)) {
                return;
            }
        }
        this.checkShadowInParent(targetFile, sourceFile, sourceNode, parentNode);
    }
    getParentNodes(parentsNode, parentNode, sourceNode) {
        let parents = [];
        for (const node of parentsNode) {
            if (arkanalyzer_1.ts.isToken(node)) {
                continue;
            }
            // 使用新的方法来判断特殊节点类型
            if (node.kind === arkanalyzer_1.ts.SyntaxKind.SourceFile && this.isSpecialNodeType(sourceNode.node)) {
                parents = this.getSourceFileChildren(node, parents);
                continue;
            }
            if (node.kind !== arkanalyzer_1.ts.SyntaxKind.SyntaxList) {
                parents.push(node);
                continue;
            }
            for (const nodeElement of node.getChildren()) {
                if (nodeElement !== parentNode || !this.isTopScope(sourceNode.type)) {
                    parents.push(nodeElement);
                }
            }
        }
        return parents;
    }
    getSourceFileChildren(aNode, parents) {
        let childrens = aNode.getChildren();
        for (const child of childrens) {
            if (arkanalyzer_1.ts.isToken(child)) {
                continue;
            }
            const childs = child.getChildren();
            for (const childElement of childs) {
                if (arkanalyzer_1.ts.isToken(childElement)) {
                    continue;
                }
                parents.push(childElement);
            }
        }
        return parents;
    }
    // 在这个节点的子节点内查找指定名称的节点
    checkShadowInNodeChildren(targetFile, sourceFile, sourceNode, currentNode) {
        if (currentNode.kind === arkanalyzer_1.ts.SyntaxKind.SyntaxList || currentNode.kind === arkanalyzer_1.ts.SyntaxKind.SourceFile) {
            for (const child of currentNode.getChildren()) {
                if (this.checkShadowWithNode(targetFile, sourceFile, sourceNode, child)) {
                    return true;
                }
            }
        }
        else {
            if (this.checkShadowWithNode(targetFile, sourceFile, sourceNode, currentNode)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检查当前节点是否与源节点同名
     * @param targetFile 目标文件
     * @param sourceFile 源文件
     * @param sourceNode 待上报的节点
     * @param aNode 遍历中的shadow节点
     * @returns 是否同名
     */
    checkShadowWithNode(targetFile, sourceFile, sourceNode, aNode) {
        if (arkanalyzer_1.ts.isParameter(aNode)) {
            return this.checkParameter(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(aNode) || arkanalyzer_1.ts.isInterfaceDeclaration(aNode) || arkanalyzer_1.ts.isVariableDeclaration(aNode) || arkanalyzer_1.ts.isClassDeclaration(aNode) ||
            arkanalyzer_1.ts.isFunctionExpression(aNode) || arkanalyzer_1.ts.isFunctionDeclaration(aNode) || arkanalyzer_1.ts.isModuleDeclaration(aNode) || arkanalyzer_1.ts.isEnumDeclaration(aNode)) {
            return this.checkCommon(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isVariableStatement(aNode)) {
            return this.checkVariableStatement(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isImportDeclaration(aNode)) {
            return this.checkImportDeclaration(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isWhileStatement(aNode)) {
            return this.checkWhileStatement(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isForStatement(aNode)) {
            return this.checkForStatement(targetFile, sourceFile, sourceNode, aNode);
        }
        else if (arkanalyzer_1.ts.isTypeParameterDeclaration(aNode)) {
            return this.checkTypeParameterDeclaration(targetFile, sourceFile, sourceNode, aNode);
        }
        return false;
    }
    checkCommon(targetFile, sourceFile, sourceNode, aNode) {
        if (aNode.name && aNode.name.getText() === sourceNode.name) {
            // 检查是否同级声明
            const isSameLevel = aNode.parent === sourceNode.node.parent?.parent;
            const parentIsInterface = this.isInInterfaceMethodOverload(sourceNode.node);
            const isOverloadImplementation = this.isOverloadImplementation(sourceNode.node, sourceNode);
            // 如果是同级的命名空间和枚举，或者是循环体内的函数，则不报错
            if (isSameLevel || parentIsInterface || isOverloadImplementation) {
                return false;
            }
            if (this.reportShadow(targetFile, sourceFile, sourceNode.node, aNode.name)) {
                return true;
            }
        }
        return false;
    }
    // 检查函数声明是否是重载实现或后续重载声明
    isOverloadImplementation(node, sourceNode) {
        if (sourceNode.type !== CheckType.function) {
            return false;
        }
        // 获取当前节点所在的函数作用域
        const functionDeclaration = this.getContainingFunction(node);
        if (!functionDeclaration) {
            return false;
        }
        // 获取函数所在的块级作用域
        const block = functionDeclaration.parent;
        if (!block) {
            return false;
        }
        let foundCurrentNode = false;
        let foundPreviousOverload = false;
        // 遍历块中的所有语句
        for (const statement of block.statements) {
            if (statement === functionDeclaration) {
                foundCurrentNode = true;
                // 如果在当前节点之前找到了同名函数声明，说明这是后续的重载声明
                return foundPreviousOverload;
            }
            // 检查是否是同名的函数声明
            if (!foundCurrentNode && arkanalyzer_1.ts.isFunctionDeclaration(statement) &&
                statement.name && statement.name.getText() === sourceNode.name) {
                foundPreviousOverload = true;
            }
        }
        return false;
    }
    checkForStatement(targetFile, sourceFile, sourceNode, aNode) {
        const members = this.getForStatementNodes(aNode.initializer);
        return this.memberReport(targetFile, sourceFile, sourceNode, members);
    }
    memberReport(targetFile, sourceFile, sourceNode, members) {
        for (const member of members) {
            if (member.name === sourceNode.name) {
                return this.variableReport(targetFile, sourceFile, sourceNode, member);
            }
        }
        return false;
    }
    variableReport(targetFile, sourceFile, sourceNode, member) {
        // 1. 检查是否在嵌套的循环中
        const isNestedLoop = this.isInNestedLoop(sourceNode.node);
        if (isNestedLoop) {
            // 在嵌套循环中，只有当内层不是 var 声明时才报错
            if (sourceNode.type !== CheckType.var) {
                if (this.reportShadow(targetFile, sourceFile, sourceNode.node, member.node)) {
                    return true;
                }
            }
        }
        else {
            // 在非嵌套循环中，当外层是 var 声明，内层是 let 或 const 时需要报错
            if (member.type === CheckType.var && (sourceNode.type === CheckType.let || sourceNode.type === CheckType.const)) {
                if (this.reportShadow(targetFile, sourceFile, sourceNode.node, member.node)) {
                    return true;
                }
            }
        }
        return false;
    }
    // 检查节点是否在嵌套循环中
    isInNestedLoop(node) {
        let loopCount = 0;
        let current = node;
        while (current.parent) {
            if (arkanalyzer_1.ts.isForStatement(current.parent) ||
                arkanalyzer_1.ts.isForInStatement(current.parent) ||
                arkanalyzer_1.ts.isForOfStatement(current.parent) ||
                arkanalyzer_1.ts.isWhileStatement(current.parent) ||
                arkanalyzer_1.ts.isDoStatement(current.parent)) {
                loopCount++;
                if (loopCount > 1) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }
    getForStatementNodes(aNode) {
        const members = [];
        if (aNode === undefined) {
            return members;
        }
        if (arkanalyzer_1.ts.isVariableDeclarationList(aNode)) {
            members.push(...this.getVariableDeclarationListNodes(aNode));
        }
        return members;
    }
    checkParameter(targetFile, sourceFile, sourceNode, aNode) {
        const isInFunction = this.isInFunction(sourceNode.node);
        const isInFunctionMember = this.isInFunction(aNode);
        if (isInFunction && isInFunctionMember && isInFunction === isInFunctionMember) {
            return false;
        }
        if (aNode.name.getText() === sourceNode.name) {
            if (this.reportShadow(targetFile, sourceFile, sourceNode.node, aNode.name)) {
                return true;
            }
        }
        return false;
    }
    checkTypeParameterDeclaration(targetFile, sourceFile, sourceNode, aNode) {
        const isTypeParameter = arkanalyzer_1.ts.isTypeParameterDeclaration(aNode);
        const isValueShadowing = !isTypeParameter && sourceNode.type !== CheckType.param;
        // 如果是类型参数与值变量重名，且配置为忽略，则不报错
        if (isValueShadowing && this.ruleOptions.ignoreFunctionTypeParameterNameValueShadow) {
            return false;
        }
        if (aNode.name.getText() === sourceNode.name) {
            if (this.reportShadow(targetFile, sourceFile, sourceNode.node, aNode.name)) {
                return true;
            }
        }
        return false;
    }
    // 检查参数是否在接口方法重载中 或者 函数重载的后续声明中
    isInInterfaceMethodOverload(node) {
        let current = node.parent;
        while (current) {
            // 检查是否在方法签名中
            if (arkanalyzer_1.ts.isMethodSignature(current) ||
                arkanalyzer_1.ts.isGetAccessorDeclaration(current) ||
                arkanalyzer_1.ts.isSetAccessorDeclaration(current)) {
                // 检查方法签名是否在接口声明中
                const parent = current.parent;
                if (parent && arkanalyzer_1.ts.isInterfaceDeclaration(parent)) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }
    checkImportDeclaration(targetFile, sourceFile, sourceNode, aNode) {
        if (aNode.importClause) {
            const ignoreNode = this.ruleOptions.ignoreTypeValueShadow && aNode.importClause.isTypeOnly;
            if (!ignoreNode) {
                const flag = this.handleImportDeclaration(targetFile, sourceFile, sourceNode, aNode);
                if (flag) {
                    return true;
                }
            }
        }
        return false;
    }
    checkVariableStatement(targetFile, sourceFile, sourceNode, aNode) {
        const members = this.getVariableDeclarationListNodes(aNode.declarationList);
        for (const member of members) {
            if (member.name === sourceNode.name) {
                const isSameScopeFlag = this.isSameScope(sourceNode.node, member.node);
                const isFunctionTypeParameter = this.isFunctionTypeParameter(sourceNode.node);
                // 检查是否在函数内部，以及是否存在同名参数
                const containingFunction = this.getContainingFunction(sourceNode.node);
                /**
                 *  如果是函数类型参数与值变量重名，且配置为忽略，则不报错
                 *  如果是同一个函数内，且sourceNode的type是 var 或者 enum ，则不报错
                 */
                if ((isSameScopeFlag && (sourceNode.type === CheckType.var || sourceNode.type === CheckType.enum)) ||
                    (isFunctionTypeParameter && this.ruleOptions.ignoreFunctionTypeParameterNameValueShadow) ||
                    ((sourceNode.type === CheckType.let || sourceNode.type === CheckType.const || sourceNode.type === CheckType.var) &&
                        containingFunction && this.hasSameNameParameter(containingFunction, sourceNode.name))) {
                    return false;
                }
                if (this.reportShadow(targetFile, sourceFile, sourceNode.node, member.node)) {
                    return true;
                }
            }
        }
        return false;
    }
    // 获取包含当前节点的最近的函数声明
    getContainingFunction(node) {
        let current = node;
        while (current.parent) {
            current = current.parent;
            if (arkanalyzer_1.ts.isFunctionDeclaration(current)) {
                return current;
            }
        }
        return undefined;
    }
    // 检查函数是否有同名参数
    hasSameNameParameter(func, name) {
        return func.parameters.some(param => arkanalyzer_1.ts.isIdentifier(param.name) && param.name.text === name);
    }
    isFunctionTypeParameter(node) {
        let current = node;
        while (current.parent) {
            current = current.parent;
            if (current.kind === arkanalyzer_1.ts.SyntaxKind.FunctionType ||
                current.kind === arkanalyzer_1.ts.SyntaxKind.MethodSignature ||
                arkanalyzer_1.ts.isCallSignatureDeclaration(current)) {
                return true;
            }
        }
        return false;
    }
    isInFunction(node) {
        let current = node;
        while (current.parent) {
            current = current.parent;
            if (current.kind === arkanalyzer_1.ts.SyntaxKind.FunctionDeclaration ||
                current.kind === arkanalyzer_1.ts.SyntaxKind.FunctionExpression ||
                current.kind === arkanalyzer_1.ts.SyntaxKind.ArrowFunction) {
                return current;
            }
        }
        return undefined;
    }
    checkWhileStatement(targetFile, sourceFile, sourceNode, aNode) {
        const children = aNode.statement.getChildren();
        if (children.length !== 3) {
            return false;
        }
        for (const child of children[1].getChildren()) {
            const members = this.getVariableStatementNodes(child);
            for (const member of members) {
                if (member.name !== sourceNode.name) {
                    continue;
                }
                // 检查是否在循环体内的函数声明/表达式
                const isLoopFunction = this.isInLoop(member.node);
                if (isLoopFunction) {
                    continue;
                }
                if (this.reportShadow(targetFile, sourceFile, sourceNode.node, member.node)) {
                    return true;
                }
            }
        }
        return false;
    }
    getVariableStatementNodes(aNode) {
        if (!arkanalyzer_1.ts.isVariableStatement(aNode)) {
            return [];
        }
        let declarationList = aNode.declarationList;
        if (declarationList.declarations.length === 0) {
            return [];
        }
        let members = this.getVariableDeclarationListNodes(declarationList);
        return members;
    }
    handleImportDeclaration(targetFile, sourceFile, sourceNode, aNode) {
        for (const child of aNode.importClause?.getChildren() ?? []) {
            if (arkanalyzer_1.ts.isToken(child)) {
                continue;
            }
            if (!arkanalyzer_1.ts.isNamedImports(child)) {
                continue;
            }
            for (const namedImport of child.elements) {
                if (this.ruleOptions.ignoreTypeValueShadow && namedImport.isTypeOnly) {
                    continue;
                }
                if (namedImport.name.getText() !== sourceNode.name) {
                    continue;
                }
                if (this.reportShadow(targetFile, sourceFile, sourceNode.node, namedImport.name)) {
                    return true;
                }
            }
        }
        return undefined;
    }
    reportShadow(targetFile, sourceFile, sourceNode, shadowNode) {
        if (sourceNode === shadowNode) {
            return false;
        }
        const sourceStartPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, sourceNode.getStart());
        const startLine = sourceStartPosition.line + 1;
        const startCol = sourceStartPosition.character + 1;
        const sourceEndPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, sourceNode.getEnd());
        const sourceEnd = sourceEndPosition.character + 1;
        const shadowStartPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, shadowNode.getStart());
        const shadowLine = shadowStartPosition.line + 1;
        const shadowCol = shadowStartPosition.character + 1;
        // 如果skipReportShadow返回true，则不报错
        if (this.skipReportShadow(sourceNode, shadowNode, startLine, startCol, shadowLine, shadowCol)) {
            return false;
        }
        const message = "'" + sourceNode.getText() + "' is already declared in the upper scope on line " + shadowLine + ' column ' + shadowCol + '.';
        this.addIssueReport(targetFile, startLine, startCol, sourceEnd, message);
        return true;
    }
    /**
     * 跳过报错
     * @param sourceNode 源节点
     * @param shadowNode 阴影节点
     * @param startLine 源节点开始行
     * @param startCol 源节点开始列
     * @param shadowLine 阴影节点开始行
     * @param shadowCol 阴影节点开始列
     * @returns 是否跳过报错
     */
    skipReportShadow(sourceNode, shadowNode, startLine, startCol, shadowLine, shadowCol) {
        const checkNodeStatic = this.isNodeInStatic(sourceNode);
        const shadowNodeFunction = this.isNodeInFunction(shadowNode);
        if (!checkNodeStatic || !shadowNodeFunction) {
            if (startLine < shadowLine || (startLine === shadowLine && startCol < shadowCol)) {
                return true;
            }
        }
        // 这种不报错：class S { static { var f; { var f; } } }
        const checkNodeVar = this.isNodeStartVar(sourceNode);
        const shadowNodeStatic = this.isNodeInStatic(shadowNode);
        const shadowNodeVar = this.isNodeStartVar(shadowNode);
        if (shadowNodeStatic && checkNodeStatic && shadowNodeStatic === checkNodeStatic && checkNodeVar && shadowNodeVar) {
            return true;
        }
        if (checkNodeStatic && checkNodeVar) {
            if (this.isStaticVarExist(sourceNode, checkNodeStatic)) {
                return true;
            }
        }
        return false;
    }
    // 检查静态代码块内的变量是否是同名的第一个：class S { static { var f; { var f; } } }
    isStaticVarExist(aNode, staticNode) {
        let nodes = [];
        this.getNodesForNode(staticNode, nodes);
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i] === aNode && i !== 0) {
                return true;
            }
        }
        return false;
    }
    getNodesForNode(aNode, nodeList) {
        for (const child of aNode.getChildren()) {
            if (!arkanalyzer_1.ts.isVariableDeclarationList(child)) {
                this.getNodesForNode(child, nodeList);
                continue;
            }
            for (const declaration of child.declarations) {
                const member = this.getMember(child, declaration);
                if (member) {
                    nodeList.push(member.node);
                }
            }
        }
    }
    isNodeInStatic(aNode) {
        return this.isNodeInKind(aNode, arkanalyzer_1.ts.SyntaxKind.ClassStaticBlockDeclaration);
    }
    isNodeInFunction(aNode) {
        return this.isNodeInKind(aNode, arkanalyzer_1.ts.SyntaxKind.FunctionDeclaration);
    }
    isNodeInKind(aNode, kind) {
        const parent = aNode.parent;
        if (parent === undefined) {
            return undefined;
        }
        if (parent.kind === kind) {
            return parent;
        }
        return this.isNodeInStatic(parent);
    }
    isNodeStartVar(aNode) {
        const parent = aNode.parent;
        if (parent === undefined) {
            return false;
        }
        if (parent.kind === arkanalyzer_1.ts.SyntaxKind.VariableDeclarationList) {
            const children = parent.getChildren();
            const firstChild = children[0];
            if (firstChild.kind === arkanalyzer_1.ts.SyntaxKind.VarKeyword) {
                return true;
            }
        }
        return this.isNodeStartVar(parent);
    }
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    isInLoop(node) {
        let current = node;
        // 1. 首先向上查找到 VariableDeclaration 节点
        while (current && !arkanalyzer_1.ts.isVariableDeclaration(current)) {
            current = current.parent;
        }
        // 2. 如果找到了 VariableDeclaration，检查它的 initializer
        const initializer = current.initializer;
        if (initializer && (arkanalyzer_1.ts.isFunctionExpression(initializer) || arkanalyzer_1.ts.isArrowFunction(initializer))) {
            // 3. 如果 initializer 是函数表达式，继续向上查找循环语句
            let parent = current.parent; // 明确声明类型
            while (parent) {
                if (arkanalyzer_1.ts.isWhileStatement(parent) ||
                    arkanalyzer_1.ts.isDoStatement(parent) ||
                    arkanalyzer_1.ts.isForStatement(parent) ||
                    arkanalyzer_1.ts.isForInStatement(parent) ||
                    arkanalyzer_1.ts.isForOfStatement(parent)) {
                    return true;
                }
                parent = parent.parent;
            }
        }
        return false;
    }
    // 获取最近的块级作用域父节点
    getNearestScope(node) {
        let current = node;
        while (current.parent) {
            current = current.parent;
            // 检查是否是块级作用域节点
            if (arkanalyzer_1.ts.isSourceFile(current) ||
                arkanalyzer_1.ts.isClassDeclaration(current) ||
                arkanalyzer_1.ts.isForStatement(current) ||
                arkanalyzer_1.ts.isForInStatement(current) ||
                arkanalyzer_1.ts.isForOfStatement(current) ||
                arkanalyzer_1.ts.isWhileStatement(current) ||
                arkanalyzer_1.ts.isDoStatement(current) ||
                arkanalyzer_1.ts.isFunctionDeclaration(current) ||
                arkanalyzer_1.ts.isModuleDeclaration(current) ||
                arkanalyzer_1.ts.isArrowFunction(current) ||
                arkanalyzer_1.ts.isFunctionExpression(current)) {
                return current;
            }
        }
        return undefined;
    }
    isSameScope(node1, node2) {
        const scope1 = this.getNearestScope(node1);
        const scope2 = this.getNearestScope(node2);
        // 如果两个节点都找到了作用域，且是同一个作用域
        return scope1 !== undefined &&
            scope2 !== undefined &&
            scope1 === scope2;
    }
}
exports.NoShadowCheck = NoShadowCheck;
