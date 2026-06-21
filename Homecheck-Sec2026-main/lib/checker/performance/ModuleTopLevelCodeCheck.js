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
exports.ModuleTopLevelCodeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ModuleLoadingOptimization');
class ModuleTopLevelCodeCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 3,
        ruleDocPath: 'docs/module-loading-optimization-check.md',
        description: 'May have side effects',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    check = (target) => {
        if (target.getExportInfos().length === 0) {
            return;
        }
        const filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.visitNode(sourceFile, sourceFile, filePath);
    };
    visitNode(node, sourceFile, filePath) {
        if (!lib_1.ts.isSourceFile(node)) {
            return;
        }
        const members = node.statements;
        members.forEach(member => {
            const nodes = member.getChildren(sourceFile);
            if (this.isWarningMember(member, nodes)) {
                this.reportIssue(member, sourceFile, filePath);
            }
        });
    }
    reportIssue(member, sourceFile, filePath) {
        // 获取AST位置信息
        const startAST = member.getStart(sourceFile);
        const { line: lineAST, character: startColAST } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, startAST);
        // 计算实际位置
        const lineNum = lineAST + 1;
        const startColum = startColAST + 1;
        const endColum = startColAST + 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Defects_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defects, undefined));
    }
    isWarningMember(member, childNodes) {
        const hasSpecificChildInBlock = (blockNode, checkNodeTypes) => {
            const blockNodeChildren = blockNode.getChildren();
            const syntaxListNodes = blockNodeChildren.filter(child => child.kind === lib_1.ts.SyntaxKind.SyntaxList);
            return syntaxListNodes.some(syntaxListNode => {
                const syntaxListChildren = syntaxListNode.getChildren();
                return syntaxListChildren.some(checkNodeTypes);
            });
        };
        switch (member.kind) {
            case lib_1.ts.SyntaxKind.ExpressionStatement:
                return childNodes.some(this.isSpecificExpression);
            case lib_1.ts.SyntaxKind.IfStatement: {
                const blockNodes = childNodes.filter(child => lib_1.ts.isBlock(child));
                return blockNodes.some(blockNode => hasSpecificChildInBlock(blockNode, child => lib_1.ts.isVariableStatement(child) || lib_1.ts.isExpressionStatement(child)));
            }
            case lib_1.ts.SyntaxKind.DoStatement:
            case lib_1.ts.SyntaxKind.WhileStatement:
            case lib_1.ts.SyntaxKind.ForStatement:
            case lib_1.ts.SyntaxKind.ForInStatement:
            case lib_1.ts.SyntaxKind.ForOfStatement:
            case lib_1.ts.SyntaxKind.SwitchStatement:
            case lib_1.ts.SyntaxKind.TryStatement:
                return true;
            case lib_1.ts.SyntaxKind.Block: {
                const blockSyntaxListNodes = childNodes.filter(child => child.kind === lib_1.ts.SyntaxKind.SyntaxList);
                return blockSyntaxListNodes.some(syntaxListNode => syntaxListNode.getChildren().some(child => lib_1.ts.isExpressionStatement(child)));
            }
            case lib_1.ts.SyntaxKind.VariableStatement: {
                const variableDeclarationListNodes = childNodes.filter(child => lib_1.ts.isVariableDeclarationList(child));
                return variableDeclarationListNodes.some(this.isVariableDeclarationWithCall);
            }
            default:
                return false;
        }
    }
    isSpecificExpression(node) {
        return (lib_1.ts.isCallExpression(node) ||
            lib_1.ts.isPropertyAccessExpression(node) ||
            lib_1.ts.isBinaryExpression(node) ||
            lib_1.ts.isNewExpression(node));
    }
    ;
    isVariableDeclarationWithCall(variableDeclarationListNode) {
        const varNodeChildren = variableDeclarationListNode.getChildren();
        const syntaxListNodes = varNodeChildren.filter(child => child.kind === lib_1.ts.SyntaxKind.SyntaxList);
        return syntaxListNodes.some(syntaxListNode => {
            const syntaxListChildren = syntaxListNode.getChildren();
            const varNodes = syntaxListChildren.filter(child => lib_1.ts.isVariableDeclaration(child));
            return varNodes.some(varNode => {
                const varNodeChildrens = varNode.getChildren();
                return varNodeChildrens.some(child => lib_1.ts.isCallExpression(child));
            });
        });
    }
    ;
}
exports.ModuleTopLevelCodeCheck = ModuleTopLevelCodeCheck;
