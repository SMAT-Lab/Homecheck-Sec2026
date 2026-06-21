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
exports.ArrayDefinitionCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ArrayDefinitionCheck');
const ARRAY_NAME = 'Array';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/array-definition-check.md',
    description: 'Array type definition is not correct.'
};
class ArrayDefinitionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkMethod) => {
        for (let stmt of arkMethod.getBody()?.getCfg()?.getStmts() ?? []) {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = stmt.getRightOp();
            if (!rightOp || !(rightOp instanceof arkanalyzer_1.ArkNewArrayExpr)) {
                continue;
            }
            let text = stmt.getOriginalText() ?? '';
            if (this.isGenericArray(text)) {
                this.reportIssue(stmt, text);
            }
        }
    };
    isGenericArray(text) {
        let matchArr = text.match(/:([\s\S]*?)=/);
        if (matchArr !== null) {
            let matchTags = matchArr[1].match(/Array|<|>/g);
            return matchTags !== null && matchTags.includes('Array') && matchTags.includes('<') && matchTags.includes('>');
        }
        return false;
    }
    reportIssue(stmt, text) {
        const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
        let lineNum = stmt.getOriginPositionInfo().getLineNo();
        let startColum = stmt.getOriginPositionInfo().getColNo() + text.indexOf(ARRAY_NAME);
        let endColumn = stmt.getOriginPositionInfo().getColNo() + text.indexOf('=') - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ArrayDefinitionCheck = ArrayDefinitionCheck;
