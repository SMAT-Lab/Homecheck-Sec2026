"use strict";
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
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
exports.NoAsyncPromiseExecutorCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoAsyncPromiseExecutorCheck');
class NoAsyncPromiseExecutorCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-async-promise-executor.md',
        description: 'Promise executor functions should not be async'
    };
    PROMISE_NAME = 'async';
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        file: [this.fileMatcher],
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (targetMtd) => {
        if (targetMtd instanceof lib_1.ArkMethod) {
            const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
            for (const stmt of stmts) {
                const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invokeExpr) {
                    continue;
                }
                if (!(stmt.getInvokeExpr() instanceof lib_1.ArkInstanceInvokeExpr)) {
                    continue;
                }
                if (stmt.toString().includes('Promise.constructor()')) {
                    const code = stmt.getOriginalText() ?? '';
                    if (this.findSpecialStatement(code)) {
                        this.addIssueReport(stmt);
                    }
                }
            }
        }
    };
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        const defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(this.PROMISE_NAME);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + this.PROMISE_NAME.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    findSpecialStatement(code) {
        if (!code)
            return false;
        const patterns = [
            /new\s+Promise\s*\(\s*async/g,
            /new\s+Promise\s*\(\s*\(*\s*async/g,
            /new\s+Promise\s*\(\s*.*?\(\s*resolve\s*,\s*reject\s*\)\s*=>\s*{[\s\S]*?setTimeout\s*\(/g,
            /new\s+Promise\s*\(\s*.*?\(\s*resolve\s*,\s*reject\s*\)\s*=>\s*{[\s\S]*?await\s+/g
        ];
        return patterns.some(regex => regex.test(code));
    }
}
exports.NoAsyncPromiseExecutorCheck = NoAsyncPromiseExecutorCheck;
