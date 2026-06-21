"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoForInArrayCheck = void 0;
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
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-for-in-array.md',
    description: 'For-in loops over arrays skips holes, returns indices as strings, and may visit the prototype chain or other enumerable properties. Use a more robust iteration method such as for-of or array.forEach instead.'
};
let filePath = '';
class NoForInArrayCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check.bind(this)
        };
        return [matchBuildCb];
    }
    ;
    check = (arkFile) => {
        filePath = arkFile.getFilePath();
        const isTsFile = this.isTsFile(filePath);
        if (!isTsFile) {
            return;
        }
        ;
        const astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        for (let child of astRoot.statements) {
            this.isForInCheck(child);
        }
        ;
    };
    isForInCheck = (node) => {
        if (arkanalyzer_1.ts.isForInStatement(node)) {
            this.handleForInStatement(node);
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, this.isForInCheck);
    };
    handleForInStatement(node) {
        const iterationObject = node.expression;
        if (arkanalyzer_1.ts.isObjectLiteralExpression(iterationObject)) {
            return;
        }
        ;
        const severity = this.rule.alert ?? this.metaData.severity;
        this.addIssueReport(node, this.metaData.description, severity);
    }
    ;
    addIssueReport(node, description, severity) {
        const warnInfo = this.getLineAndColumn(node);
        const defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(node) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        return {
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            filePath: filePath
        };
    }
    ;
    isTsFile(filePath) {
        return filePath.toLowerCase().endsWith('.ts');
    }
    ;
}
exports.NoForInArrayCheck = NoForInArrayCheck;
;
