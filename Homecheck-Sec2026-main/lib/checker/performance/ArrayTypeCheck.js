"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
exports.ArrayTypeCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ArrayTypeCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/array-type-check.md',
    description: 'Require consistently using either `T[]` or `Array<T>` for arrays.'
};
class ArrayTypeCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkFile) => {
        let astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        for (let child of astRoot.statements) {
            if (arkanalyzer_1.ts.isVariableStatement(child)) {
                this.processStmtAst(child, arkFile);
            }
        }
    };
    processStmtAst(child, arkFile) {
        let declarationList = child.declarationList.declarations;
        for (let declaration of declarationList) {
            if (!arkanalyzer_1.ts.isVariableDeclaration(declaration)) {
                continue;
            }
            let type = declaration.type;
            if (!type || !arkanalyzer_1.ts.isTypeReferenceNode(type)) {
                continue;
            }
            const typeName = type.typeName;
            let typeText = typeName.getText();
            if (typeText !== 'ReadonlyArray' && typeText !== 'Array') {
                continue;
            }
            let args = type.typeArguments;
            if (!args || args.length === 0) {
                continue;
            }
            let readonlyPrefix = (typeText === 'ReadonlyArray') ? 'readonly ' : '';
            let typePrefix = 'any';
            let arg0 = args[0];
            if (arg0.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword) {
                typePrefix = 'string';
            }
            else if (arg0.kind === arkanalyzer_1.ts.SyntaxKind.NumberKeyword) {
                typePrefix = 'number';
            }
            else if (arg0.kind === arkanalyzer_1.ts.SyntaxKind.SymbolKeyword) {
                typePrefix = 'symbol';
            }
            else if (arg0.kind === arkanalyzer_1.ts.SyntaxKind.ObjectKeyword) {
                typePrefix = 'object';
            }
            else if (arkanalyzer_1.ts.isTypeReferenceNode(arg0)) {
                typePrefix = arg0.typeName?.getText() ?? 'any';
            }
            let sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode(arkFile.getName(), arkFile.getCode());
            const originTsPosition = arkanalyzer_1.LineColPosition.buildFromNode(type, sourceFile);
            let defect = this.createDefect(arkFile, originTsPosition, type.getText());
            let fixKeyword = `${readonlyPrefix}${typePrefix}[]`;
            let ruleFix = this.createFix(type, fixKeyword);
            this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        }
    }
    createDefect(arkFile, originTsPosition, keyword) {
        const filePath = arkFile.getFilePath();
        let lineNum = originTsPosition.getLineNo();
        let startColum = originTsPosition.getColNo();
        let endColumn = originTsPosition.getColNo() + keyword.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        return new Defects_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
    }
    createFix(child, code) {
        return { range: [child.getStart(), child.getEnd()], text: code };
    }
}
exports.ArrayTypeCheck = ArrayTypeCheck;
