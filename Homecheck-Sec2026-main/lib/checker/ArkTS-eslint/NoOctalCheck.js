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
exports.NoOctalCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoOctalCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-octal.md",
    description: "Disallow octal literals."
};
class NoOctalCheck {
    metaData = gMetaData;
    FOREACH_STR = "ForEach";
    CREAER_STR = "create";
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        file: [this.fileMatcher],
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (targetMtd) => {
        const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
        for (const stmt of stmts) {
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let rightOp = stmt.getRightOp();
                if (rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr || rightOp instanceof Constant_1.NumberConstant) {
                    if (rightOp.getType().getTypeString() === "number") {
                        let message = "Octal literals should not be used.";
                        this.addIssueReport(stmt, message);
                    }
                }
            }
        }
    };
    addIssueReport(stmt, message) {
        let currentDescription = message ? message : this.metaData.description;
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        if (warnInfo.line === -1) {
            return;
        }
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, currentDescription, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            let results = this.checkCode(originText);
            for (const result of results) {
                if (result) {
                    const pos = originText.indexOf(result);
                    if (pos !== -1) {
                        startCol += pos;
                        const endCol = startCol + originText.length - 1;
                        const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
                        return { line, startCol, endCol, filePath: filePath };
                    }
                }
            }
            ;
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    ;
    checkCode(code) {
        const octalPattern = /\b0[0-7]+\b/g;
        const octalMatches = code.match(octalPattern);
        return octalMatches ? octalMatches : [];
    }
    ;
}
exports.NoOctalCheck = NoOctalCheck;
