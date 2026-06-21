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
exports.NoExtraNonNullAssertionCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, "NoExtraNonNullAssertionCheck");
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-extra-non-null-assertion.md",
    description: "Disallow extra non-null assertions",
};
class NoExtraNonNullAssertionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatchCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatchCb];
    }
    check = (target) => {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.issueMap.clear();
        this.visitNodes(sourceFile, target);
        this.reportSortedIssues();
    };
    visitNodes(sourceFile, target) {
        const visit = (node) => {
            if (lib_1.ts.isNonNullExpression(node)) {
                this.checkNestedNonNullExpression(node, sourceFile, target);
                this.checkParenthesizedNonNullExpression(node, sourceFile, target);
                this.checkOptionalChainingWithNonNull(node, sourceFile, target);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        lib_1.ts.forEachChild(sourceFile, visit);
    }
    checkNestedNonNullExpression(node, sourceFile, target) {
        if (lib_1.ts.isNonNullExpression(node.expression)) {
            const pos = node.getStart();
            const pos2 = node.getEnd();
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            this.addIssueReport(target, line + 1, character + 1, pos2, 'Forbidden extra non-null assertion.');
        }
    }
    checkParenthesizedNonNullExpression(node, sourceFile, target) {
        if (lib_1.ts.isParenthesizedExpression(node.expression) &&
            lib_1.ts.isNonNullExpression(node.expression.expression)) {
            const pos = node.expression.expression.getStart();
            const pos2 = node.expression.expression.getEnd();
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            this.addIssueReport(target, line + 1, character + 1, pos2, 'Forbidden extra non-null assertion.');
        }
    }
    checkOptionalChainingWithNonNull(node, sourceFile, target) {
        let parent = node.parent;
        if ((lib_1.ts.isPropertyAccessExpression(parent) && parent.questionDotToken) ||
            (lib_1.ts.isCallExpression(parent) && parent.questionDotToken) ||
            (lib_1.ts.isParenthesizedExpression(parent) && ((lib_1.ts.isPropertyAccessExpression(parent.parent) && parent.parent.questionDotToken) ||
                (lib_1.ts.isCallExpression(parent.parent) && parent.parent.questionDotToken))) ||
            (lib_1.ts.isElementAccessExpression(parent) &&
                parent.questionDotToken &&
                parent.expression === node)) {
            const pos = node.getStart();
            const pos2 = node.getEnd();
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
            this.addIssueReport(target, line + 1, character + 1, pos2, 'Forbidden extra non-null assertion.');
        }
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => {
            const [lineA, colA] = keyA.split('%');
            const [lineB, colB] = keyB.split('%');
            if (lineA !== lineB) {
                return Number(lineA) - Number(lineB);
            }
            return Number(colA) - Number(colB);
        });
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const issueKey = `${line}%${startCol}%${endCol}%${this.rule.ruleId}`;
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const visit = (node) => {
            if (lib_1.ts.isNonNullExpression(node)) {
                const { line: nodeLine, character: nodeChar } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                if (nodeLine + 1 === line && nodeChar + 1 === startCol) {
                    return node;
                }
            }
            return lib_1.ts.forEachChild(node, visit);
        };
        const targetNode = lib_1.ts.forEachChild(sourceFile, visit);
        if (targetNode && lib_1.ts.isNonNullExpression(targetNode)) {
            let fix;
            if (lib_1.ts.isNonNullExpression(targetNode.expression)) {
                let current = targetNode;
                while (lib_1.ts.isNonNullExpression(current.expression)) {
                    current = current.expression;
                }
                fix = {
                    range: [current.end, targetNode.end],
                    text: ''
                };
            }
            else {
                fix = {
                    range: [targetNode.end - 1, targetNode.end],
                    text: ''
                };
            }
            this.issueMap.set(issueKey, { defect, fix });
        }
    }
}
exports.NoExtraNonNullAssertionCheck = NoExtraNonNullAssertionCheck;
