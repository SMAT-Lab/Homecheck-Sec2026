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
exports.JsCodeCacheByPrecompileCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'JsCodeCacheByPrecompileCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/js-code-cache-by-precompile-check.md',
    description: 'Pre-compile JavaScript into bytecode in the ' +
        'onControllerAttached phase of the Web component for faster page loading.'
};
const webSet = new Set(['onControllerAttached']);
const ABOUT_TO_APPEAR = 'aboutToAppear';
const precompileJavaScriptSignature = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.precompileJavaScript(string, string|Uint8Array, @ohosSdk/api/@ohos.web.webview.d.ts: webview.CacheOptions)';
const MIN_VERSION = 12;
class JsCodeCacheByPrecompileCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
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
        let api = Index_1.CheckerStorage.getInstance().getApiVersion();
        if (api < MIN_VERSION) {
            return;
        }
        if (this.viewTreeTool.hasTraverse(arkClass)) {
            return;
        }
        const viewtreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewtreeRoot) {
            return;
        }
        this.traverseViewTree(viewtreeRoot, arkClass, arkClass.getDeclaringArkFile().getScene());
    };
    traverseViewTree(viewtreeRoot, arkClass, scene) {
        if (!viewtreeRoot) {
            return;
        }
        let name = viewtreeRoot.name;
        if (name === 'Web') {
            this.webOperation(viewtreeRoot, arkClass, scene);
        }
        if (viewtreeRoot.children.length > 0) {
            for (let child of viewtreeRoot.children) {
                let classSignature = child.signature;
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                this.traverseViewTree(child, arkClass, scene);
            }
        }
    }
    webOperation(viewtreeRoot, arkClass, scene) {
        let hasJsInValue = false;
        for (let [key, vals] of viewtreeRoot.attributes) {
            if (!webSet.has(key)) {
                continue;
            }
            if (this.isHasJSInValue(vals, scene)) {
                hasJsInValue = true;
                return;
            }
        }
        if (!hasJsInValue && !this.findSymbolInAboutToAppear(arkClass, scene)) {
            this.setReportIssue(arkClass, viewtreeRoot);
        }
    }
    findSymbolInAboutToAppear(arkClass, scene) {
        const methods = arkClass.getMethods();
        for (let method of methods) {
            const methodName = method.getName();
            if (methodName === ABOUT_TO_APPEAR) {
                let busyMethods = new Set();
                return this.findSymbolInMethod(method, scene, busyMethods);
            }
        }
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
    isHasJSInValue(values, scene) {
        let value = values[0];
        let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(value);
        if (!invokeExpr) {
            return false;
        }
        let args = invokeExpr.getArgs();
        if (args.length === 0) {
            return false;
        }
        let arg = args[0];
        let type = arg.getType();
        if (!(type instanceof arkanalyzer_1.FunctionType)) {
            return false;
        }
        let invokeMethod = scene.getMethod(type.getMethodSignature());
        if (!invokeMethod) {
            return false;
        }
        let busyMethods = new Set();
        if (this.findSymbolInMethod(invokeMethod, scene, busyMethods)) {
            return true;
        }
        return false;
    }
    findSymbolInMethod(arkMethod, scene, busyMethods) {
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
            if (invokeSignatureStr === precompileJavaScriptSignature) {
                return true;
            }
            else {
                this.findSymbolInInvokeStmt(stmt, scene, busyMethods);
                let invokeMethod = scene.getMethod(invokeSignature);
                if (invokeMethod === null) {
                    continue;
                }
                if (this.findSymbolInMethod(invokeMethod, scene, busyMethods)) {
                    return true;
                }
            }
        }
        busyMethods.delete(curMethodSignature);
        return false;
    }
    findSymbolInInvokeStmt(stmt, scene, busyMethods) {
        let invokeArgs = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt)?.getArgs();
        if (invokeArgs) {
            this.findSymbolInArgs(invokeArgs, scene, busyMethods);
        }
    }
    findSymbolInArgs(invokeArgs, scene, busyMethods) {
        for (let arg of invokeArgs) {
            let type = arg.getType();
            if (!(type instanceof arkanalyzer_1.FunctionType)) {
                continue;
            }
            let methodSignature = type.getMethodSignature();
            let anonyMouseMethod = scene.getMethod(methodSignature);
            if (anonyMouseMethod === null || busyMethods.has(anonyMouseMethod.getSignature())) {
                continue;
            }
            this.findSymbolInMethod(anonyMouseMethod, scene, busyMethods);
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
exports.JsCodeCacheByPrecompileCheck = JsCodeCacheByPrecompileCheck;
