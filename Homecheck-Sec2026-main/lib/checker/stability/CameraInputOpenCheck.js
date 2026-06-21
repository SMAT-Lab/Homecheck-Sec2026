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
exports.CameraInputOpenCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CameraInputOpenCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/camera-input-open-check.md',
    description: 'In the CameraSession, the input parameter of the addInput interface must be a CameraInput that has already called the open method.'
};
const addInputSiganture = '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.Session.addInput(@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraInput)';
const openSiganture = [
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraInput.open()',
    '@ohosSdk/api/@ohos.multimedia.camera.d.ts: camera.CameraInput.open(@ohosSdk/api/@ohos.base.d.ts: AsyncCallback<void,void>)'
];
class CameraInputOpenCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (arkMethod) => {
        let blocks = arkMethod.getCfg()?.getBlocks();
        if (!blocks) {
            return;
        }
        for (let block of blocks) {
            this.processStmt(block.getStmts());
        }
    };
    processStmt(stmts) {
        for (const stmt of stmts) {
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoker) {
                continue;
            }
            if (invoker.getMethodSignature().toString() === addInputSiganture) {
                let arg = invoker.getArg(0);
                if (!(arg instanceof lib_1.Local)) {
                    continue;
                }
                if (!this.processUsedStmt(arg.getUsedStmts(), stmt.getOriginPositionInfo().getLineNo(), 0)) {
                    this.reportIssue(stmt, arg.getName());
                }
            }
        }
    }
    processUsedStmt(usedStmts, line, defStmtNum) {
        for (const stmt of usedStmts) {
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoker) {
                continue;
            }
            if (defStmtNum === 0) {
                defStmtNum = stmt.getOriginPositionInfo().getLineNo();
            }
            if (!openSiganture.includes(invoker.getMethodSignature().toString())) {
                let method = stmt
                    .getCfg()
                    .getDeclaringMethod()
                    .getDeclaringArkFile()
                    .getScene()
                    .getMethod(invoker.getMethodSignature());
                return this.processUsedStmt(method?.getCfg()?.getStmts() ?? [], line, defStmtNum);
            }
            if (defStmtNum < line) {
                return true;
            }
        }
        return false;
    }
    reportIssue(stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let filePath = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getFilePath();
        const originalPosition = stmt.getOriginPositionInfo();
        const lineNum = originalPosition.getLineNo();
        const orgStmtStr = stmt.getOriginalText();
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let startColumn = originalPosition.getColNo() + orgStmtStr.indexOf(keyword);
        let endColunm = startColumn + keyword.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.CameraInputOpenCheck = CameraInputOpenCheck;
