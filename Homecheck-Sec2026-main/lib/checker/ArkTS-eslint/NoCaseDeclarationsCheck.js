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
exports.NoCaseDeclarationsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoCaseDeclarationsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-case-declarations.md",
    description: "Disallow lexical declarations in case clauses.",
};
const errMessage = "Unexpected lexical declaration in case block";
class NoCaseDeclarationsCheck {
    defects = [];
    issues = [];
    metaData = gMetaData;
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    /**
     * 检查 TypeScript 代码中是否在 case/default 子句中使用词法声明，返回报错位置
     * @param sourceFile 要检查的 TypeScript 代码
     * @returns 包含词法声明错误位置的对象数组
     */
    checkLexicalDeclarationsInSwitch(sourceFile) {
        const invalidPositions = [];
        function processStatement(statement) {
            if (arkanalyzer_1.ts.isVariableStatement(statement)) {
                processVariableStatement(statement);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(statement) || arkanalyzer_1.ts.isClassDeclaration(statement)) {
                processDeclaration(statement);
            }
        }
        function processVariableStatement(statement) {
            const declarationList = statement.declarationList;
            if (declarationList.flags & arkanalyzer_1.ts.NodeFlags.Let || declarationList.flags & arkanalyzer_1.ts.NodeFlags.Const) {
                addInvalidPosition(statement);
            }
        }
        function processDeclaration(statement) {
            addInvalidPosition(statement);
        }
        function addInvalidPosition(node) {
            const { line: startLine, character: startCol } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine, character: endCol } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
            invalidPositions.push({ line: startLine + 1, startCol: startCol + 1, endCol: endCol + 1 });
        }
        function checkNode(node) {
            if (arkanalyzer_1.ts.isCaseClause(node) || arkanalyzer_1.ts.isDefaultClause(node)) {
                node.statements.forEach(processStatement);
            }
            arkanalyzer_1.ts.forEachChild(node, checkNode);
        }
        checkNode(sourceFile);
        return invalidPositions;
    }
    check = (target) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const myInvalidPositions = this.checkLexicalDeclarationsInSwitch(sourceFile);
        myInvalidPositions.forEach(pos => {
            this.addIssueReport(pos, severity, target.getFilePath());
        });
    };
    addIssueReport(pos, severity, filePath) {
        let defects = new Defects_1.Defects(pos.line, pos.startCol, pos.endCol, errMessage, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
}
exports.NoCaseDeclarationsCheck = NoCaseDeclarationsCheck;
