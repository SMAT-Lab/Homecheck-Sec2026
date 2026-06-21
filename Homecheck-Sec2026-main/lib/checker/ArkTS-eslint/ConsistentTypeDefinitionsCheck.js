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
exports.ConsistentTypeDefinitionsCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConsistentTypeDefinitionsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/consistent-type-definitions.md',
    description: 'TypeScript provides two common ways to define an object type: interface and type.'
};
class ConsistentTypeDefinitionsCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    enforceInterfaceMessage = 'Use an `interface` instead of a `type`.';
    enforceTypeMessage = 'Use a `type` instead of an `interface`.';
    enforceInterface = true;
    enforceType = false;
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
        if (options.length > 0) {
            const option = options[0];
            if (option.includes('interface')) {
                this.enforceInterface = true;
                this.enforceType = false;
            }
            else if (option.includes('type')) {
                this.enforceInterface = false;
                this.enforceType = true;
            }
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
                this.checkType(sourceFile, child, targetFile);
            }
            else if (arkanalyzer_1.ts.isInterfaceDeclaration(child)) {
                this.checkInterface(sourceFile, child, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkType(sourceFile, node, targetFile) {
        if (this.enforceType) {
            return;
        }
        const children = node.getChildren();
        if (children.length < 2) {
            return;
        }
        const last = this.getTypeNode(children[children.length - 1]);
        const penultimate = this.getTypeNode(children[children.length - 2]);
        const isType = (last.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken && penultimate.kind === arkanalyzer_1.ts.SyntaxKind.TypeLiteral) ||
            (last.kind === arkanalyzer_1.ts.SyntaxKind.TypeLiteral);
        if (!isType) {
            return;
        }
        // 查找Type名称
        let nameNode = undefined;
        for (const child of children) {
            if (arkanalyzer_1.ts.isIdentifier(child)) {
                nameNode = child;
                break;
            }
        }
        if (nameNode === undefined) {
            return;
        }
        this.checkTypeFix(sourceFile, node, targetFile, children, nameNode);
    }
    checkTypeFix(sourceFile, node, targetFile, children, nameNode) {
        // fix
        let fix;
        let typeKeywordNode;
        let equalsTokenNode;
        let typeLiteralNode;
        // 找到type关键字节点、等号节点和类型字面量节点
        for (const child of children) {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.TypeKeyword) {
                typeKeywordNode = child;
            }
            else if (child.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                equalsTokenNode = child;
            }
            else if (child.kind === arkanalyzer_1.ts.SyntaxKind.TypeLiteral) {
                typeLiteralNode = child;
            }
            if (typeKeywordNode && equalsTokenNode) {
                break;
            }
        }
        if (typeKeywordNode && equalsTokenNode) {
            // 获取等号后的第一个非空格字符的位置
            let endPos = equalsTokenNode.getEnd();
            const nodeText = node.getText();
            const equalsEndOffset = equalsTokenNode.getEnd() - node.getStart();
            // 查找等号后的第一个非空格字符
            let hasSpaceAfterEquals = false;
            for (let i = equalsEndOffset; i < nodeText.length; i++) {
                if (nodeText[i] !== ' ' && nodeText[i] !== '\t') {
                    endPos = node.getStart() + i;
                    break;
                }
                hasSpaceAfterEquals = true;
            }
            const prefix = node.getText().substring(0, typeKeywordNode.getStart() - node.getStart()); // 前缀（如export）
            const identifier = node.getText().substring(typeKeywordNode.getEnd() - node.getStart(), nameNode.getEnd() - node.getStart()).trim(); // 标识符，去除可能的前后空格
            // 如果等号后没有空格，添加一个空格
            const spaceAfterEquals = hasSpaceAfterEquals ? '' : ' ';
            fix = {
                range: [node.getStart(), endPos],
                text: prefix + 'interface ' + identifier + ' ' + spaceAfterEquals
            };
        }
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, nameNode.getStart());
        const defect = this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.enforceInterfaceMessage, fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    // 去掉代码外层的括号
    getTypeNode(aNode) {
        if (aNode.kind === arkanalyzer_1.ts.SyntaxKind.ParenthesizedType) {
            const children = aNode.getChildren();
            if (children.length === 3) {
                return this.getTypeNode(children[1]);
            }
        }
        return aNode;
    }
    checkInterface(sourceFile, node, targetFile) {
        if (this.enforceInterface) {
            return;
        }
        // 查找Type名称
        let nameNode = undefined;
        for (const child of node.getChildren()) {
            if (arkanalyzer_1.ts.isIdentifier(child)) {
                nameNode = child;
                break;
            }
        }
        if (nameNode === undefined) {
            return;
        }
        this.checkInterfaceFix(sourceFile, node, targetFile, nameNode);
    }
    checkInterfaceFix(sourceFile, node, targetFile, nameNode) {
        // fix
        let fix;
        const inDeclareGlobal = this.isInDeclareGlobal(node);
        if (inDeclareGlobal) {
            // 不处理declare global中的接口
            return;
        }
        let interfaceKeywordNode;
        // 找到interface关键字节点
        for (const child of node.getChildren()) {
            if (child.kind === arkanalyzer_1.ts.SyntaxKind.InterfaceKeyword) {
                interfaceKeywordNode = child;
                break;
            }
        }
        if (!interfaceKeywordNode) {
            return;
        }
        const fullText = node.getText();
        const firstNodeText = node.getChildren()[0].getText();
        if (firstNodeText.startsWith('export') && firstNodeText.endsWith('default')) {
            // 处理export default情况
            const nameIndex = fullText.indexOf(nameNode.getText());
            // 查找接口体
            const bodyStart = fullText.indexOf('{');
            const bodyEnd = fullText.lastIndexOf('}') + 1;
            const bodyText = bodyStart >= 0 && bodyEnd > bodyStart ?
                fullText.substring(bodyStart, bodyEnd) :
                '{}';
            const fixText = 'type ' + fullText.substring(nameIndex, bodyStart).trim() + ' = ' + bodyText + '\r\n' + firstNodeText + ' ' + nameNode.getText();
            fix = { range: [node.getStart(), node.getEnd()], text: fixText };
        }
        else {
            // 普通接口转换
            // 获取interface前面的修饰符部分（如export）
            const prefix = fullText.substring(0, interfaceKeywordNode.getStart() - node.getStart());
            // 获取标识符及其后面到大括号前的所有内容
            const identifierText = fullText.substring(interfaceKeywordNode.getEnd() - node.getStart(), fullText.indexOf('{')).trim();
            // 获取接口体部分
            const bodyStart = fullText.indexOf('{');
            const bodyEnd = fullText.lastIndexOf('}') + 1;
            const bodyText = bodyStart >= 0 && bodyEnd > bodyStart ?
                fullText.substring(bodyStart, bodyEnd) :
                '{}';
            // 构建修复文本
            fix = {
                range: [node.getStart(), node.getEnd()],
                text: prefix + 'type ' + identifierText + ' = ' + bodyText
            };
        }
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, nameNode.getStart());
        const defect = this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.enforceTypeMessage, fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    isInDeclareGlobal(aNode) {
        const parentNode = aNode.parent;
        if (!parentNode) {
            return false;
        }
        const reg = /declare[^\S\r\n]+global/g;
        if (parentNode.getText().match(reg)) {
            return true;
        }
        return this.isInDeclareGlobal(parentNode);
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
exports.ConsistentTypeDefinitionsCheck = ConsistentTypeDefinitionsCheck;
