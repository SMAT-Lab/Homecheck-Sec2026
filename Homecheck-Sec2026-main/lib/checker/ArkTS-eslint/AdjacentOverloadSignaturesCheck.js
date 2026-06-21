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
exports.AdjacentOverloadSignaturesCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AdjacentOverloadSignaturesCheck');
class AdjacentOverloadSignaturesCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/adjacent-overload-signatures.md',
        description: 'All ${methodName} signatures should be adjacent.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (target) => {
        const filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.checkBodyForOverloadMethods(sourceFile).forEach((item) => {
            this.addIssueReport(item.line, item.character, item.endCol, filePath, item.name);
        });
    };
    checkBodyForOverloadMethods(sourceFile) {
        const lineAndersonColumn = [];
        this.visit(sourceFile, lineAndersonColumn, sourceFile);
        return lineAndersonColumn;
    }
    visit(node, lineAndersonColumn, sourceFile) {
        let members = this.getNodeMembers(node);
        if (members) {
            let lastMethod = null;
            const seenMethods = [];
            members.forEach((member) => {
                const method = this.getMemberMethod(member, sourceFile);
                if (method == null) {
                    lastMethod = null;
                    return;
                }
                const index = seenMethods.findIndex(seenMethod => this.isSameMethod(method, seenMethod));
                if (index > -1 && !this.isSameMethod(method, lastMethod)) {
                    lineAndersonColumn.push({ line: method.line, character: method.character, endCol: method.endCol, name: method.name });
                }
                else if (index === -1) {
                    seenMethods.push(method);
                }
                lastMethod = method;
            });
        }
        lib_1.ts.forEachChild(node, (n) => this.visit(n, lineAndersonColumn, sourceFile));
    }
    getMemberMethod(member, sourceFile) {
        const position = member.getStart();
        const endPosition = member.getEnd();
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, position);
        const { line: endLine, character: endChar } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, endPosition);
        if (lib_1.ts.isCallSignatureDeclaration(member)) {
            return { name: ' call ', static: false, line: line + 1, character: character + 1, endCol: endChar + 1 };
        }
        if (lib_1.ts.isConstructorDeclaration(member)) {
            return { name: ' construct ', static: false, line: line + 1, character: character + 1, endCol: endChar + 1 };
        }
        let name = null;
        let isStatic = false;
        if (lib_1.ts.isMethodSignature(member) || lib_1.ts.isMethodDeclaration(member)) {
            if (member.modifiers?.some(m => m.kind === lib_1.ts.SyntaxKind.AbstractKeyword)) {
                return null;
            }
            if (member.name && lib_1.ts.isComputedPropertyName(member.name)) {
                const expr = member.name.expression;
                if (lib_1.ts.isStringLiteral(expr)) {
                    name = expr.text;
                }
                else if (lib_1.ts.isIdentifier(expr)) {
                    name = expr.text;
                }
            }
            else if (member.name && lib_1.ts.isIdentifier(member.name)) {
                name = member.name.text;
            }
            else if (lib_1.ts.isPrivateIdentifier(member.name)) {
                name = `#${member.name.text}`;
            }
            isStatic = member.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.StaticKeyword) ?? false;
        }
        else if (lib_1.ts.isFunctionDeclaration(member)) {
            name = member.name?.text ?? null;
        }
        if (!name) {
            return null;
        }
        return { name, static: isStatic, line: line + 1, character: character + 1, endCol: endChar + 1 };
    }
    isSameMethod(method1, method2) {
        if (method1 === null || method2 === null) {
            return false;
        }
        if (method1.name === ' call ' && method2.name === ' call ') {
            return true;
        }
        if (method1.name === ' construct ' && method2.name === ' construct ') {
            return true;
        }
        return method1.name === method2.name && method1.static === method2.static;
    }
    getNodeMembers(node) {
        let members;
        if (lib_1.ts.isModuleDeclaration(node)) {
            members = (node.body && lib_1.ts.isModuleBlock(node.body)) ? node.body.statements : undefined;
        }
        else if (lib_1.ts.isInterfaceDeclaration(node)) {
            members = node.members;
        }
        else if (lib_1.ts.isClassDeclaration(node)) {
            members = node.members;
        }
        else if (lib_1.ts.isTypeLiteralNode(node)) {
            members = node.members;
        }
        else if (lib_1.ts.isSourceFile(node)) {
            members = node.statements;
        }
        else if (lib_1.ts.isBlock(node)) {
            members = node.statements;
        }
        return members;
    }
    async addIssueReport(line, startCol, endCol, filePath, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const description = `All ${methodName} signatures should be adjacent.`;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.AdjacentOverloadSignaturesCheck = AdjacentOverloadSignaturesCheck;
