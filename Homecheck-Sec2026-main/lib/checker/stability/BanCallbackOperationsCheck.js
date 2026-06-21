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
exports.BanCallbackOperationsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'BanCallbackOperationsCheck');
const SIGNATURE = [
    `@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraManager.on('cameraStatus', @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraStatusInfo,void>)`,
    `@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraManager.off('cameraStatus', @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraStatusInfo,void>)`,
];
const SIGNATURE2 = [
    `@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraManager`,
];
const keyword = 'on';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/ban-callback-operations-check.md',
    description: 'In the callback on() interface, it is prohibited to add (by calling the on method) or remove (by calling the off method) callback operations.'
};
class BanCallbackOperationsCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (target) => {
        const busyMethods = new Set();
        const methodSignature = target.getSignature();
        busyMethods.add(methodSignature);
        const stmts = target.getBody()?.getCfg()?.getStmts() ?? [];
        stmts.forEach((stmt) => {
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (invoker === null) {
                return;
            }
            const methodSignature = invoker.getMethodSignature();
            if (busyMethods.has(methodSignature)) {
                return;
            }
            if (!SIGNATURE.includes(methodSignature.toString())) {
                return;
            }
            const classSignature = methodSignature.getDeclaringClassSignature();
            if (!SIGNATURE2.includes(classSignature.toString())) {
                return;
            }
            const args = invoker.getArgs();
            if (args.length < 2) {
                return;
            }
            const type = args[1].getType();
            if (!(type instanceof arkanalyzer_1.FunctionType)) {
                return;
            }
            const callbackSignature = type.getMethodSignature();
            const callbackMethod = target.getDeclaringArkFile().getScene().getMethod(callbackSignature);
            if (callbackMethod === null) {
                return;
            }
            const hasReportStmt = this.processStmts(busyMethods, callbackMethod);
            if (!hasReportStmt) {
                return;
            }
            this.reportIssue(target, stmt);
        });
    };
    processStmts(busyMethods, callbackMethod) {
        const methodSignature = callbackMethod.getSignature();
        busyMethods.add(methodSignature);
        const stmts = callbackMethod.getBody()?.getCfg()?.getStmts() ?? [];
        for (let stmt of stmts) {
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (invoker === null) {
                continue;
            }
            const methodSignature = invoker.getMethodSignature();
            if (busyMethods.has(methodSignature)) {
                continue;
            }
            busyMethods.add(methodSignature);
            if (!SIGNATURE.includes(methodSignature.toString())) {
                continue;
            }
            const classSignature = methodSignature.getDeclaringClassSignature();
            if (!SIGNATURE2.includes(classSignature.toString())) {
                continue;
            }
            return true;
        }
        return false;
    }
    reportIssue(method, stmt) {
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        const index = text.indexOf(keyword);
        if (index === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const startColum = originalPosition.getColNo() + index;
        const endColum = startColum + keyword.length - 1;
        const filePath = method.getDeclaringArkFile().getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.BanCallbackOperationsCheck = BanCallbackOperationsCheck;
