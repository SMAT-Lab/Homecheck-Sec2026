"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoLoopFuncCheck = void 0;
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
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-loop-func.md',
    description: 'Function declared in a loop contains unsafe references to variable(s)'
};
class NoLoopFuncCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    ;
    check = (target) => {
        const originPath = target.getFilePath();
        if (!this.isTsFile(originPath)) {
            return;
        }
        ;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.checkNode(sourceFile, target);
    };
    checkNode(node, arkFile) {
        if (arkanalyzer_1.ts.isWhileStatement(node) || arkanalyzer_1.ts.isDoStatement(node) || arkanalyzer_1.ts.isForStatement(node) || arkanalyzer_1.ts.isForInStatement(node) || arkanalyzer_1.ts.isForOfStatement(node)) {
            const checkFunction = (funcNode) => {
                const unsafeRefs = this.findUnsafeReferences(funcNode, node);
                if (unsafeRefs.length > 0) {
                    this.reportIssue(funcNode, unsafeRefs, arkFile);
                }
                ;
            };
            const checkNodeForFunctions = (innerNode) => {
                if (arkanalyzer_1.ts.isFunctionExpression(innerNode) || arkanalyzer_1.ts.isFunctionDeclaration(innerNode) || arkanalyzer_1.ts.isArrowFunction(innerNode)) {
                    checkFunction(innerNode);
                }
                ;
                arkanalyzer_1.ts.forEachChild(innerNode, checkNodeForFunctions);
            };
            if (arkanalyzer_1.ts.isForStatement(node)) {
                if (node.condition) {
                    checkNodeForFunctions(node.condition);
                }
                ;
                if (node.incrementor) {
                    checkNodeForFunctions(node.incrementor);
                }
                ;
            }
            ;
            const loopBody = node.statement;
            if (loopBody) {
                checkNodeForFunctions(loopBody);
            }
            ;
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, child => this.checkNode(child, arkFile));
    }
    ;
    findUnsafeReferences(funcNode, loopNode) {
        const loopVars = this.collectLoopVariables(loopNode);
        const unsafeRefs = [];
        const isWhileLoop = arkanalyzer_1.ts.isWhileStatement(loopNode) || arkanalyzer_1.ts.isDoStatement(loopNode);
        const funcParams = new Set();
        if (arkanalyzer_1.ts.isFunctionLike(funcNode)) {
            for (const param of funcNode.parameters) {
                if (arkanalyzer_1.ts.isIdentifier(param.name)) {
                    funcParams.add(param.name.text);
                }
                ;
            }
            ;
        }
        ;
        const referencedVars = new Set();
        const collectReferences = (node) => {
            if (this.isValidReference(node, funcParams) && arkanalyzer_1.ts.isIdentifier(node)) {
                referencedVars.add(node.text);
            }
            ;
            if (!(node !== funcNode && (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node)))) {
                arkanalyzer_1.ts.forEachChild(node, collectReferences);
            }
            ;
        };
        collectReferences(funcNode);
        referencedVars.forEach(varName => {
            if (this.isUnsafeReference(varName, loopVars, loopNode, isWhileLoop)) {
                unsafeRefs.push(varName);
            }
            ;
        });
        return unsafeRefs;
    }
    ;
    isUnsafeReference(varName, loopVars, loopNode, isWhileLoop) {
        if (loopVars.has(varName)) {
            const varDecl = this.findVariableDeclaration(varName, loopNode);
            if (varDecl && varDecl.parent && arkanalyzer_1.ts.isVariableDeclarationList(varDecl.parent)) {
                if (varDecl.parent.flags & arkanalyzer_1.ts.NodeFlags.Const) {
                    return false;
                }
                ;
                if ((varDecl.parent.flags & arkanalyzer_1.ts.NodeFlags.Let) && !isWhileLoop) {
                    return false;
                }
                ;
            }
            ;
            return true;
        }
        ;
        if (isWhileLoop) {
            return this.isVariableModifiedInLoop(varName, loopNode) || this.isVariableModifiedAfterLoop(varName, loopNode);
        }
        ;
        const isModified = this.isVariableModifiedInLoop(varName, loopNode) || this.isVariableModifiedAfterLoop(varName, loopNode);
        return isModified;
    }
    ;
    isValidReference(node, funcParams) {
        if (arkanalyzer_1.ts.isIdentifier(node)) {
            const parent = node.parent;
            return !(parent && arkanalyzer_1.ts.isPropertyAccessExpression(parent) && parent.name === node) &&
                !(parent && arkanalyzer_1.ts.isVariableDeclaration(parent) && parent.name === node) &&
                !(parent && arkanalyzer_1.ts.isParameter(parent)) &&
                !(parent && (arkanalyzer_1.ts.isTypeReferenceNode(parent) || parent.kind === arkanalyzer_1.ts.SyntaxKind.TypeReference)) &&
                !funcParams.has(node.text);
        }
        ;
        return false;
    }
    ;
    isVariableModifiedAfterLoop(varName, loopNode) {
        const parent = loopNode.parent;
        if (!parent) {
            return false;
        }
        ;
        let isModified = false;
        const checkAfterLoop = (node) => {
            if (isModified) {
                return;
            }
            ;
            if (this.isVariableModified(node, varName)) {
                isModified = true;
                return;
            }
            ;
            arkanalyzer_1.ts.forEachChild(node, checkAfterLoop);
        };
        let root = loopNode;
        while (root.parent) {
            root = root.parent;
        }
        ;
        checkAfterLoop(root);
        return isModified;
    }
    ;
    collectCapturedVariables(node, capturedVars) {
        const funcParams = new Set();
        if (arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node) || arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            for (const param of node.parameters) {
                if (arkanalyzer_1.ts.isIdentifier(param.name)) {
                    funcParams.add(param.name.text);
                }
                ;
            }
            ;
        }
        ;
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.Identifier) {
            const parent = node.parent;
            const identifier = node;
            if (!(parent && arkanalyzer_1.ts.isPropertyAccessExpression(parent) && parent.name === node) &&
                !(parent && arkanalyzer_1.ts.isVariableDeclaration(parent) && parent.name === node) &&
                !(parent && parent.kind === arkanalyzer_1.ts.SyntaxKind.TypeReference) &&
                !funcParams.has(identifier.text) &&
                !(parent && arkanalyzer_1.ts.isParameter(parent) && parent.name === node)) {
                capturedVars.add(identifier.text);
            }
            ;
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, child => this.collectCapturedVariables(child, capturedVars));
    }
    ;
    collectLoopVariables(loopNode) {
        const loopVars = new Set();
        if (arkanalyzer_1.ts.isForStatement(loopNode)) {
            if (loopNode.initializer) {
                this.handleInitializer(loopNode.initializer, loopVars);
            }
            ;
            if (loopNode.condition) {
                this.handleCondition(loopNode.condition, loopVars);
            }
            ;
            if (loopNode.incrementor) {
                this.handleIncrementor(loopNode.incrementor, loopVars);
            }
            ;
        }
        else if (arkanalyzer_1.ts.isForInStatement(loopNode) || arkanalyzer_1.ts.isForOfStatement(loopNode)) {
            this.processForInOfInitializer(loopNode.initializer, loopVars);
            this.collectIdentifiersFromNode(loopNode.expression, loopVars);
        }
        else if (arkanalyzer_1.ts.isWhileStatement(loopNode) || arkanalyzer_1.ts.isDoStatement(loopNode)) {
            this.collectIdentifiersFromNode(loopNode.expression, loopVars);
        }
        ;
        return loopVars;
    }
    ;
    processForInOfInitializer(initializer, loopVars) {
        if (arkanalyzer_1.ts.isVariableDeclarationList(initializer)) {
            initializer.declarations.forEach(decl => {
                if (arkanalyzer_1.ts.isIdentifier(decl.name)) {
                    loopVars.add(decl.name.text);
                }
                ;
            });
        }
        else if (initializer) {
            this.collectIdentifiersFromNode(initializer, loopVars);
        }
        ;
    }
    ;
    handleInitializer = (initializer, loopVars) => {
        if (arkanalyzer_1.ts.isVariableDeclarationList(initializer)) {
            initializer.declarations.forEach(decl => {
                if (arkanalyzer_1.ts.isIdentifier(decl.name)) {
                    loopVars.add(decl.name.text);
                }
                ;
            });
        }
        else {
            this.collectIdentifiersFromNode(initializer, loopVars);
        }
        ;
    };
    handleCondition = (condition, loopVars) => {
        this.collectIdentifiersFromNode(condition, loopVars);
    };
    handleIncrementor = (incrementor, loopVars) => {
        this.collectIdentifiersFromNode(incrementor, loopVars);
    };
    collectIdentifiersFromNode(node, identifiers) {
        if (arkanalyzer_1.ts.isIdentifier(node)) {
            identifiers.add(node.text);
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, child => {
            this.collectIdentifiersFromNode(child, identifiers);
        });
    }
    ;
    /**
     * 检查变量是否在循环体内被修改
     * @param varName 变量名
     * @param loopNode 循环节点
     * @returns 是否在循环体内被修改
     */
    isVariableModifiedInLoop(varName, loopNode) {
        let isModified = false;
        let loopBody;
        if (arkanalyzer_1.ts.isForStatement(loopNode) ||
            arkanalyzer_1.ts.isForInStatement(loopNode) ||
            arkanalyzer_1.ts.isForOfStatement(loopNode) ||
            arkanalyzer_1.ts.isWhileStatement(loopNode) ||
            arkanalyzer_1.ts.isDoStatement(loopNode)) {
            loopBody = loopNode.statement;
        }
        ;
        if (!loopBody) {
            return false;
        }
        ;
        // 检查循环体内的变量修改
        const checkModification = (node) => {
            this.checkNodeForModification(node, varName, isModified);
        };
        checkModification(loopBody);
        return isModified;
    }
    ;
    checkNodeForModification(node, varName, isModified) {
        if (isModified) {
            return;
        }
        ;
        if (this.isVariableModified(node, varName)) {
            isModified = true;
            return;
        }
        ;
        if (!(arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node))) {
            arkanalyzer_1.ts.forEachChild(node, child => this.checkNodeForModification(child, varName, isModified));
        }
        ;
    }
    ;
    isVariableModified(node, varName) {
        if (arkanalyzer_1.ts.isBinaryExpression(node) &&
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
            arkanalyzer_1.ts.isIdentifier(node.left) &&
            node.left.text === varName) {
            return true;
        }
        ;
        if ((arkanalyzer_1.ts.isPrefixUnaryExpression(node) || arkanalyzer_1.ts.isPostfixUnaryExpression(node)) &&
            (node.operator === arkanalyzer_1.ts.SyntaxKind.PlusPlusToken || node.operator === arkanalyzer_1.ts.SyntaxKind.MinusMinusToken) &&
            arkanalyzer_1.ts.isIdentifier(node.operand) &&
            node.operand.text === varName) {
            return true;
        }
        ;
        if (arkanalyzer_1.ts.isBinaryExpression(node) &&
            [arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken, arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken,
                arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken, arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken].includes(node.operatorToken.kind) &&
            arkanalyzer_1.ts.isIdentifier(node.left) &&
            node.left.text === varName) {
            return true;
        }
        ;
        return false;
    }
    ;
    /**
     * 查找变量的声明节点
     * @param varName 变量名
     * @param scope 搜索范围
     * @returns 变量声明节点或null
     */
    findVariableDeclaration(varName, scope) {
        let result = null;
        const visit = (node) => {
            if (arkanalyzer_1.ts.isVariableDeclaration(node) &&
                arkanalyzer_1.ts.isIdentifier(node.name) &&
                node.name.text === varName) {
                result = node;
                return;
            }
            ;
            if (!(arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node))) {
                arkanalyzer_1.ts.forEachChild(node, visit);
            }
            ;
        };
        let root = scope;
        while (root.parent) {
            root = root.parent;
        }
        ;
        visit(root);
        return result;
    }
    ;
    reportIssue(node, unsafeRefs, arkFile) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        const description = `${this.metaData.description} '${unsafeRefs.join("', '")}'.`;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Index_1.Defects(line + 1, character + 1, endCharacter + 1, description, severity, this.rule.ruleId, arkFile.getFilePath(), this.metaData.ruleDocPath, false, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    isTsFile(filePath) {
        return filePath.toLowerCase().endsWith('.ts');
    }
    ;
}
exports.NoLoopFuncCheck = NoLoopFuncCheck;
;
