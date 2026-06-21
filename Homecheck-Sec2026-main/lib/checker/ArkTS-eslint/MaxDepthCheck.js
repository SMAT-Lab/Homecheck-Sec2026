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
exports.MaxDepthCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const DEFAULT_MAX_DEPTH = 4;
;
class MaxDepthCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/max-depth.md',
        description: `Maximum allowed nesting depth is ${DEFAULT_MAX_DEPTH}`
    };
    rule;
    defects = [];
    issues = [];
    defaultOptions = [{ 'max': DEFAULT_MAX_DEPTH, 'maximum': DEFAULT_MAX_DEPTH }];
    fileMatcher = { matcherType: Matchers_1.MatcherTypes.FILE };
    functionStack = []; // 二维数组支持多函数嵌套
    maxDepth = DEFAULT_MAX_DEPTH;
    arkFile;
    registerMatchers() {
        return [{ matcher: this.fileMatcher, callback: this.check }];
    }
    ;
    check = (target) => {
        this.initializeOptions();
        if (target instanceof lib_1.ArkFile) {
            this.arkFile = target;
            this.checkDepth(target);
        }
    };
    initializeOptions() {
        let option = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        if (typeof option === 'number') {
            this.maxDepth = option;
        }
        else {
            const options = option;
            this.maxDepth = options[0].maximum ?? options[0].max ?? DEFAULT_MAX_DEPTH;
        }
        ;
    }
    ;
    checkDepth(arkFile) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.functionStack = [];
        // AST深度优先遍历
        const visitNode = (node) => {
            this.handleNodeEntry(node);
            lib_1.ts.forEachChild(node, visitNode);
            this.handleNodeExit(node);
        };
        visitNode(sourceFile);
    }
    ;
    // 进入节点处理
    handleNodeEntry(node) {
        switch (node.kind) {
            case lib_1.ts.SyntaxKind.FunctionDeclaration:
            case lib_1.ts.SyntaxKind.FunctionExpression:
            case lib_1.ts.SyntaxKind.ArrowFunction:
            case lib_1.ts.SyntaxKind.SourceFile:
            case lib_1.ts.SyntaxKind.ClassStaticBlockDeclaration:
                this.functionStack.push(0);
                break;
            case lib_1.ts.SyntaxKind.IfStatement:
                if (!this.isElseIfClause(node)) {
                    this.incrementDepth(node);
                }
                break;
            case lib_1.ts.SyntaxKind.ForStatement:
            case lib_1.ts.SyntaxKind.ForOfStatement:
            case lib_1.ts.SyntaxKind.ForInStatement:
            case lib_1.ts.SyntaxKind.WhileStatement:
            case lib_1.ts.SyntaxKind.DoStatement:
            case lib_1.ts.SyntaxKind.SwitchStatement:
            case lib_1.ts.SyntaxKind.TryStatement:
            case lib_1.ts.SyntaxKind.WithStatement:
                this.incrementDepth(node);
                break;
        }
        ;
    }
    ;
    // 退出节点处理
    handleNodeExit(node) {
        switch (node.kind) {
            case lib_1.ts.SyntaxKind.FunctionDeclaration:
            case lib_1.ts.SyntaxKind.FunctionExpression:
            case lib_1.ts.SyntaxKind.ArrowFunction:
            case lib_1.ts.SyntaxKind.SourceFile:
            case lib_1.ts.SyntaxKind.ClassStaticBlockDeclaration:
                this.functionStack.pop();
                break;
            case lib_1.ts.SyntaxKind.IfStatement:
            case lib_1.ts.SyntaxKind.ForStatement:
            case lib_1.ts.SyntaxKind.ForOfStatement:
            case lib_1.ts.SyntaxKind.ForInStatement:
            case lib_1.ts.SyntaxKind.WhileStatement:
            case lib_1.ts.SyntaxKind.DoStatement:
            case lib_1.ts.SyntaxKind.SwitchStatement:
            case lib_1.ts.SyntaxKind.TryStatement:
            case lib_1.ts.SyntaxKind.WithStatement:
                if (this.functionStack.length > 0) {
                    this.functionStack[this.functionStack.length - 1]--;
                }
                ;
                break;
        }
        ;
    }
    ;
    // 检查是否是else if结构
    isElseIfClause(node) {
        return lib_1.ts.isIfStatement(node.parent) && node.parent.elseStatement === node;
    }
    ;
    // 增加当前嵌套深度并检查
    incrementDepth(node) {
        if (this.functionStack.length === 0) {
            return;
        }
        ;
        const currentDepth = ++this.functionStack[this.functionStack.length - 1];
        if (currentDepth > this.maxDepth) {
            this.reportIssue(node, currentDepth);
        }
        ;
    }
    ;
    // 生成错误报告
    reportIssue(node, depth) {
        const filePath = this.arkFile.getFilePath() ?? '';
        const sourceFile = node.getSourceFile();
        const start = node.getStart(sourceFile);
        const { line, character: col } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, start);
        const end = node.getEnd();
        const { character: endCol } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, end);
        const issue = {
            line: line + 1,
            column: col + 1,
            columnEnd: endCol + 1,
            message: `Blocks are nested too deeply (${depth}). Maximum allowed is ${this.maxDepth}`,
            filePath: filePath
        };
        this.addIssueReport(issue);
    }
    ;
    addIssueReport(issue) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.MaxDepthCheck = MaxDepthCheck;
