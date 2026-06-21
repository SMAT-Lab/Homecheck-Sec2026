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
exports.NoExtraSemiCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
class NoExtraSemiCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-extra-semi.md',
        description: 'Disallow unnecessary semicolons.'
    };
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    static allowedParentTypes = [
        lib_1.ts.SyntaxKind.ForStatement,
        lib_1.ts.SyntaxKind.ForInStatement,
        lib_1.ts.SyntaxKind.ForOfStatement,
        lib_1.ts.SyntaxKind.WhileStatement,
        lib_1.ts.SyntaxKind.DoStatement,
        lib_1.ts.SyntaxKind.IfStatement,
        lib_1.ts.SyntaxKind.LabeledStatement,
        lib_1.ts.SyntaxKind.WithStatement,
    ];
    methodAst;
    arkFile;
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        if (target instanceof lib_1.ArkFile) {
            this.checkNoExtraSemi(target);
        }
    };
    checkNoExtraSemi(arkFile) {
        this.methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.arkFile = arkFile;
        // 从根节点开始遍历
        this.checkNode(this.methodAst);
    }
    ;
    checkNode = (node) => {
        // 检查空语句
        if (node.kind === lib_1.ts.SyntaxKind.EmptyStatement) {
            const parent = node.parent;
            if (!NoExtraSemiCheck.allowedParentTypes.includes(parent.kind)) {
                const start = node.getStart(this.methodAst);
                const { line, character } = this.methodAst.getLineAndCharacterOfPosition(start);
                // 保存修复内容到 Issue 对象
                const resultIssue = {
                    line: line + 1,
                    column: character + 1,
                    columnEnd: character + 2,
                    message: 'Unnecessary semicolon.',
                    filePath: this.arkFile.getFilePath() ?? '',
                    fixCode: ''
                };
                const ruleFix = this.createFix(start, start + 1, resultIssue.fixCode);
                this.addIssueReport(resultIssue, ruleFix);
            }
            ;
        }
        ;
        // 检查类声明
        if (lib_1.ts.isClassDeclaration(node)) {
            this.checkClassDeclaration(node, this.methodAst, this.arkFile);
        }
        ;
        lib_1.ts.forEachChild(node, this.checkNode);
    };
    checkClassDeclaration(node, methodAst, arkFile) {
        // 遍历类的成员
        for (const member of node.members) {
            this.checkMember(member, methodAst, arkFile);
        }
        ;
    }
    ;
    checkMember(member, methodAst, arkFile) {
        // 检查分号
        if (member.kind === lib_1.ts.SyntaxKind.SemicolonClassElement) {
            const lastChild = member.getChildAt(member.getChildCount() - 1);
            if (lastChild && lastChild?.kind === lib_1.ts.SyntaxKind.SemicolonToken) {
                const start = lastChild.getStart(methodAst);
                const { line, character } = methodAst.getLineAndCharacterOfPosition(start);
                const resultIssue = {
                    line: line + 1,
                    column: character + 1,
                    columnEnd: character + 2,
                    message: 'Unnecessary semicolon.',
                    filePath: arkFile.getFilePath() ?? '',
                    fixCode: ''
                };
                const ruleFix = this.createFix(start, start + 1, resultIssue.fixCode);
                this.addIssueReport(resultIssue, ruleFix);
            }
        }
    }
    ;
    createFix(start, end, code) {
        return { range: [start, end], text: code };
    }
    ;
    addIssueReport(issue, ruleFix) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, (ruleFix != undefined ? true : false));
        this.issues.push(new Defects_1.IssueReport(defects, ruleFix));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.NoExtraSemiCheck = NoExtraSemiCheck;
