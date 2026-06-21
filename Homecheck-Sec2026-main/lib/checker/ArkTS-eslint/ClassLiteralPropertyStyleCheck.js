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
exports.ClassLiteralPropertyStyleCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ClassLiteralPropertyStyleCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/class-literal-property-style.md",
    description: "Literals should be exposed using readonly fields..",
};
class ClassLiteralPropertyStyleCheck {
    metaData = gMetaData;
    defaultOptions = ['fields'];
    rule;
    defects = [];
    filePath = "";
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    issues = [];
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (target) => {
        this.filePath = target.getFilePath();
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.checkClassLiterals(sourceFile, this.defaultOptions[0]);
    };
    checkClassLiterals(sourceFile, style) {
        lib_1.ts.forEachChild(sourceFile, (node) => {
            if (lib_1.ts.isClassDeclaration(node)) {
                const classBody = node.members;
                classBody.forEach((element) => {
                    if (style === "fields" && lib_1.ts.isGetAccessorDeclaration(element) && element.name) {
                        const method = element;
                        this.checkGetterMethodForFieldStyle(method);
                    }
                    else if (style === "getters" && lib_1.ts.isPropertyDeclaration(element)) {
                        const property = element;
                        this.checkReadonlyPropertyForGetterStyle(property);
                    }
                });
            }
        });
    }
    checkGetterMethodForFieldStyle(method) {
        if (!lib_1.ts.isGetAccessorDeclaration(method)) {
            return;
        }
        const parent = method.parent;
        const hasSetMethod = parent.members.some(member => lib_1.ts.isSetAccessorDeclaration(member) && member.name.getText().replace(/\/\*.*?\*\//g, '').replace(/^\[['"`]|['"`]\]$/g, '').trim() === method.name.getText().replace(/\/\*.*?\*\//g, '').replace(/^\[['"`]|['"`]\]$/g, '').trim());
        if (hasSetMethod) {
            return;
        }
        const body = method.body;
        if (!body || body.statements.length === 0) {
            return;
        }
        const [firstStatement] = body.statements;
        if (firstStatement.kind !== lib_1.ts.SyntaxKind.ReturnStatement) {
            return;
        }
        const returnStmt = firstStatement;
        const { expression } = returnStmt;
        if (!expression || !this.isSupportedLiteral(expression)) {
            return;
        }
        const methodNameStart = method.name.getStart();
        const methodNameEnd = method.name.getEnd();
        const { line, character } = this.getPosition(methodNameStart, method.getSourceFile());
        const { character: endChar } = this.getPosition(methodNameEnd, method.getSourceFile());
        this.addIssueReport(line + 1, character + 1, endChar + 1, "Literals should be exposed using readonly fields.", this.filePath);
    }
    checkReadonlyPropertyForGetterStyle(property) {
        const modifiers = property.modifiers;
        if (!modifiers || !modifiers.some(mod => mod.kind === lib_1.ts.SyntaxKind.ReadonlyKeyword)) {
            return;
        }
        const initializer = property.initializer;
        if (!initializer || !this.isSupportedLiteral(initializer)) {
            return;
        }
        const propertyNameStart = property.name.getStart();
        const propertyNameEnd = property.name.getEnd();
        const { line, character } = this.getPosition(propertyNameStart, property.getSourceFile());
        const { character: endChar } = this.getPosition(propertyNameEnd, property.getSourceFile());
        this.addIssueReport(line + 1, character + 1, endChar + 1, "Literals should be exposed using getters.", this.filePath);
    }
    getPosition(pos, sourceFile) {
        return sourceFile.getLineAndCharacterOfPosition(pos);
    }
    isSupportedLiteral(node) {
        return (lib_1.ts.isStringLiteral(node) ||
            lib_1.ts.isNumericLiteral(node) ||
            lib_1.ts.isNoSubstitutionTemplateLiteral(node) ||
            (lib_1.ts.isTemplateExpression(node) && node.templateSpans.length === 0) ||
            node.kind === lib_1.ts.SyntaxKind.TrueKeyword ||
            node.kind === lib_1.ts.SyntaxKind.FalseKeyword ||
            node.kind === lib_1.ts.SyntaxKind.BigIntLiteral ||
            node.kind === lib_1.ts.SyntaxKind.NullKeyword ||
            node.kind === lib_1.ts.SyntaxKind.UndefinedKeyword ||
            lib_1.ts.isObjectLiteralExpression(node) ||
            lib_1.ts.isArrayLiteralExpression(node));
    }
    async addIssueReport(line, startCol, endCol, message, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const description = message;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.ClassLiteralPropertyStyleCheck = ClassLiteralPropertyStyleCheck;
