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
exports.ForeachArgsCheck = void 0;
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ForeachArgsCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/foreach-args-check.md',
    description: 'For performance purposes, set keyGenerator for ForEach.'
};
class ForeachArgsCheck {
    metaData = gMetaData;
    FOREACH_STR = 'ForEach';
    CREAER_STR = 'create';
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT]
    };
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
        name: ['build']
    };
    builderMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        decorators: ['Builder']
    };
    anonymousMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        isAnonymous: true
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        const matchBuilderCb = {
            matcher: this.builderMatcher,
            callback: this.check
        };
        const matchAnonymousCb = {
            matcher: this.anonymousMatcher,
            callback: this.check
        };
        return [matchBuildCb, matchBuilderCb, matchAnonymousCb];
    }
    check = (targetMtd) => {
        const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
        for (const stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const methodSign = invokeExpr.getMethodSignature();
            const className = methodSign.getDeclaringClassSignature().getClassName();
            const methodName = methodSign.getMethodSubSignature().getMethodName();
            const argsNum = invokeExpr.getArgs().length;
            if (className === this.FOREACH_STR && methodName === this.CREAER_STR && argsNum < 3) {
                this.addIssueReport(stmt);
            }
        }
    };
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(this.FOREACH_STR);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + this.FOREACH_STR.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    codeFix(arkFile, fixKey) {
        let isFixed = false;
        if (this.issues.length === 0) {
            return isFixed;
        }
        // TODO: 根据fixKey定位到需要修复的代码位置，并修改arkFile
        isFixed = true;
        return isFixed;
    }
}
exports.ForeachArgsCheck = ForeachArgsCheck;
