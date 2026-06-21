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
exports.MaxClassesPerFileCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
;
const MAX_DEPTH = 1;
class MaxClassesPerFileCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/max-classes-per-file.md',
        description: 'Enforce a maximum number of classes per file'
    };
    rule;
    defects = [];
    issues = [];
    defaultOptions = [{ 'max': MAX_DEPTH, 'ignoreExpressions': false }];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        return [{
                matcher: this.fileMatcher,
                callback: this.check,
            }];
    }
    ;
    check = (target) => {
        this.parseOptions();
        if (target instanceof lib_1.ArkFile) {
            this.validateClassCount(target);
        }
        ;
    };
    parseOptions() {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
    }
    ;
    validateClassCount(arkFile) {
        const ast = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const { max, ignoreExpressions } = this.defaultOptions[0];
        let classCount = 0;
        const checkNode = (node) => {
            if (lib_1.ts.isClassDeclaration(node)) {
                classCount++;
            }
            else if (!ignoreExpressions && lib_1.ts.isClassExpression(node)) {
                classCount++;
            }
            lib_1.ts.forEachChild(node, checkNode);
        };
        checkNode(ast);
        if (classCount > max) {
            this.createFileIssue(arkFile, classCount, max, ast);
        }
        ;
    }
    ;
    getFirstCodePosition(sourceFile) {
        // 查找第一个实际代码节点（忽略import/注释）
        let firstPos = sourceFile.getStart();
        const visit = (node) => {
            if (!lib_1.ts.isImportDeclaration(node) &&
                !lib_1.ts.isDecorator(node) &&
                node.getStart() < firstPos) {
                firstPos = node.getStart();
            }
            ;
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(sourceFile, visit);
        return firstPos;
    }
    ;
    createFileIssue(arkFile, count, max, ast) {
        const firstCodePos = this.getFirstCodePosition(ast);
        const { line, character } = ast.getLineAndCharacterOfPosition(firstCodePos);
        const issue = {
            line: line + 1,
            column: character + 1,
            columnEnd: character + 1,
            message: `File has too many classes (${count}). Maximum allowed is ${max}`,
            filePath: arkFile.getFilePath() ?? ''
        };
        this.addIssueReport(issue);
    }
    ;
    addIssueReport(issue) {
        const severity = this.rule?.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, issue.message, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.MaxClassesPerFileCheck = MaxClassesPerFileCheck;
