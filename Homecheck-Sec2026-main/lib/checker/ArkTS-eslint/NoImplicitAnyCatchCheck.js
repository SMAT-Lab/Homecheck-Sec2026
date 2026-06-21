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
exports.NoImplicitAnyCatchCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const defaultOptions = {
    allowExplicitAny: false
};
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoImplicitAnyCatchCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: "docs/no-implicit-any-catch.md",
    description: "Implicit any in catch clause."
};
class NoImplicitAnyCatchCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    issueMap = new Map();
    check = (file) => {
        if (this.getFileExtension(file.getName()) !== '.ets') {
            let options;
            if (this.rule && this.rule.option.length > 0) {
                options = this.rule.option[0];
            }
            else {
                options = defaultOptions;
            }
            this.checkCatchParameter(file, options);
            this.reportSortedIssues();
        }
    };
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    checkCatchParameter(file, options) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(file);
        const catchLocations = [];
        const traverse = (node) => {
            if (lib_1.ts.isCatchClause(node)) {
                this.handleCatchClause(node, file, options, catchLocations, sourceFile);
            }
            // 递归遍历所有子节点
            lib_1.ts.forEachChild(node, childNode => traverse(childNode));
        };
        // 从源文件开始遍历
        traverse(sourceFile);
        // 返回找到的 catch 子句的行列号数组
        return catchLocations;
    }
    determineFixText(variableDeclaration, text, options) {
        this.metaData.description = 'Implicit any in catch clause.';
        if (!variableDeclaration) {
            return undefined;
        }
        if (options.allowExplicitAny) {
            return variableDeclaration.type ? undefined : `${text}: unknown`;
        }
        const type = variableDeclaration.type?.getText();
        if (type?.toLowerCase() === 'any') {
            this.metaData.description = 'Explicit any in catch clause.';
            return `${text?.slice(0, text.indexOf(':'))}: unknown`;
        }
        return type ? undefined : `${text}: unknown`;
    }
    handleCatchClause(node, file, options, catchLocations, sourceFile) {
        const variableDeclaration = node.variableDeclaration;
        const text = variableDeclaration?.getText();
        const pos = variableDeclaration?.getStart();
        const end = variableDeclaration?.getEnd();
        let fixText = this.determineFixText(variableDeclaration, text, options);
        if (fixText) {
            const start = node.getStart();
            const position = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, start);
            const line = position.line + 1;
            const character = position.character + 1;
            catchLocations.push({ line, character });
            const defect = this.addIssueReport(file, this.metaData, { line, character });
            if (pos && end && defect) {
                let fix = this.ruleFix(pos, end, fixText);
                this.issueMap.set(defect.fixKey, { defect, fix });
            }
        }
    }
    ruleFix(pos, end, fixText) {
        return { range: [pos, end], text: fixText };
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
    addIssueReport(arkFile, metaData, lineAndColumn) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, lineAndColumn);
        if (warnInfo) {
            const filePath = arkFile.getFilePath();
            let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
            this.defects.push(defects);
            return defects;
        }
    }
    getLineAndColumn(arkfile, lineColumn) {
        if (arkfile) {
            const originPath = arkfile.getFilePath();
            return {
                line: lineColumn.line,
                startCol: lineColumn.character,
                endCol: lineColumn.character,
                filePath: originPath
            };
        }
        else {
            logger.debug('arkFile is null');
        }
        return null;
    }
}
exports.NoImplicitAnyCatchCheck = NoImplicitAnyCatchCheck;
