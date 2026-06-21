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
exports.ConsistentIndexedObjectStyleCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConsistentIndexedObjectStyleCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/consistent-indexed-object-style.md',
    description: 'Require or disallow the Record type.'
};
class ConsistentIndexedObjectStyleCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    indexMessage = 'An index signature is preferred over a record.';
    recordMessage = 'A record is preferred over an index signature.';
    allowIndexSignature = false;
    allowRecord = true;
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
        if (!targetFile.getFilePath().endsWith('.ts')) {
            return;
        }
        let options = this.rule.option;
        if (options.includes('index-signature')) {
            this.allowIndexSignature = true;
            this.allowRecord = false;
        }
        else if (options.includes('record')) {
            this.allowIndexSignature = false;
            this.allowRecord = true;
        }
        else {
            this.allowIndexSignature = false;
            this.allowRecord = true;
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        this.loopNode(targetFile, sourceFile, sourceFileObject);
        this.reportSortedIssues();
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isTypeAliasDeclaration(child)) {
                this.checkRecord(sourceFile, child, targetFile);
                this.checkIndexSignature(sourceFile, child, targetFile);
            }
            else if (arkanalyzer_1.ts.isInterfaceDeclaration(child)) {
                this.checkIndexSignature(sourceFile, child, targetFile);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(child)) {
                this.checkRecord(sourceFile, child, targetFile);
                this.checkIndexSignature(sourceFile, child, targetFile);
            }
            else {
                this.loopNode(targetFile, sourceFile, child);
            }
        }
    }
    // 检查 IndexSignature
    checkIndexSignature(sourceFile, node, targetFile) {
        let contentList = this.getIndexSignatureContentList(sourceFile, node, targetFile);
        let indexSignature = contentList.length > 0;
        for (const child of contentList) {
            if (!arkanalyzer_1.ts.isIndexSignatureDeclaration(child)) {
                indexSignature = false;
                break;
            }
        }
        if (indexSignature && !this.allowIndexSignature) {
            let startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
            // fix
            const result = this.getIndexSignatureFix(sourceFile, node, contentList);
            const fix = result.fix;
            if (result.startPosition) {
                startPosition = result.startPosition;
            }
            const defect = this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.recordMessage, fix);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    getIndexSignatureFix(sourceFile, node, contentList) {
        let fix;
        let startPosition;
        if (arkanalyzer_1.ts.isTypeLiteralNode(node)) { // TypeAliasDeclaration | FunctionDeclaration
            // type Foo5 = { [key5: string]: string | Foo }; 改成 type Foo5 = Record<string, string | Foo>;
            const contentChildren = contentList[0].getChildren();
            const keyNode = contentChildren[1].getChildren()[0];
            if (arkanalyzer_1.ts.isParameter(keyNode)) {
                const keyType = keyNode.type;
                if (keyType) {
                    const keyTypeName = keyType.getText();
                    const value = contentChildren[4].getText();
                    const fixText = 'Record<' + keyTypeName + ', ' + value + '>';
                    fix = { range: [node.getStart(), node.getEnd()], text: fixText };
                }
            }
        }
        else if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) { // interface Foo<T> { [key: string]: unknown; } 改成 type Foo<T> = Record<string, unknown>;
            const contentChildren = contentList[0].getChildren();
            const keyNode = contentChildren[1].getChildren()[0];
            if (arkanalyzer_1.ts.isParameter(keyNode) && keyNode.type) {
                const keyTypeName = keyNode.type.getText();
                const value = contentChildren[4].getText();
                // 类名
                let className = node.name.getText();
                let startName = false;
                const nodeList = node.getChildren();
                for (let i = 0; i < nodeList.length; i++) {
                    const obj = nodeList[i];
                    if (obj.kind === arkanalyzer_1.ts.SyntaxKind.LessThanToken) {
                        startName = true;
                    }
                    if (startName) {
                        className = className + obj.getText();
                    }
                    if (obj.kind === arkanalyzer_1.ts.SyntaxKind.GreaterThanToken) {
                        break;
                    }
                }
                let exportText = '';
                if (node.modifiers && node.modifiers.length > 0) {
                    exportText = node.modifiers[0].getText() + ' ';
                    startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getChildren()[1].getStart());
                }
                const fixText = exportText + 'type ' + className + ' = Record<' + keyTypeName + ', ' + value + '>;';
                fix = { range: [node.getStart(), node.getEnd()], text: fixText };
            }
        }
        return { fix, startPosition };
    }
    getIndexSignatureContentList(sourceFile, node, targetFile) {
        let startContent = false;
        let contentList = [];
        for (const child of node.getChildren()) {
            // 将 { 和 } 之间的内容放入数组
            if (startContent && child.kind === arkanalyzer_1.ts.SyntaxKind.SyntaxList) {
                for (const obj of child.getChildren()) {
                    contentList.push(obj);
                }
            }
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.OpenBraceToken) {
                startContent = true;
            }
            else if (child.kind === arkanalyzer_1.ts.SyntaxKind.CloseBraceToken) {
                startContent = false;
            }
            this.checkIndexSignature(sourceFile, child, targetFile);
        }
        return contentList;
    }
    // 检查 Record
    checkRecord(sourceFile, node, targetFile) {
        for (const child of node.getChildren()) {
            this.checkRecord(sourceFile, child, targetFile);
            if (!arkanalyzer_1.ts.isTypeReferenceNode(child)) {
                continue;
            }
            if (!arkanalyzer_1.ts.isIdentifier(child.typeName)) {
                continue;
            }
            const name = child.typeName.escapedText;
            if (name === 'Record' || this.allowRecord) {
                continue;
            }
            // fix
            let fix;
            if (child.getChildren().length !== 4) {
                continue;
            }
            const contentNode = child.getChildren()[2];
            if (contentNode.kind === arkanalyzer_1.ts.SyntaxKind.SyntaxList) {
                const children = contentNode.getChildren();
                if (children.length === 3) {
                    const key = children[0].getText();
                    const type = children[2].getText();
                    const fixText = '{ [key: ' + key + ']: ' + type + ' }';
                    fix = { range: [child.getStart(), child.getEnd()], text: fixText };
                }
            }
            const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, child.getStart());
            const defect = this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.indexMessage, fix);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    addIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => Index_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
}
exports.ConsistentIndexedObjectStyleCheck = ConsistentIndexedObjectStyleCheck;
