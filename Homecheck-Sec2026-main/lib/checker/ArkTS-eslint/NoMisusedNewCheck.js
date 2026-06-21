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
exports.NoMisusedNewCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoMisusedNewCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-misused-new.md',
    description: 'Enforce valid definition of new and constructor.'
};
class NoMisusedNewCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    errorMessageInterface = 'Interfaces cannot be constructed, only classes.';
    errorMessageClass = 'Class cannot have method named `new`.';
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
            if (arkanalyzer_1.ts.isMethodDeclaration(child) || arkanalyzer_1.ts.isConstructSignatureDeclaration(child)) { // new 函数
                let name = undefined;
                if (child.name) {
                    name = child.name.getText();
                }
                else {
                    name = child.getChildren()[0].getText();
                }
                if (name === 'new') {
                    this.checkNew(targetFile, sourceFile, child);
                }
            }
            else if (arkanalyzer_1.ts.isMethodSignature(child)) { // constructor 函数
                if (child.name?.getText() === 'constructor') {
                    this.checkConstructor(targetFile, sourceFile, child);
                }
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    // 检查 new 函数
    checkNew(targetFile, sourceFile, aNode) {
        let nameNode = undefined;
        let lastNode = undefined;
        let nameFlag = false;
        for (const child of aNode.getChildren()) {
            if (nameFlag) {
                nameNode = child;
                break;
            }
            if (lastNode !== undefined && lastNode.kind === arkanalyzer_1.ts.SyntaxKind.CloseParenToken && child.kind === arkanalyzer_1.ts.SyntaxKind.ColonToken) {
                nameFlag = true;
            }
            lastNode = child;
        }
        if (!nameNode) {
            return;
        }
        const parentClassNode = this.findParentClassOrInterfaceNode(aNode);
        if (!parentClassNode) {
            return;
        }
        if (arkanalyzer_1.ts.isInterfaceDeclaration(parentClassNode)) { // interface C { new(): C; }
            const interfaceName = parentClassNode.name.getText();
            let name = nameNode.getText();
            if (nameNode.getChildren().length > 0) {
                name = nameNode.getChildren()[0].getText();
            }
            if (interfaceName === name) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
                this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.errorMessageInterface, undefined);
            }
        }
        else if (arkanalyzer_1.ts.isClassDeclaration(parentClassNode)) { // class C { new(): C; }
            const className = parentClassNode.name?.getText();
            if (className && className === nameNode.getText()) {
                const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
                this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.errorMessageClass, undefined);
            }
        }
    }
    findParentClassOrInterfaceNode(aNode) {
        let parent = aNode.parent;
        while (parent !== undefined) {
            if (arkanalyzer_1.ts.isClassDeclaration(parent) || arkanalyzer_1.ts.isInterfaceDeclaration(parent) || arkanalyzer_1.ts.isTypeAliasDeclaration(parent)) {
                return parent;
            }
            parent = parent.parent;
        }
        return undefined;
    }
    // 检查 constructor 函数
    checkConstructor(targetFile, sourceFile, aNode) {
        const parentClassNode = this.findParentClassOrInterfaceNode(aNode);
        if (!parentClassNode) {
            return;
        }
        if (arkanalyzer_1.ts.isInterfaceDeclaration(parentClassNode) || arkanalyzer_1.ts.isTypeAliasDeclaration(parentClassNode)) {
            const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
            this.addIssueReport(targetFile, startPosition.line + 1, startPosition.character + 1, 0, this.errorMessageInterface, undefined);
        }
    }
    addIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
}
exports.NoMisusedNewCheck = NoMisusedNewCheck;
