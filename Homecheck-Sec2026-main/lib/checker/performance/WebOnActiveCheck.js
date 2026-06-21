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
exports.WebOnActiveCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'WebOnActiveCheck');
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const WEB = 'Web';
const onPageBegin = 'onPageBegin';
const onFirstMeaningfulPaint = 'onFirstMeaningfulPaint';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/web-on-active-check.md',
    description: 'Call the API to stop rendering of a web page after its first render is complete.'
};
const onActiveSignature = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.onActive()';
const onInActiveSignature = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.onInactive()';
class WebOnActiveCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkClass) => {
        if (viewTreeTool.hasTraverse(arkClass)) {
            return;
        }
        const viewtreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewtreeRoot) {
            return;
        }
        this.traverseViewTree(viewtreeRoot, arkClass);
    };
    traverseViewTree(viewtreeRoot, arkClass) {
        if (viewtreeRoot === undefined || viewTreeTool.hasTraverse(viewtreeRoot)) {
            return;
        }
        let name = viewtreeRoot.name;
        if (name === WEB) {
            if (this.isHasActive(viewtreeRoot, arkClass, onActiveSignature, onPageBegin) &&
                !this.isHasActive(viewtreeRoot, arkClass, onInActiveSignature, onFirstMeaningfulPaint)) {
                this.setReportIssue(arkClass, viewtreeRoot);
            }
        }
        if (viewtreeRoot.children.length > 0) {
            for (let child of viewtreeRoot.children) {
                let classSignature = child.signature;
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                this.traverseViewTree(child, arkClass);
            }
        }
    }
    isHasActive(viewtreeRoot, arkClass, signatureStr, attribute) {
        let vals = viewtreeRoot.attributes.get(attribute);
        if (!vals) {
            return false;
        }
        let stmt = vals[0];
        let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return false;
        }
        let arg = invokeExpr.getArg(0);
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let type = arg.getType();
        if (!(type instanceof arkanalyzer_1.FunctionType)) {
            return false;
        }
        let signature = type.getMethodSignature();
        let scene = arkClass.getDeclaringArkFile().getScene();
        let method = scene.getMethod(signature);
        if (!method) {
            return false;
        }
        let busyMethods = new Set();
        return this.findSymbolInMethod(method, scene, busyMethods, signatureStr);
    }
    findSymbolInMethod(arkMethod, scene, busyMethods, signature) {
        const stmts = arkMethod.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return false;
        }
        const curMethodSignature = arkMethod.getSignature();
        busyMethods.add(curMethodSignature);
        for (let stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const invokeSignature = invokeExpr.getMethodSignature();
            let invokeSignatureStr = invokeSignature.toString();
            if (busyMethods.has(invokeSignature) || invokeSignatureStr.includes(`@${arkanalyzer_1.UNKNOWN_PROJECT_NAME}/${arkanalyzer_1.UNKNOWN_FILE_NAME}`)) {
                continue;
            }
            if (invokeSignatureStr === signature) {
                return true;
            }
            else {
                let invokeMethod = scene.getMethod(invokeSignature);
                if (invokeMethod === null) {
                    continue;
                }
                if (this.findSymbolInMethod(invokeMethod, scene, busyMethods, signature)) {
                    return true;
                }
            }
        }
        busyMethods.delete(curMethodSignature);
        return false;
    }
    setReportIssue(arkClass, viewtreeRoot) {
        let arkFile = arkClass.getDeclaringArkFile();
        for (let [key, vals] of viewtreeRoot.attributes) {
            if (key !== 'create') {
                continue;
            }
            let stmt = vals[0];
            this.reportIssue(arkFile, stmt);
        }
    }
    reportIssue(arkFile, stmt) {
        if (!stmt) {
            return;
        }
        const filePath = arkFile.getFilePath();
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColumn = -1;
        let endColumn = -1;
        const orgStmtStr = stmt.getOriginalText();
        if (orgStmtStr && orgStmtStr.length !== 0) {
            startColumn = originalPosition.getColNo() + orgStmtStr.indexOf('Web');
            endColumn = startColumn + 'Web'.length - 1;
        }
        if (startColumn === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.WebOnActiveCheck = WebOnActiveCheck;
