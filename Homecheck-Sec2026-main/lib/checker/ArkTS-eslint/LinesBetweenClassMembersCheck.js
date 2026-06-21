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
exports.LinesBetweenClassMembersCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AwaitThenableCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/lines-between-class-members.md",
    description: "Expected blank line between class members.",
};
class LinesBetweenClassMembersCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    exceptAfterOverload = undefined;
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (arkFile) => {
        if (this.rule && this.rule.option) {
            const option = this.rule.option;
            if (option.length > 0) {
                this.exceptAfterOverload = option[0].exceptAfterOverload;
            }
        }
        const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(asRoot);
        if (sourceFileObject == undefined) {
            return;
        }
        this.loopNode(arkFile, asRoot, sourceFileObject);
        this.reportSortedIssues();
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isClassDeclaration(child) || arkanalyzer_1.ts.isClassExpression(child)) {
                this.checkClassMembers(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkClassMembers(child, sourceFile, arkFile) {
        if (this.hasAbstractModifier(child)) {
            return;
        }
        if (child.members.length <= 1) {
            return;
        }
        for (let i = 0; i < child.members.length - 1; i++) {
            const currentMember = child.members[i];
            let nextMember = child.members[i + 1];
            const currentEndLine = this.getEndLine(currentMember, sourceFile);
            let nextStartLine = this.getStartLine(nextMember, sourceFile);
            if (this.shouldSkipSemicolonToProperty(currentMember, nextMember, child, i)) {
                continue;
            }
            let abstractModifier = currentMember.modifiers?.
                find(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
            if (arkanalyzer_1.ts.isPropertyDeclaration(currentMember) && !abstractModifier && this.exceptAfterOverload === undefined) {
                let isPropertyDeclarationWithSpacing = this.checkPropertySpacing(currentMember, nextMember, child, i, currentEndLine, sourceFile, arkFile);
                if (isPropertyDeclarationWithSpacing) {
                    continue;
                }
            }
            if (this.exceptAfterOverload !== false && this.isOverload(currentMember)) {
                continue;
            }
            if (this.exceptAfterOverload !== false) {
                this.handleExceptAfterOverload(child, i, sourceFile, arkFile);
            }
            else {
                this.handleNoExceptAfterOverload(currentMember, nextMember, currentEndLine, nextStartLine, sourceFile, arkFile);
            }
        }
    }
    shouldSkipSemicolonToProperty(currentMember, nextMember, child, i) {
        if (arkanalyzer_1.ts.isSemicolonClassElement(currentMember) &&
            currentMember.getText() === ';' &&
            arkanalyzer_1.ts.isPropertyDeclaration(nextMember) &&
            i > 0 &&
            arkanalyzer_1.ts.isPropertyDeclaration(child.members[i - 1]) &&
            this.exceptAfterOverload === undefined) {
            const abstractNextModifier = nextMember.modifiers?.find(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword);
            return !abstractNextModifier;
        }
        return false;
    }
    checkPropertySpacing(currentMember, nextMember, child, i, currentEndLine, sourceFile, arkFile) {
        let nextNewMember = child.members[i + 1];
        let nextNewStartLine = this.getStartLine(nextNewMember, sourceFile);
        // 处理分号占位符的情况
        if (arkanalyzer_1.ts.isSemicolonClassElement(nextMember) && nextMember.getText() === ';') {
            if (i + 2 <= child.members.length - 1) {
                nextNewMember = child.members[i + 2];
                nextNewStartLine = this.getStartLine(nextNewMember, sourceFile);
            }
            else {
                return true;
            }
        }
        if (arkanalyzer_1.ts.isPropertyDeclaration(nextNewMember)) {
            if (nextNewStartLine - currentEndLine > 1) {
                const positionInfo = this.getPositionInfo(nextNewMember, sourceFile);
                this.handlePropertyDeclarationWithSpacing(currentMember, nextNewMember, currentEndLine, sourceFile, arkFile, positionInfo);
            }
            return true;
        }
        return false;
    }
    handlePropertyDeclarationWithSpacing(currentMember, nextNewMember, currentEndLine, sourceFile, arkFile, positionInfo) {
        const fullText = nextNewMember.getFullText();
        const modifiedText = fullText.replace(/\r\n/, '');
        const fix = {
            range: [nextNewMember.getFullStart(), nextNewMember.getEnd()],
            text: modifiedText
        };
        const defect = this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, 'Unexpected blank line between class members.', fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    hasAbstractModifier(child) {
        for (const modifier of child.modifiers ?? []) {
            if (modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword) {
                return true;
            }
        }
        if (!child.members) {
            return false;
        }
        if (child.members?.length > 0 && arkanalyzer_1.ts.isMethodDeclaration(child.members[0])) {
            return child.members[0].modifiers?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AbstractKeyword) ?? false;
        }
        return false;
    }
    handleExceptAfterOverload(child, i, sourceFile, arkFile) {
        let members = [];
        let semicolonElements = [];
        // 收集所有非分号成员和分号成员，记录它们的索引关系
        child.members.forEach((member, idx) => {
            if (!arkanalyzer_1.ts.isSemicolonClassElement(member) && member.getText() !== ';') {
                members.push(member);
            }
            else if (idx > 0) {
                // 记录分号元素及其前一个元素在members中的位置
                semicolonElements.push({ element: member, index: members.length - 1 });
            }
            ;
        });
        for (let j = i + 1; j < members.length; j++) {
            const currentMember = members[i];
            let nextMember = members[j];
            if (this.checkMembersCondition(members, i, j, sourceFile)) {
                const positionInfo = this.getPositionInfo(nextMember, sourceFile);
                const sourceText = sourceFile.text;
                const currentMemberEnd = currentMember.getEnd();
                const semicolonAfterMember = semicolonElements.find(item => item.index === i);
                // 确定要检查尾随注释的结束位置
                let checkPos = semicolonAfterMember
                    ? semicolonAfterMember.element.getEnd() // 如果有分号元素，从分号元素结束位置开始检查
                    : currentMemberEnd; // 否则从当前成员结束位置开始检查
                const trailingComments = arkanalyzer_1.ts.getTrailingCommentRanges(sourceText, checkPos);
                let endPos = checkPos; // 初始结束位置
                if (trailingComments && trailingComments.length > 0) {
                    endPos = trailingComments[trailingComments.length - 1].end;
                }
                ;
                // 获取从成员开始到结束位置的所有文本（包括可能的分号和注释）
                const fullText = sourceText.substring(currentMember.getStart(), endPos);
                const fix = {
                    range: [currentMember.getStart(), endPos],
                    text: fullText + '\n'
                };
                const defect = this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description, fix);
                this.issueMap.set(defect.fixKey, { defect, fix });
                break;
            }
        }
    }
    handleNoExceptAfterOverload(currentMember, nextMember, currentEndLine, nextStartLine, sourceFile, arkFile) {
        if (nextStartLine - currentEndLine <= 1) {
            const positionInfo = this.getPositionInfo(nextMember, sourceFile);
            const fix = {
                range: [currentMember.getStart(), currentMember.getEnd()],
                text: currentMember.getText() + '\n'
            };
            const defect = this.addIssueReport(arkFile, positionInfo.startPosition.line + 1, positionInfo.startPosition.character + 1, positionInfo.endPosition.character + 1, this.metaData.description, fix);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    checkMembersCondition(members, i, j, sourceFile) {
        const currentMember = members[i];
        const nextMember = members[j];
        const currentEndLine = this.getEndLine(currentMember, sourceFile);
        const nextStartLine = this.getStartLine(nextMember, sourceFile);
        if (nextStartLine - currentEndLine <= j - i) {
            return !this.isOverload(nextMember);
        }
        return false;
    }
    getStartLine(node, sourceFile) {
        const start = node.getStart(sourceFile);
        return sourceFile.getLineAndCharacterOfPosition(start).line + 1;
    }
    getEndLine(node, sourceFile) {
        const end = node.getEnd();
        return sourceFile.getLineAndCharacterOfPosition(end).line + 1;
    }
    isOverload(node) {
        return (node.kind === arkanalyzer_1.ts.SyntaxKind.MethodDeclaration && node.body === undefined) ||
            (node.kind === arkanalyzer_1.ts.SyntaxKind.Constructor && node.body === undefined) ||
            (node.kind === arkanalyzer_1.ts.SyntaxKind.SetAccessor && node.body === undefined) ||
            (node.kind === arkanalyzer_1.ts.SyntaxKind.GetAccessor && node.body === undefined);
    }
    getPositionInfo(expression, sourceFile) {
        const start = expression.getStart();
        const end = expression.getEnd();
        const startPositionInfo = sourceFile.getLineAndCharacterOfPosition(start);
        const endPositionInfo = sourceFile.getLineAndCharacterOfPosition(end);
        return {
            startPosition: startPositionInfo,
            endPosition: endPositionInfo
        };
    }
    addIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_2.IssueReport(defect, fix));
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
exports.LinesBetweenClassMembersCheck = LinesBetweenClassMembersCheck;
