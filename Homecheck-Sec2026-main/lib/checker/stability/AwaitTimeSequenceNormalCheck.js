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
exports.AwaitTimeSequenceNormalCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AwaitTimeSequenceNormalCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/await-time-sequence-normal-check.md',
    description: 'In an asynchronous function, call an asynchronous function that returns a Promise, and use await to ensure the normal sequence of execution.'
};
const signaTure = [
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.Session.start()',
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.Session.stop()',
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.Session.release()',
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraInput.open()',
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraInput.close()'
];
class AwaitTimeSequenceNormalCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (arkMethod) => {
        if (arkMethod.getModifiers() !== 64) {
            return;
        }
        let stmts = arkMethod.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        this.processStmt(stmts);
    };
    processStmt(stmts) {
        for (const stmt of stmts) {
            if (!(stmt instanceof lib_1.ArkInvokeStmt)) {
                continue;
            }
            let invoker = stmt.getInvokeExpr();
            if (signaTure.includes(invoker.getMethodSignature().toString())) {
                this.reportIssue(stmt, invoker.getMethodSignature().getMethodSubSignature().getMethodName());
            }
        }
    }
    reportIssue(stmt, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const startColumn = originPositionInfo.getColNo() + text.lastIndexOf(methodName);
        const endColunm = startColumn + methodName.length - 1;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AwaitTimeSequenceNormalCheck = AwaitTimeSequenceNormalCheck;
