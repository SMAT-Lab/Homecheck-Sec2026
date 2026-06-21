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
exports.MemberDelimiterStyleCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AwaitThenableCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/member-delimiter-style.md",
    description: "Require a specific member delimiter style for interfaces and type literals",
};
class MemberDelimiterStyleCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    multilineDetection = 'brackets';
    interfaceMultilineDelimiter = 'semi';
    interfaceMultilineRequireLast = true;
    interfaceSingleLineDelimiter = 'semi';
    interfaceSingleLineRequireLast = false;
    typeLiteralMultilineDelimiter = 'semi';
    typeLiteralMultilineRequireLast = true;
    typeLiteralSingleLineDelimiter = 'semi';
    typeLiteralSingleLineRequireLast = false;
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
        this.parseOptions(this.rule?.option);
        const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(asRoot);
        if (!sourceFileObject) {
            return;
        }
        this.loopNode(arkFile, asRoot, sourceFileObject);
        this.reportSortedIssues();
    };
    parseOptions(options) {
        if (options && options.length > 0) {
            const defaultOptions = options[0];
            this.multilineDetection = defaultOptions?.multilineDetection || 'brackets';
            this.interfaceMultilineDelimiter = defaultOptions?.multiline?.delimiter || 'semi';
            this.interfaceMultilineRequireLast = defaultOptions?.multiline?.requireLast || true;
            this.interfaceSingleLineDelimiter = defaultOptions?.singleline?.delimiter || 'semi';
            this.interfaceSingleLineRequireLast = defaultOptions?.singleline?.requireLast || false;
            this.applyDefaultOptions(defaultOptions);
            if (defaultOptions?.overrides) {
                this.applyOverrides(defaultOptions.overrides);
            }
        }
    }
    applyDefaultOptions(defaultOptions) {
        this.typeLiteralMultilineDelimiter = defaultOptions?.multiline?.delimiter || 'semi';
        this.typeLiteralMultilineRequireLast = defaultOptions?.multiline?.requireLast || true;
        this.typeLiteralSingleLineDelimiter = defaultOptions?.singleline?.delimiter || 'semi';
        this.typeLiteralSingleLineRequireLast = defaultOptions?.singleline?.requireLast || false;
    }
    applyOverrides(overrides) {
        if (overrides?.interface) {
            this.interfaceMultilineDelimiter = overrides.interface.multiline?.delimiter || 'semi';
            this.interfaceMultilineRequireLast = overrides.interface.multiline?.requireLast || true;
            this.interfaceSingleLineDelimiter = overrides.interface.singleline?.delimiter || 'semi';
            this.interfaceSingleLineRequireLast = overrides.interface.singleline?.requireLast || false;
        }
        if (overrides?.typeLiteral) {
            this.typeLiteralMultilineDelimiter = overrides.typeLiteral.multiline?.delimiter || 'semi';
            this.typeLiteralMultilineRequireLast = overrides.typeLiteral.multiline?.requireLast || true;
            this.typeLiteralSingleLineDelimiter = overrides.typeLiteral.singleline?.delimiter || 'semi';
            this.typeLiteralSingleLineRequireLast = overrides.typeLiteral.singleline?.requireLast || false;
        }
    }
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isInterfaceDeclaration(child)) {
                this.checkInterfaceMembers(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(child)) {
                this.checkTypeAliasMembers(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkInterfaceMembers(child, sourceFile, arkFile) {
        const members = child?.members;
        if (!members) {
            return;
        }
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const isLastMember = i === members.length - 1;
            const { isSameLine } = this.getLineInfo(child, members, sourceFile, isLastMember);
            if (member.getChildren().length > 1) {
                this.processMember(member, sourceFile, arkFile, isSameLine, isLastMember);
            }
        }
    }
    getLineInfo(child, members, sourceFile, isLastMember) {
        let startLine = this.getStartLine(child, sourceFile);
        if (this.multilineDetection === 'last-member' && isLastMember) {
            startLine = this.getStartLine(members[members.length - 1], sourceFile);
        }
        const endLine = this.getEndLine(child, sourceFile);
        const isSameLine = startLine === endLine;
        return { startLine, endLine, isSameLine };
    }
    processMember(member, sourceFile, arkFile, isSameLine, isLastMember) {
        const lastToken = member.getChildren()[member.getChildren().length - 1];
        const positionInfo = this.getPositionInfo(member, sourceFile);
        if (isSameLine && isLastMember) {
            this.checkSingleLineLastMember(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else if (isSameLine) {
            this.checkSingleLineMember(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else if (!isSameLine && isLastMember) {
            this.checkMultilineLastMember(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else {
            this.checkMultilineMember(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkSingleLineLastMember(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (this.interfaceSingleLineRequireLast) {
            this.checkDelimiter(member, lastToken, positionInfo, sourceFile, arkFile, this.interfaceSingleLineDelimiter);
        }
        else {
            this.removeDelimiterIfPresent(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkSingleLineMember(member, lastToken, positionInfo, sourceFile, arkFile) {
        this.checkDelimiter(member, lastToken, positionInfo, sourceFile, arkFile, this.interfaceSingleLineDelimiter);
    }
    checkMultilineLastMember(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (this.interfaceMultilineRequireLast) {
            this.checkDelimiter(member, lastToken, positionInfo, sourceFile, arkFile, this.interfaceMultilineDelimiter);
        }
        else {
            this.removeDelimiterIfPresent(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkMultilineMember(member, lastToken, positionInfo, sourceFile, arkFile) {
        this.checkDelimiter(member, lastToken, positionInfo, sourceFile, arkFile, this.interfaceMultilineDelimiter);
    }
    checkDelimiter(member, lastToken, positionInfo, sourceFile, arkFile, delimiter) {
        if (delimiter === 'none' && (lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken)) {
            this.removeDelimiter(member, positionInfo, arkFile, lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken);
        }
        else if (delimiter === 'semi' && lastToken.kind !== arkanalyzer_1.ts.SyntaxKind.SemicolonToken) {
            this.replaceDelimiter(member, lastToken, positionInfo, arkFile, ';');
        }
        else if (delimiter === 'comma' && lastToken.kind !== arkanalyzer_1.ts.SyntaxKind.CommaToken) {
            this.replaceDelimiter(member, lastToken, positionInfo, arkFile, ',');
        }
    }
    removeDelimiterIfPresent(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken) {
            this.removeDelimiter(member, positionInfo, arkFile, lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken);
        }
    }
    removeDelimiter(member, positionInfo, arkFile, semicolonToken) {
        const result = member.getText().slice(0, -1);
        const fix = { range: [member.getStart(), member.getEnd()], text: result };
        const defect = this.addIssueReport(arkFile, positionInfo.endPosition.line + 1, positionInfo.endPosition.character + 1, positionInfo.endPosition.character + 1, (`Unexpected separator ${semicolonToken ? '(;).' : '(,).'}`), fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    replaceDelimiter(member, lastToken, positionInfo, arkFile, delimiter) {
        const result = lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken
            ? member.getText().slice(0, -1) + delimiter
            : member.getText() + delimiter;
        const fix = { range: [member.getStart(), member.getEnd()], text: result };
        const defect = this.addIssueReport(arkFile, positionInfo.endPosition.line + 1, positionInfo.endPosition.character + 1, positionInfo.endPosition.character + 1, (`Expected a ${delimiter === ';' ? 'semicolon.' : 'comma.'}`), fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    checkTypeAliasMembers(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isTypeAliasDeclaration(child) && !arkanalyzer_1.ts.isPropertySignature(child)) {
            return;
        }
        if (arkanalyzer_1.ts.isUnionTypeNode(child.type) || arkanalyzer_1.ts.isIntersectionTypeNode(child.type)) {
            child.type.types.forEach((type) => {
                if (arkanalyzer_1.ts.isTypeLiteralNode(type)) {
                    const members = type.members;
                    this.processTypeAliasMembers(members, child, sourceFile, arkFile);
                }
            });
        }
        if (!arkanalyzer_1.ts.isTypeLiteralNode(child.type)) {
            return;
        }
        const members = child.type.members;
        this.processTypeAliasMembers(members, child, sourceFile, arkFile);
    }
    processTypeAliasMembers(members, child, sourceFile, arkFile) {
        for (const [i, member] of members.entries()) {
            if (member.getChildren().length <= 1) {
                continue;
            }
            const isLastMember = i === members.length - 1;
            if (child.type) {
                const { isSameLine } = this.getLineInfoType(child.type, members, sourceFile, isLastMember);
                this.processMemberType(member, sourceFile, arkFile, isSameLine, isLastMember);
            }
        }
    }
    getLineInfoType(child, members, sourceFile, isLastMember) {
        let startLine = this.getStartLine(child, sourceFile);
        if (this.multilineDetection === 'last-member' && isLastMember) {
            startLine = this.getStartLine(members[members.length - 1], sourceFile);
        }
        const endLine = this.getEndLine(child, sourceFile);
        const isSameLine = startLine === endLine;
        return { startLine, endLine, isSameLine };
    }
    processMemberType(member, sourceFile, arkFile, isSameLine, isLastMember) {
        const lastToken = member.getChildren()[member.getChildren().length - 1];
        const positionInfo = this.getPositionInfo(member, sourceFile);
        if (isSameLine && isLastMember) {
            this.checkSingleLineLastMemberType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else if (isSameLine) {
            this.checkSingleLineMemberType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else if (!isSameLine && isLastMember) {
            this.checkMultilineLastMemberType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
        else {
            this.checkMultilineMemberType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkSingleLineLastMemberType(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (this.typeLiteralSingleLineRequireLast) {
            this.checkDelimiterType(member, lastToken, positionInfo, sourceFile, arkFile, this.typeLiteralSingleLineDelimiter);
        }
        else {
            this.removeDelimiterIfPresentType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkSingleLineMemberType(member, lastToken, positionInfo, sourceFile, arkFile) {
        this.checkDelimiterType(member, lastToken, positionInfo, sourceFile, arkFile, this.typeLiteralSingleLineDelimiter);
    }
    checkMultilineLastMemberType(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (this.typeLiteralMultilineRequireLast) {
            this.checkDelimiterType(member, lastToken, positionInfo, sourceFile, arkFile, this.typeLiteralMultilineDelimiter);
        }
        else {
            this.removeDelimiterIfPresentType(member, lastToken, positionInfo, sourceFile, arkFile);
        }
    }
    checkMultilineMemberType(member, lastToken, positionInfo, sourceFile, arkFile) {
        this.checkDelimiterType(member, lastToken, positionInfo, sourceFile, arkFile, this.typeLiteralMultilineDelimiter);
    }
    checkDelimiterType(member, lastToken, positionInfo, sourceFile, arkFile, delimiter) {
        if (delimiter === 'none' && (lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken)) {
            this.removeDelimiterType(member, positionInfo, arkFile, lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken);
        }
        else if (delimiter === 'semi' && lastToken.kind !== arkanalyzer_1.ts.SyntaxKind.SemicolonToken) {
            this.replaceDelimiterType(member, lastToken, positionInfo, arkFile, ';');
        }
        else if (delimiter === 'comma' && lastToken.kind !== arkanalyzer_1.ts.SyntaxKind.CommaToken) {
            this.replaceDelimiterType(member, lastToken, positionInfo, arkFile, ',');
        }
    }
    removeDelimiterIfPresentType(member, lastToken, positionInfo, sourceFile, arkFile) {
        if (lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken) {
            this.removeDelimiterType(member, positionInfo, arkFile, lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken);
        }
    }
    removeDelimiterType(member, positionInfo, arkFile, semicolonToken) {
        const result = member.getText().slice(0, -1);
        const fix = { range: [member.getStart(), member.getEnd()], text: result };
        const defect = this.addIssueReport(arkFile, positionInfo.endPosition.line + 1, positionInfo.endPosition.character + 1, positionInfo.endPosition.character + 1, (`Unexpected separator ${semicolonToken ? '(;).' : '(,).'}`), fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    replaceDelimiterType(member, lastToken, positionInfo, arkFile, delimiter) {
        const result = lastToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken || lastToken.kind === arkanalyzer_1.ts.SyntaxKind.SemicolonToken
            ? member.getText().slice(0, -1) + delimiter
            : member.getText() + delimiter;
        const fix = { range: [member.getStart(), member.getEnd()], text: result };
        const defect = this.addIssueReport(arkFile, positionInfo.endPosition.line + 1, positionInfo.endPosition.character + 1, positionInfo.endPosition.character + 1, (`Expected a ${delimiter === ';' ? 'semicolon.' : 'comma.'}`), fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    getStartLine(node, sourceFile) {
        const start = node.getStart(sourceFile);
        return sourceFile.getLineAndCharacterOfPosition(start).line + 1;
    }
    getEndLine(node, sourceFile) {
        const end = node.getEnd();
        return sourceFile.getLineAndCharacterOfPosition(end).line + 1;
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
exports.MemberDelimiterStyleCheck = MemberDelimiterStyleCheck;
