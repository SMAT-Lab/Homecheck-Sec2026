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
exports.PagePrefetchCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PagePrefetchCheck');
const CREATE = 'create';
const WEB = 'Web';
const ON_APPEAR = 'onAppear';
const ON_PAGE_END = 'onPageEnd';
const ABOUT_TO_APPEAR = 'aboutToAppear';
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
// 用完初始化
let warnInfo = {
    line: -1,
    startCol: -1,
    endCol: -1,
    filePath: ''
};
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/page-prefetch-check.md',
    description: 'Invoking pre-download in the onPageEnd of the web component can speed up the loading speed.'
};
/**
 * Invoking pre-download in the onPageEnd of the web component can speed up the loading speed.
 */
class PagePrefetchCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    registerMatchers() {
        const matchBuildCb = {
            matcher: undefined,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (scene) => {
        for (let file of scene.getFiles()) {
            for (let clazz of file.getClasses()) {
                this.clazzProcess(clazz, scene);
            }
            for (let namespace of file.getAllNamespacesUnderThisFile()) {
                for (let clazz of namespace.getClasses()) {
                    this.clazzProcess(clazz, scene);
                }
            }
        }
    };
    clazzProcess(clazz, scene) {
        if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
            let viewTreeRoot = clazz.getViewTree()?.getRoot();
            if (!viewTreeRoot) {
                return;
            }
            this.traverseViewTree(viewTreeRoot, clazz, scene);
        }
    }
    /**
    * Traverse the viewtree.
    *
    * @param viewTreeRoot
    * @param clazz
    * @param scene
    */
    traverseViewTree(viewTreeRoot, clazz, scene) {
        if (viewTreeRoot === undefined) {
            return;
        }
        let name = viewTreeRoot.name;
        if (name === WEB) {
            let isFindedInPageEnd = false;
            for (let [key, vals] of viewTreeRoot.attributes) {
                if (key === CREATE) {
                    this.getWarnInfoByAttributes(vals);
                }
                else if (!isFindedInPageEnd && (key === ON_APPEAR || key === ON_PAGE_END)) {
                    isFindedInPageEnd = this.findSymbolInStmts(vals, scene);
                }
            }
            if (!isFindedInPageEnd) {
                isFindedInPageEnd = this.findSymbolInAboutToAppear(clazz, scene);
            }
            if (!isFindedInPageEnd) {
                this.pushIssueReport();
            }
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                let classSignature = child.signature;
                // 如果是Component，如果在子节点遍历一遍，入口获取arkClass.getViewTree()的时候还会来一次会重复
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                // 如果找到逐层推出递归，如果没找到继续往子节点深度查找
                this.traverseViewTree(child, clazz, scene);
            }
        }
    }
    /**
     * Find symbol in appear.
     *
     * @param stmts
     * @param scene
     * @returns boolean if finded that return true, else return false.
     */
    findSymbolInStmts(stmts, scene) {
        for (let stmt of stmts) {
            if (stmt instanceof lib_1.ArkInvokeStmt) {
                let busyMethods = new Set;
                return this.findSymbolInStmt(stmt, scene, busyMethods);
            }
        }
        return false;
    }
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param stmt Stmt
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    findSymbolInStmt(stmt, scene, busyMethods) {
        let invokeArgvs = null;
        if (stmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof lib_1.ArkInstanceInvokeExpr) {
                invokeArgvs = rightOp.getArgs();
            }
        }
        else if (stmt instanceof lib_1.ArkInvokeStmt) {
            invokeArgvs = stmt.getInvokeExpr().getArgs();
        }
        if (invokeArgvs) {
            return this.findSymbolInArgs(invokeArgvs, scene, busyMethods);
        }
        return false;
    }
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param invokeArgvs
     * @param scene
     * @param busyMethods
     * @returns boolean
     */
    findSymbolInArgs(invokeArgvs, scene, busyMethods) {
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (type instanceof lib_1.FunctionType) {
                let methodSignature = type.getMethodSignature();
                let anonymousMethod = scene.getMethod(methodSignature);
                if (anonymousMethod !== null && !busyMethods.has(anonymousMethod.getSignature())) {
                    return this.findSymbolInMethod(anonymousMethod, scene, busyMethods);
                }
                else {
                    logger.debug('Find FunctionType method error');
                }
            }
        }
        return false;
    }
    /**
     * Search the symbol in deeply.
     *
     * @param method Method to be checked.
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    findSymbolInMethod(method, scene, busyMethods) {
        const stmts = method.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return false;
        }
        const curMethodSignature = method.getSignature();
        // 即将处理，加入忙碌集合
        busyMethods.add(curMethodSignature);
        for (let stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const invokeSignature = invokeExpr.getMethodSignature();
            // 方法忙碌，为递归调用，跳过
            if (busyMethods.has(invokeSignature)) {
                continue;
            }
            const prepareForPageLoadStr = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.prefetchPage(string, @ohosSdk/api/@ohos.web.webview.d.ts: webview.WebHeader[])';
            let invokeSignatureStr = invokeSignature.toString();
            // 匹配
            if (invokeSignatureStr === prepareForPageLoadStr) {
                // 方法处理完毕，退出忙碌集合
                busyMethods.delete(curMethodSignature);
                return true;
            }
            else {
                // 不匹配，需要深度探索
                let hasTargetsinvokeSignature = this.findSymbolInStmt(stmt, scene, busyMethods);
                if (hasTargetsinvokeSignature) {
                    // 方法处理完毕，退出忙碌集合
                    busyMethods.delete(curMethodSignature);
                    return true;
                }
                let invokeMethod = scene.getMethod(invokeSignature);
                if (invokeMethod === null) {
                    continue;
                }
                if (this.findSymbolInMethod(invokeMethod, scene, busyMethods)) {
                    // 方法处理完毕，退出忙碌集合
                    busyMethods.delete(curMethodSignature);
                    return true;
                }
            }
        }
        // 方法处理完毕，退出忙碌集合
        busyMethods.delete(curMethodSignature);
        return false;
    }
    findSymbolInAboutToAppear(clazz, scene) {
        const methods = clazz.getMethods();
        for (let method of methods) {
            const methodName = method.getName();
            if (methodName === ABOUT_TO_APPEAR) {
                let busyMethods = new Set();
                return this.findSymbolInMethod(method, scene, busyMethods);
            }
        }
        return false;
    }
    /**
     * Get the warn info by attributes.
     *
     * @param vals: The stmt of control.
     */
    getWarnInfoByAttributes(vals) {
        for (let val of vals) {
            if (val instanceof lib_1.Stmt) {
                this.getWarnInfo(val);
                break;
            }
        }
    }
    /**
     * Get the warn info.
     *
     * @param method: The stmt of method.
     */
    getWarnInfo(stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile === undefined) {
            return;
        }
        const originalPosition = stmt.getOriginPositionInfo();
        warnInfo.filePath = arkFile.getFilePath();
        warnInfo.line = originalPosition.getLineNo();
        warnInfo.startCol = originalPosition.getColNo();
        warnInfo.endCol = warnInfo.startCol + WEB.length - 1;
    }
    /**
     * When not finded targets signature Push the issueReports.
     */
    pushIssueReport() {
        if (warnInfo.line !== -1 && warnInfo.startCol !== -1 && warnInfo.endCol !== -1) {
            const severity = this.rule.alert ?? this.metaData.severity;
            let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
            warnInfo = { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
    }
}
exports.PagePrefetchCheck = PagePrefetchCheck;
