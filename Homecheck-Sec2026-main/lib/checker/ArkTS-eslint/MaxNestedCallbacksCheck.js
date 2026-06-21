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
exports.MaxNestedCallbacksCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const MAX_DEPTH = 10;
class MaxNestedCallbacksCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/max-nested-callbacks.md',
        description: 'Maximum allowed is 10'
    };
    rule;
    defects = [];
    issues = [];
    defaultOptions = [{ 'max': MAX_DEPTH }];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        if (target instanceof lib_1.ArkFile) {
            this.checkCallbackDepth(target, (this.defaultOptions[0].max ?? MAX_DEPTH));
        }
    };
    checkCallbackDepth(arkFile, max) {
        // 解析代码段为AST树对象
        const methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const stack = [];
        const visitedNodes = new Set();
        const checkNode = (node) => {
            if (visitedNodes.has(node)) {
                return;
            }
            ;
            visitedNodes.add(node);
            if (lib_1.ts.isArrowFunction(node) || lib_1.ts.isFunctionExpression(node)) {
                const parent = node.parent;
                // 确保是作为参数传递的函数（回调）
                if (parent && lib_1.ts.isCallExpression(parent) && parent.arguments.includes(node)) {
                    stack.push({ depth: stack.length + 1, node });
                    this.createIssue(node, arkFile, stack, max, methodAst);
                }
                ;
            }
            ;
            lib_1.ts.forEachChild(node, checkNode);
            if (stack.length > 0 && stack[stack.length - 1]?.node === node) {
                stack.pop();
            }
            ;
        };
        checkNode(methodAst);
    }
    ;
    createIssue(node, arkFile, stack, max, methodAst) {
        if (stack.length > max) {
            const start = node.getStart(methodAst);
            const { line, character } = methodAst.getLineAndCharacterOfPosition(start);
            const issue = {
                line: line + 1,
                column: character + 1,
                columnEnd: character + 1 + (node.getEnd() - start),
                message: `Too many nested callbacks (${stack.length}). Maximum allowed is ${max}`,
                filePath: arkFile.getFilePath() ?? ''
            };
            this.addIssueReport(issue);
        }
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
exports.MaxNestedCallbacksCheck = MaxNestedCallbacksCheck;
