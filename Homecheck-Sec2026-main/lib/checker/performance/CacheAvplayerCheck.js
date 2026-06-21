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
exports.CacheAvplayerCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_2 = require("../../model/Defects");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CacheAvplayerCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/cache-avplayer-check.md',
    description: 'Suggest cache avplayer.'
};
const gKeyword = 'release';
const aboutToDisappearStr = 'aboutToDisappear';
const releaseSignature = [
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer.release(AsyncCallback<void>)`,
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer.release()`
];
const importSignature = '@ohosSdk/api/@ohos.multimedia.media.d.ts: ';
class CacheAvplayerCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (targetFile) => {
        if (!this.importCheck(targetFile)) {
            return;
        }
        for (let arkClass of targetFile.getClasses()) {
            this.classProcess(arkClass);
        }
        for (let namespace of targetFile.getAllNamespacesUnderThisFile()) {
            for (let arkClass of namespace.getClasses()) {
                this.classProcess(arkClass);
            }
        }
    };
    importCheck(arkFile) {
        let importInfos = arkFile.getImportInfos();
        for (let importInfo of importInfos) {
            let lazyExportInfo = importInfo.getLazyExportInfo();
            if (!lazyExportInfo) {
                continue;
            }
            let arkExport = lazyExportInfo.getArkExport();
            if (!(arkExport instanceof lib_1.ArkNamespace)) {
                continue;
            }
            let arkFile = arkExport.getDeclaringArkFile();
            if (!arkFile) {
                continue;
            }
            let declaringFileSignature = arkFile.getFileSignature();
            if (declaringFileSignature.toString() === importSignature) {
                return true;
            }
        }
        return false;
    }
    classProcess(arkClass) {
        let arkMethods = arkClass.getMethods();
        for (let arkMethod of arkMethods) {
            if (arkMethod.getName() !== aboutToDisappearStr) {
                continue;
            }
            let busyMethods = new Set();
            this.findSymbolInMethod(arkMethod, arkMethod.getDeclaringArkFile().getScene(), busyMethods);
        }
    }
    findSymbolInMethod(arkMethod, scene, busyMethods) {
        const cfgStmts = arkMethod.getBody()?.getCfg().getStmts();
        if (!cfgStmts) {
            return;
        }
        const curMethodSignature = arkMethod.getSignature();
        busyMethods.add(curMethodSignature);
        for (let stmt of cfgStmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const cacheInvokeSignature = invokeExpr.getMethodSignature();
            let invokeSignatureStr = cacheInvokeSignature.toString();
            if (busyMethods.has(cacheInvokeSignature) || invokeSignatureStr.includes(`@${lib_1.UNKNOWN_PROJECT_NAME}/${lib_1.UNKNOWN_FILE_NAME}`)) {
                continue;
            }
            let clazz = arkMethod.getDeclaringArkClass();
            if (releaseSignature.includes(invokeSignatureStr)) {
                this.reportIssue(clazz.getDeclaringArkFile(), stmt);
            }
            else {
                this.findSymbolInvokeStmt(stmt, scene, busyMethods);
                let invokeMethod = scene.getMethod(cacheInvokeSignature);
                if (invokeMethod === null) {
                    continue;
                }
                this.findSymbolInMethod(invokeMethod, scene, busyMethods);
            }
        }
        busyMethods.delete(curMethodSignature);
    }
    findSymbolInvokeStmt(stmt, scene, busyMethods) {
        let invokeArgs = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt)?.getArgs();
        if (invokeArgs) {
            this.findSymbolInArgs(invokeArgs, scene, busyMethods);
        }
    }
    findSymbolInArgs(invokeArgvs, scene, busyMethods) {
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (!(type instanceof lib_1.FunctionType)) {
                continue;
            }
            let methodSignature = type.getMethodSignature();
            let anonymousMethod = scene.getMethod(methodSignature);
            if (anonymousMethod !== null && !busyMethods.has(anonymousMethod.getSignature())) {
                this.findSymbolInMethod(anonymousMethod, scene, busyMethods);
            }
            else {
                logger.debug('Find FunctionType method error!');
            }
        }
    }
    reportIssue(arkFile, stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let filePath = arkFile.getFilePath();
        if (!stmt) {
            return;
        }
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let orgStmtStr = stmt.getOriginalText();
        let startColumn = -1;
        let endColumn = -1;
        if (orgStmtStr && orgStmtStr.length !== 0) {
            startColumn = originalPosition.getColNo() + orgStmtStr.indexOf(gKeyword);
            endColumn = startColumn + gKeyword.length - 1;
        }
        if (startColumn === -1) {
            return;
        }
        let defects = new Defects_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defects, undefined));
    }
}
exports.CacheAvplayerCheck = CacheAvplayerCheck;
