"use strict";
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
exports.NoDupeClassMembersCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoDupeClassMembersCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-dupe-class-members.md",
    description: "Disallow duplicate class members.",
};
class NoDupeClassMembersCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
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
    check = (target) => {
        if (target instanceof arkanalyzer_1.ArkFile) {
            const code = target.getCode().replace(/!\s*class\s+/g, 'class ');
            if (!code) {
                return;
            }
            const filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 检查类中的重名成员
            const issues = this.checkDuplicateClassMembers(sourceFile);
            // 输出结果
            issues.forEach(info => {
                this.addIssueReportNode(info, filePath);
            });
        }
    };
    // 检查类中是否有重名的成员
    checkDuplicateClassMembers(sourceFile) {
        const result = [];
        const visit = (node) => {
            this.checkClassDeclaration(sourceFile, node, result);
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    checkClassDeclaration(sourceFile, node, result) {
        if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            const memberMap = new Map();
            node.members.forEach(member => {
                let memberName;
                let memberKind = '';
                let signature = '';
                let isStatic = false;
                if (arkanalyzer_1.ts.isMethodDeclaration(member)) {
                    memberName = this.normalizeMemberName(member.name.getText(sourceFile), member);
                    memberKind = 'method';
                    signature = this.getMethodSignature(member);
                    isStatic = !!member.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                }
                else if (arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                    memberName = this.normalizeMemberName(member.name.getText(sourceFile), member);
                    memberKind = 'Property';
                    isStatic = !!member.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                }
                else if (arkanalyzer_1.ts.isGetAccessorDeclaration(member)) {
                    memberName = this.normalizeMemberName(member.name.getText(sourceFile), member);
                    memberKind = 'setter';
                    isStatic = !!member.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                }
                else if (arkanalyzer_1.ts.isSetAccessorDeclaration(member)) {
                    memberName = this.normalizeMemberName(member.name.getText(sourceFile), member);
                    memberKind = 'setter';
                    signature = this.getAccessorSignature(member);
                    isStatic = !!member.modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
                }
                if (memberName) {
                    // 检查是否已经存在同名成员
                    const existingMembers = memberMap.get(memberName) || [];
                    const isDuplicateName = existingMembers.some(m => m.name === memberName);
                    const isDuplicateSignature = existingMembers.some(m => m.signature === signature);
                    const isDuplicateType = existingMembers.some(m => m.kind === memberKind);
                    const isDuplicateStatic = existingMembers.some(m => m.isStatic === isStatic);
                    this.checkMemberName(sourceFile, isDuplicateName, isDuplicateSignature, isDuplicateType, isDuplicateStatic, memberName, member, result);
                    // 将当前成员加入到映射中
                    existingMembers.push({ name: memberName, kind: memberKind, signature, isStatic, location: member });
                    memberMap.set(memberName, existingMembers);
                }
            });
        }
    }
    checkMemberName(sourceFile, isDuplicateName, isDuplicateSignature, isDuplicateType, isDuplicateStatic, memberName, member, result) {
        if (!isDuplicateName) {
            return;
        }
        if (isDuplicateType) {
            if (isDuplicateSignature) {
                if (!isDuplicateStatic) {
                    return;
                }
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(member.getStart());
                result.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: `Duplicate name '${memberName}'.`
                });
            }
            // 如果有重名成员，记录问题
        }
        else {
            if (!isDuplicateStatic) {
                return;
            }
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(member.getStart());
            result.push({
                fileName: sourceFile.fileName,
                line: line + 1,
                character: character + 1,
                description: `Duplicate name '${memberName}'.`
            });
        }
    }
    // 标准化成员名称
    normalizeMemberName(memberName, member) {
        if (member.name) {
            if (arkanalyzer_1.ts.isNumericLiteral(member.name)) {
                // 将数值名称解析为数值后再转换为字符串
                const numericValue = parseFloat(member.name.getText());
                return numericValue.toString();
            }
            else if (arkanalyzer_1.ts.isIdentifier(member.name)) {
                return member.name.text;
            }
        }
        return memberName.replace(/'/g, '');
    }
    // 获取方法签名
    getMethodSignature(method) {
        const parameters = method.parameters.map(param => param.getText()).join(', ');
        const returnType = method.type ? method.type.getText() : 'void';
        return `(${parameters}): ${returnType}`;
    }
    // 获取访问器签名
    getAccessorSignature(accessor) {
        const parameters = accessor.parameters.map(param => param.getText()).join(', ');
        const returnType = accessor.type ? accessor.type.getText() : 'void';
        return `(${parameters}): ${returnType}`;
    }
    addIssueReportNode(info, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (info.description) {
            this.metaData.description = info.description;
        }
        let defect = new Defects_1.Defects(info.line, info.character, info.character, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoDupeClassMembersCheck = NoDupeClassMembersCheck;
