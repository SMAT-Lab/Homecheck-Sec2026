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
exports.NoRequireImportsCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoRequireImportsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-require-imports.md',
    description: 'A `require()` style import is forbidden.'
};
class NoRequireImportsCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    allowDestructuring = true;
    allowedNames = [];
    issues = [];
    requireDefined = false; // require 是否是自定义方法
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
        this.requireDefined = false;
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
            if (arkanalyzer_1.ts.isVariableDeclaration(child)) {
                this.checkVariableDeclaration(targetFile, sourceFile, child);
            }
            else if (arkanalyzer_1.ts.isCallExpression(child)) {
                this.checkCallExpression(targetFile, sourceFile, child);
            }
            else if (arkanalyzer_1.ts.isExternalModuleReference(child)) {
                this.checkExternalModuleReference(targetFile, sourceFile, child);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    // 检查require是否是自定义函数
    checkVariableDeclaration(targetFile, sourceFile, aNode) {
        if (this.requireDefined) {
            return;
        }
        const children = aNode.getChildren();
        if (children.length !== 3) {
            return;
        }
        const firstNode = children[0];
        const secondNode = children[1];
        if (firstNode.kind === arkanalyzer_1.ts.SyntaxKind.Identifier &&
            firstNode.getText() === 'require' &&
            secondNode.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            this.requireDefined = true;
        }
    }
    checkCallExpression(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        if (children.length === 0) {
            return;
        }
        const firstNode = children[0];
        if (!arkanalyzer_1.ts.isIdentifier(firstNode)) {
            return;
        }
        const name = firstNode.getText();
        if (name !== 'require') {
            return;
        }
        this.reportIssue(targetFile, sourceFile, aNode);
    }
    checkExternalModuleReference(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        if (children.length === 0) {
            return;
        }
        const firstNode = children[0];
        if (firstNode.kind !== arkanalyzer_1.ts.SyntaxKind.RequireKeyword) {
            return;
        }
        this.reportIssue(targetFile, sourceFile, aNode);
    }
    reportIssue(targetFile, sourceFile, aNode) {
        const parent = aNode.parent;
        if (!arkanalyzer_1.ts.isImportEqualsDeclaration(parent) && this.requireDefined) {
            return;
        }
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
        const startLine = startPosition.line + 1;
        const startCol = startPosition.character + 1;
        this.addIssueReport(targetFile, startLine, startCol, 0, gMetaData.description);
    }
    addIssueReport(arkFile, line, startCol, endCol, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoRequireImportsCheck = NoRequireImportsCheck;
