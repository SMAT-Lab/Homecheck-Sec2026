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
exports.AvoidCallsInUIAbilityLifecycleCheck = void 0;
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AvoidCallsInUIAbilityLifecycleCheck');
const classSignatureStr = '@ohosSdk/api/@ohos.app.ability.UIAbility.d.ts: UIAbility';
const NAMES = ['onCreate', 'onWindowStageCreate', 'onWindowStageDestroy', 'onWindowStageWillDestroy', 'onForeground', 'onBackground', 'onNewWant', 'onDestroy'];
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/avoid-calls-in-uiability-lifecycle-check.md',
    description: 'It is not recommended to call @ohos.measure and @ohos.font during the lifecycle of UIAbility. '
};
class AvoidCallsInUIAbilityLifecycleCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (target) => {
        const heritageClasses = target.getAllHeritageClasses();
        if (heritageClasses.length === 0) {
            return;
        }
        if (classSignatureStr !== heritageClasses[0].getSignature().toString()) {
            return;
        }
        for (let method of target.getMethods()) {
            const methodName = method.getSignature().getMethodSubSignature().getMethodName();
            if (!NAMES.includes(methodName)) {
                continue;
            }
            const stmts = method.getBody()?.getCfg().getStmts() ?? [];
            stmts.forEach((stmt) => {
                let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (invoker === null) {
                    return;
                }
                const signatureStr = invoker.getMethodSignature().toString();
                const name = invoker.getMethodSignature().getMethodSubSignature().getMethodName();
                if (!(signatureStr.includes('@ohos.measure') || signatureStr.includes('@ohos.font'))) {
                    return;
                }
                this.reportIssue(target, stmt, name);
            });
        }
    };
    reportIssue(method, stmt, methodName) {
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        const index = text.indexOf(methodName);
        if (index === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColum = originalPosition.getColNo() + index;
        const endColum = startColum + methodName.length - 1;
        const filePath = method.getDeclaringArkFile().getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AvoidCallsInUIAbilityLifecycleCheck = AvoidCallsInUIAbilityLifecycleCheck;
