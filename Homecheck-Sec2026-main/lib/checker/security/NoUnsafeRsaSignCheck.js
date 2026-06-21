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
exports.NoUnsafeRsaSignCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const VarInfo_1 = require("../../model/VarInfo");
const StringUtils_1 = require("../../utils/checker/StringUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeRsaSignCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-unsafe-rsa-sign-check.md',
    description: 'Insecure RSA signature algorithms are prohibited. For example, the RSA modules length is less than 2048 bits, and insecure MD5 or SHA1 hash algorithms are used in digests or mask digests.'
};
const createSignSignature = `@ohosSdk/api/@ohos.security.cryptoFramework.d.ts: cryptoFramework.${lib_1.DEFAULT_ARK_CLASS_NAME}.createSign(string)`;
const createVerifySignature = `@ohosSdk/api/@ohos.security.cryptoFramework.d.ts: cryptoFramework.${lib_1.DEFAULT_ARK_CLASS_NAME}.createVerify(string)`;
class NoUnsafeRsaSignCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (arkClass) => {
        for (let method of arkClass.getMethods()) {
            let stmts = method.getBody()?.getCfg().getStmts();
            if (!stmts) {
                return;
            }
            this.processStmt(stmts, arkClass);
        }
    };
    processStmt(stmts, arkClass) {
        for (let stmt of stmts) {
            let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            let signatureStr = invokeExpr.getMethodSignature().toString();
            if (!(signatureStr === createSignSignature || signatureStr === createVerifySignature)) {
                continue;
            }
            let methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            let arg = invokeExpr.getArg(0);
            let right = Index_1.CheckerUtils.getArgRight(arg, arkClass);
            if (right !== null) {
                arg = right;
            }
            let varInfo = new VarInfo_1.VarInfo(stmt, stmt.scope);
            let parseStr = StringUtils_1.StringUtils.getStringByScope(arkClass.getDeclaringArkFile(), varInfo, arg);
            let rsa = parseStr.match(/\d+(\d+)?/g);
            if (!rsa) {
                return;
            }
            let rsaNum = parseInt(rsa[0]);
            if (parseStr.includes('RSA') && (rsaNum < 2048 || parseStr.includes('MD5') || parseStr.includes('SHA1'))) {
                this.reportIssue(arkClass.getDeclaringArkFile(), stmt, methodName);
            }
        }
    }
    reportIssue(arkFile, stmt, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const startColumn = originPositionInfo.getColNo() + text.lastIndexOf(methodName);
        const endColunm = startColumn + methodName.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NoUnsafeRsaSignCheck = NoUnsafeRsaSignCheck;
