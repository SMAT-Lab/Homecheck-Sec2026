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
exports.TimezoneInterfaceCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'TimezoneInterfaceCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/timezone-interface-check.md',
    description: 'Use I18n APIs correctly to obtain or set the time zone.'
};
const setTimeZoneSignature = '@ohosSdk/api/@ohos.i18n.d.ts: i18n.Calendar.setTimeZone(string)';
const thirdPartySignature = [
    '@thirdParty/@hview/moment/index.d.ts: moment.Moment.utcOffset()',
    '@thirdParty/@hview/moment/index.d.ts: moment.Moment.utcOffset(number|string, boolean)',
    '@ohosSdk/api/@ohos.systemDateTime.d.ts: systemDateTime.' + arkanalyzer_1.DEFAULT_ARK_CLASS_NAME + '.setTimezone()'
];
class TimezoneInterfaceCheck {
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
        const stmts = arkMethod.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        for (let stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const invokeSignature = invokeExpr.getMethodSignature();
            let invokeSignatureStr = invokeSignature.toString();
            let clazz = arkMethod.getDeclaringArkClass();
            if (invokeSignatureStr === setTimeZoneSignature) {
                this.setTimeCheck(stmt, clazz);
            }
            else if (thirdPartySignature.includes(invokeSignatureStr)) {
                let invokeMethodName = invokeSignature.getMethodSubSignature().getMethodName();
                this.reportIssue(clazz.getDeclaringArkFile(), stmt, invokeMethodName);
            }
        }
    };
    setTimeCheck(stmt, clazz) {
        if (this.isDefaultParameter(stmt)) {
            return;
        }
        const fieldNameZone = 'zone_offset';
        let zoneStmt = this.getFieldStmt(stmt, fieldNameZone);
        if (!zoneStmt) {
            return;
        }
        const fieldNameDst = 'dst_offset';
        if (!this.getFieldStmt(stmt, fieldNameDst)) {
            this.reportIssue(clazz.getDeclaringArkFile(), zoneStmt, fieldNameZone);
        }
    }
    isDefaultParameter(stmt) {
        let arg = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt)?.getArg(0);
        if (!arg || !(arg instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let declaringStmt = arg.getDeclaringStmt();
        if ((!declaringStmt) || !(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return false;
        }
        let rightOp = declaringStmt.getRightOp();
        if (!(rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return false;
        }
        let methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
        const methodNameGetId = 'getID';
        if (methodName !== methodNameGetId) {
            return false;
        }
        let base = rightOp.getBase();
        if (!(base instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let declaringStmtBase = base.getDeclaringStmt();
        if (!declaringStmtBase || !(declaringStmtBase instanceof arkanalyzer_1.ArkAssignStmt)) {
            return false;
        }
        let baseRightOp = declaringStmtBase.getRightOp();
        if (!(baseRightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr)) {
            return false;
        }
        const baseTimeZone = 'getTimeZone';
        let baseMethodSignature = baseRightOp.getMethodSignature();
        let baseMethodName = baseMethodSignature.getMethodSubSignature().getMethodName();
        if (baseMethodName !== baseTimeZone) {
            return false;
        }
        const fileNameSdk = 'api\\@ohos.i18n.d.ts';
        let fileName = baseMethodSignature.getDeclaringClassSignature().getDeclaringFileSignature().getFileName();
        if (fileName !== fileNameSdk) {
            return false;
        }
        return true;
    }
    getFieldStmt(stmt, fieldName) {
        let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!(invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return undefined;
        }
        let base = invokeExpr.getBase();
        if (!(base instanceof arkanalyzer_1.Local)) {
            return undefined;
        }
        let stmts = base.getUsedStmts();
        for (let usedStmt of stmts) {
            const methodNameGet = 'get';
            let usedInvokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(usedStmt);
            if (!(usedInvokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
                continue;
            }
            let methodName = usedInvokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            if (methodName !== methodNameGet) {
                continue;
            }
            let arg = usedInvokeExpr.getArg(0);
            if (!(arg instanceof arkanalyzer_1.Constant)) {
                continue;
            }
            if (arg.getValue() === fieldName) {
                return usedStmt;
            }
        }
        return undefined;
    }
    reportIssue(arkFile, stmt, keyword) {
        let filePath = arkFile.getFilePath();
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let orgStmt = stmt.getOriginalText();
        let startColumn = -1;
        let endColumn = -1;
        if (orgStmt !== undefined) {
            let orgStmtStr = orgStmt.toString();
            startColumn = originalPosition.getColNo() + orgStmtStr.indexOf(keyword);
            endColumn = startColumn + keyword.length - 1;
        }
        if (startColumn === -1) {
            return;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, this.metaData.severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.TimezoneInterfaceCheck = TimezoneInterfaceCheck;
