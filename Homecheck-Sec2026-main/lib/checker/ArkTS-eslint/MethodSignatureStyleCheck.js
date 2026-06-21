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
exports.MethodSignatureStyleCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AwaitThenableCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/method-signature-style.md",
    description: "Shorthand method signature is forbidden. Use a function property instead.",
};
class MethodSignatureStyleCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    optionsStyle = 'property';
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
        if (!this.getFileExtension(arkFile.getName(), 'ts')) {
            return;
        }
        if (this.rule && this.rule.option) {
            const option = this.rule.option;
            if (option.length > 0) {
                this.optionsStyle = option[0];
            }
        }
        if (this.optionsStyle === 'method') {
            this.metaData.description = 'Function property signature is forbidden. Use a method shorthand instead.';
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
            if (arkanalyzer_1.ts.isInterfaceDeclaration(child)) {
                this.checkInterfaceMembers(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(child)) {
                this.checkTypeAliasMembers(child, sourceFile, targetFile);
            }
            else if (arkanalyzer_1.ts.isTypeLiteralNode(child)) {
                this.checkInterfaceMembers(child, sourceFile, targetFile);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkInterfaceMembers(child, sourceFile, arkFile) {
        const members = child?.members;
        if (!members) {
            return;
        }
        const nameList = this.buildNameList(members);
        const duplicateIndices = this.findDuplicateNamesWithIndices(nameList);
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            if (arkanalyzer_1.ts.isMethodSignature(member)) {
                this.handleMethodSignature(members, member, duplicateIndices, i, sourceFile, arkFile);
            }
            else if (arkanalyzer_1.ts.isPropertySignature(member)) {
                this.handlePropertySignature(member, sourceFile, arkFile);
            }
        }
    }
    buildNameList(members) {
        let nameList = [];
        members.forEach((member) => {
            if (this.optionsStyle === 'property') {
                if (arkanalyzer_1.ts.isMethodSignature(member)) {
                    nameList.push(member.name.getText());
                }
                else {
                    nameList.push('');
                }
            }
        });
        return nameList;
    }
    handleMethodSignature(members, member, duplicateIndices, index, sourceFile, arkFile) {
        if (this.optionsStyle === 'property' && !(member.type && arkanalyzer_1.ts.isFunctionTypeNode(member.type))) {
            const duplicateList = duplicateIndices.get(member.name.getText());
            if (duplicateList) {
                if (duplicateList[duplicateList.length - 1] === index) {
                    this.processLastDuplicateMethod(members, member, duplicateList, sourceFile, arkFile);
                }
                else {
                    this.processDuplicateMethod(member, sourceFile, arkFile);
                }
            }
            else {
                this.processUniqueMethod(member, sourceFile, arkFile);
            }
        }
    }
    processLastDuplicateMethod(members, member, duplicateList, sourceFile, arkFile) {
        let code = member.name.getText() + ': ';
        const duplicatesMethodBody = this.collectDuplicatesMethodBody(members, duplicateList, member);
        duplicatesMethodBody.forEach((methodBody) => {
            code += '(' + methodBody + ') & ';
        });
        const fixCode = this.replaceLastOccurrence(member.getText(), member.type?.getText());
        const methodBody = this.extractMethodBody(fixCode, member.name.getText());
        code += '(' + methodBody + ');';
        this.reportIssue(member, sourceFile, arkFile, code);
    }
    collectDuplicatesMethodBody(members, duplicateList, member) {
        let duplicatesMethodBody = [];
        duplicateList.forEach((index) => {
            if (index !== duplicateList[duplicateList.length - 1]) {
                const currentMember = members[index];
                const fixCode = this.replaceLastOccurrence(currentMember.getText(), currentMember.type?.getText() ?? '');
                const methodBody = this.extractMethodBody(fixCode, currentMember.name.getText());
                duplicatesMethodBody.push(methodBody);
            }
        });
        return duplicatesMethodBody;
    }
    extractMethodBody(fixCode, methodName) {
        return fixCode.replace(methodName, '').replace(',', '').replace(';', '');
    }
    processDuplicateMethod(member, sourceFile, arkFile) {
        const fixCode = this.replaceLastOccurrence(member.getText(), member.type?.getText());
        const methodBody = this.extractMethodBody(fixCode, member.name.getText());
        this.reportIssue(member, sourceFile, arkFile, '', methodBody);
    }
    processUniqueMethod(member, sourceFile, arkFile) {
        let newCode = this.replaceFirstOccurrence(member.getText(), member.name?.getText());
        let fixCode = '';
        if (member.type) {
            fixCode = this.replaceLastOccurrence(newCode, member.type?.getText());
        }
        else {
            newCode = newCode.replace(',', '').replace(';', '');
            fixCode = newCode + ' => any;';
        }
        this.reportIssue(member, sourceFile, arkFile, fixCode);
    }
    handlePropertySignature(member, sourceFile, arkFile) {
        if (this.optionsStyle === 'method' && member.type && arkanalyzer_1.ts.isFunctionTypeNode(member.type)) {
            let newCode = this.replaceMethodFirstOccurrence(member.getText(), member.name?.getText());
            let fixCode = this.replaceMethodLastOccurrence(newCode, member.type?.type?.getText());
            this.reportIssue(member, sourceFile, arkFile, fixCode);
        }
    }
    reportIssue(member, sourceFile, arkFile, fixText, methodBody) {
        let fix = {
            range: [member.getStart(), member.getEnd()],
            text: fixText ? fixText + (methodBody ? methodBody : '') : ''
        };
        if (member.getText().includes('=>')) {
            fix = undefined;
        }
        ;
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, member.getStart());
        const defect = this.addIssueReport(arkFile, startPosition.line + 1, startPosition.character + 1, 0, this.metaData.description, fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    replaceFirstOccurrence(originalCode, methodName) {
        const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedMethodName);
        return originalCode.replace(regex, `${methodName}: `);
    }
    replaceMethodFirstOccurrence(originalCode, methodName) {
        const escapedMethodName = methodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedMethodName}\\s*:`);
        return originalCode.replace(regex, `${methodName}`);
    }
    replaceLastOccurrence(originalCode, returnType) {
        if (!returnType) {
            let newCode = originalCode.replace(',', '').replace(';', '');
            newCode += ' => any;';
            return newCode;
        }
        const regex = new RegExp(`:\\s*${returnType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        const matches = originalCode.match(regex);
        if (matches?.length) {
            const lastIndex = originalCode.lastIndexOf(matches[matches.length - 1]);
            return originalCode.slice(0, lastIndex) + originalCode.slice(lastIndex).replace(regex, ` => ${returnType}`);
        }
        return originalCode;
    }
    replaceMethodLastOccurrence(originalCode, returnType) {
        const regex = new RegExp(`=>\\s*${returnType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        const matches = originalCode.match(regex);
        if (matches) {
            const lastIndex = originalCode.lastIndexOf(matches[matches.length - 1]);
            return originalCode.slice(0, lastIndex) + originalCode.slice(lastIndex).replace(regex, `: ${returnType}`);
        }
        return originalCode;
    }
    findDuplicateNamesWithIndices(list) {
        const nameIndicesMap = new Map();
        list.forEach((name, index) => {
            if (name !== '') {
                if (nameIndicesMap.has(name)) {
                    nameIndicesMap.get(name).push(index);
                }
                else {
                    nameIndicesMap.set(name, [index]);
                }
            }
        });
        const duplicates = new Map();
        for (const name of nameIndicesMap.keys()) {
            if (nameIndicesMap.get(name).length > 1) {
                duplicates.set(name, nameIndicesMap.get(name));
            }
        }
        return duplicates;
    }
    checkTypeAliasMembers(child, sourceFile, arkFile) {
        if (!arkanalyzer_1.ts.isTypeAliasDeclaration(child) && !arkanalyzer_1.ts.isPropertySignature(child)) {
            return;
        }
        if (!arkanalyzer_1.ts.isTypeLiteralNode(child.type)) {
            return;
        }
        const members = child.type.members;
        const nameList = this.buildNameListForTypeAlias(members);
        const duplicateIndices = this.findDuplicateNamesWithIndices(nameList);
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            if (arkanalyzer_1.ts.isMethodSignature(member)) {
                this.handleTypeAliasMethodSignature(members, member, duplicateIndices, i, sourceFile, arkFile);
            }
            else if (arkanalyzer_1.ts.isPropertySignature(member)) {
                this.handleTypeAliasPropertySignature(member, sourceFile, arkFile);
            }
        }
    }
    buildNameListForTypeAlias(members) {
        let nameList = [];
        members.forEach((member) => {
            if (this.optionsStyle === 'property') {
                if (arkanalyzer_1.ts.isMethodSignature(member)) {
                    nameList.push(member.name.getText());
                }
                else {
                    nameList.push('');
                }
            }
        });
        return nameList;
    }
    handleTypeAliasMethodSignature(members, member, duplicateIndices, index, sourceFile, arkFile) {
        if (this.optionsStyle === 'property' && !(member.type && arkanalyzer_1.ts.isFunctionTypeNode(member.type))) {
            const duplicateList = duplicateIndices.get(member.name.getText());
            if (duplicateList) {
                if (duplicateList[duplicateList.length - 1] === index) {
                    this.processLastDuplicateTypeAliasMethod(members, member, duplicateList, sourceFile, arkFile);
                }
                else {
                    this.processDuplicateTypeAliasMethod(member, sourceFile, arkFile);
                }
            }
            else {
                this.processUniqueTypeAliasMethod(member, sourceFile, arkFile);
            }
        }
    }
    processLastDuplicateTypeAliasMethod(members, member, duplicateList, sourceFile, arkFile) {
        let code = member.name.getText() + ': ';
        const duplicatesMethodBody = this.collectTypeAliasDuplicatesMethodBody(members, duplicateList, member);
        duplicatesMethodBody.forEach((methodBody) => {
            code += '(' + methodBody + ') & ';
        });
        const fixCode = this.replaceLastOccurrence(member.getText(), member.type?.getText());
        const methodBody = this.extractTypeAliasMethodBody(fixCode, member.name.getText());
        code += '(' + methodBody + ');';
        this.reportTypeAliasIssue(member, sourceFile, arkFile, code);
    }
    collectTypeAliasDuplicatesMethodBody(members, duplicateList, member) {
        let duplicatesMethodBody = [];
        duplicateList.forEach((index) => {
            if (index !== duplicateList[duplicateList.length - 1]) {
                const currentMember = members[index];
                const fixCode = this.replaceLastOccurrence(currentMember.getText(), currentMember.type?.getText() ?? '');
                const methodBody = this.extractTypeAliasMethodBody(fixCode, currentMember.name.getText());
                duplicatesMethodBody.push(methodBody);
            }
        });
        return duplicatesMethodBody;
    }
    extractTypeAliasMethodBody(fixCode, methodName) {
        return fixCode.replace(methodName, '').replace(',', '').replace(';', '');
    }
    processDuplicateTypeAliasMethod(member, sourceFile, arkFile) {
        const fixCode = this.replaceLastOccurrence(member.getText(), member.type?.getText());
        const methodBody = this.extractTypeAliasMethodBody(fixCode, member.name.getText());
        this.reportTypeAliasIssue(member, sourceFile, arkFile, '', methodBody);
    }
    processUniqueTypeAliasMethod(member, sourceFile, arkFile) {
        let newCode = this.replaceFirstOccurrence(member.getText(), member.name?.getText());
        let fixCode = '';
        if (member.type) {
            fixCode = this.replaceLastOccurrence(newCode, member.type?.getText());
        }
        else {
            fixCode = newCode + ' => any;';
        }
        this.reportTypeAliasIssue(member, sourceFile, arkFile, fixCode);
    }
    handleTypeAliasPropertySignature(member, sourceFile, arkFile) {
        if (this.optionsStyle === 'method' && member.type && arkanalyzer_1.ts.isFunctionTypeNode(member.type)) {
            let newCode = this.replaceMethodFirstOccurrence(member.getText(), member.name?.getText());
            let fixCode = this.replaceMethodLastOccurrence(newCode, member.type?.type?.getText());
            this.reportTypeAliasIssue(member, sourceFile, arkFile, fixCode);
        }
    }
    reportTypeAliasIssue(member, sourceFile, arkFile, fixText, methodBody) {
        let fix = {
            range: [member.getStart(), member.getEnd()],
            text: fixText + (methodBody ? methodBody : '')
        };
        if (member.getText().includes('=>')) {
            fix = undefined;
        }
        ;
        const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, member.getStart());
        const defect = this.addIssueReport(arkFile, startPosition.line + 1, startPosition.character + 1, 0, this.metaData.description, fix);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    getFileExtension(filePath, filetype) {
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
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
exports.MethodSignatureStyleCheck = MethodSignatureStyleCheck;
