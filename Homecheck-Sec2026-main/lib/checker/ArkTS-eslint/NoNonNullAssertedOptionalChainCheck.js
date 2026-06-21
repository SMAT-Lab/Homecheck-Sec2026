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
exports.NoNonNullAssertedOptionalChainCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoNonNullAssertedOptionalChainCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-non-null-asserted-optional-chain.md',
    description: 'Disallow non-null assertions after an optional chain expression.'
};
class NoNonNullAssertedOptionalChainCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
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
            if (arkanalyzer_1.ts.isNonNullExpression(child)) {
                this.checkNonNullExpression(targetFile, sourceFile, child);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkNonNullExpression(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        if (children.length !== 2) {
            return;
        }
        const originFirstChild = children[0];
        const handleChild = this.removeParen(originFirstChild, 0);
        const firstChild = handleChild.node;
        let foundQuestionDotToken = false;
        for (const child of firstChild.getChildren()) {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.QuestionDotToken) {
                foundQuestionDotToken = true;
                break;
            }
            if (!arkanalyzer_1.ts.isPropertyAccessExpression(child)) {
                continue;
            }
            for (const chd of child.getChildren()) {
                if (chd.kind === arkanalyzer_1.ts.SyntaxKind.QuestionDotToken) {
                    foundQuestionDotToken = true;
                    break;
                }
            }
        }
        if (!foundQuestionDotToken) {
            return;
        }
        let reportIssue = false;
        const parentNode = aNode.parent;
        if (parentNode) {
            const nodeList = parentNode.getChildren();
            let currentIndex = nodeList.indexOf(aNode);
            if (currentIndex === -1) {
                currentIndex = this.handleCurrentIndex(nodeList, aNode, currentIndex);
            }
            if (currentIndex === -1) {
                return;
            }
            reportIssue = this.handleReportIssue(nodeList, currentIndex, reportIssue, originFirstChild);
        }
        else {
            reportIssue = true;
        }
        if (reportIssue) {
            const message = 'Optional chain expressions can return undefined by design - using a non-null assertion is unsafe and wrong.';
            const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
            const startLine = startPosition.line + 1;
            const startCol = startPosition.character + 1 + handleChild.count;
            this.addIssueReport(targetFile, startLine, startCol, 0, message);
        }
    }
    handleCurrentIndex(nodeList, aNode, currentIndex) {
        for (const node of nodeList) {
            let foundNode = false;
            for (const nodeElement of node.getChildren()) {
                if (nodeElement === aNode) {
                    foundNode = true;
                    break;
                }
            }
            if (foundNode) {
                currentIndex = nodeList.indexOf(node);
                break;
            }
        }
        return currentIndex;
    }
    handleReportIssue(nodeList, currentIndex, reportIssue, originFirstChild) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < nodeList.length) {
            const nextNode = nodeList[nextIndex];
            if (nextNode.kind === arkanalyzer_1.ts.SyntaxKind.CloseParenToken ||
                nextNode.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken ||
                nextNode.kind === arkanalyzer_1.ts.SyntaxKind.TemplateTail) {
                reportIssue = true;
            }
            else { // 感叹号前必须是反圆括号
                const aNodeChildList = originFirstChild.getChildren();
                const last = aNodeChildList[aNodeChildList.length - 1];
                if (last.kind === arkanalyzer_1.ts.SyntaxKind.CloseParenToken) {
                    reportIssue = true;
                }
            }
        }
        else {
            reportIssue = true;
        }
        return reportIssue;
    }
    removeParen(aNode, removeCount) {
        const children = aNode.getChildren();
        if (children.length === 3) {
            if (children[0].kind === arkanalyzer_1.ts.SyntaxKind.OpenParenToken && children[children.length - 1].kind === arkanalyzer_1.ts.SyntaxKind.CloseParenToken) {
                removeCount++;
                return this.removeParen(children[1], removeCount);
            }
        }
        return { node: aNode, count: removeCount };
    }
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoNonNullAssertedOptionalChainCheck = NoNonNullAssertedOptionalChainCheck;
