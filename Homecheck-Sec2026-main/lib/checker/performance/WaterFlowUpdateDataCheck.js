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
exports.WaterFlowUpdateDataCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'WaterFlowUpdateDataCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/waterflow-data-preload-check.md',
    description: 'Preload data in the WaterFlow component for better scrolling experience.'
};
class WaterFlowUpdateDataCheck {
    WATERFLOW = 'WaterFlow';
    LAZY_FOREACH = 'LazyForEach';
    CREATE = 'create';
    FLOW_ITEM = 'FlowItem';
    ON_APPEAR = 'onAppear';
    warnInfo = { line: -1, startCol: -1, endCol: -1, filePath: '' };
    usedComponentMap = new Map();
    viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        this.usedComponentMap.clear();
        let fileSignature = arkFile.getFileSignature();
        let scene = arkFile.getScene();
        for (let clazz of arkFile.getClasses()) {
            this.classProcess(clazz, fileSignature, scene);
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                this.classProcess(clazz, fileSignature, scene);
            }
        }
    };
    classProcess(arkClass, fileSignature, scene) {
        if (arkClass.hasViewTree() && !this.viewTreeTool.hasTraverse(arkClass)) {
            this.warnInfo = { line: -1, startCol: -1, endCol: -1, filePath: '' };
            let viewTreeRoot = arkClass.getViewTree()?.getRoot();
            if (!viewTreeRoot) {
                return;
            }
            this.traverseViewTree(viewTreeRoot, fileSignature, scene, 0, 0);
        }
    }
    traverseViewTree(viewTreeRoot, fileSignature, scene, waterFlowCount, lazyForEachCount) {
        let isFinded = false;
        if (viewTreeRoot === undefined || this.viewTreeTool.hasTraverse(viewTreeRoot)) {
            return false;
        }
        let name = viewTreeRoot.name;
        if (name === this.WATERFLOW) {
            for (let [key, vals] of viewTreeRoot.attributes) {
                this.getWarnInfoByAttributes(key, vals);
            }
            waterFlowCount++;
        }
        else if (name === this.LAZY_FOREACH && waterFlowCount > 0) {
            lazyForEachCount++;
        }
        else if (name === this.FLOW_ITEM && lazyForEachCount > 0) {
            for (let [key, vals] of viewTreeRoot.attributes) {
                if ([this.ON_APPEAR].includes(key)) {
                    isFinded = this.findSymbolInAppear(vals, scene);
                    break;
                }
            }
        }
        if (name !== this.FLOW_ITEM) {
            if (viewTreeRoot.children.length > 0 &&
                this.traverseViewTreeByChildren(viewTreeRoot, fileSignature, scene, waterFlowCount, lazyForEachCount)) {
                isFinded = true;
            }
        }
        if (name === this.WATERFLOW) {
            waterFlowCount--;
            if (waterFlowCount === 0 && !isFinded) {
                this.pushIssueReport();
            }
        }
        else if (name === this.LAZY_FOREACH && waterFlowCount > 0) {
            lazyForEachCount--;
        }
        return isFinded;
    }
    pushIssueReport() {
        if (this.warnInfo.line !== -1 && !this.isExistIssueReport()) {
            const severity = this.rule.alert ?? this.metaData.severity;
            let defects = new Index_1.Defects(this.warnInfo.line, this.warnInfo.startCol, this.warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, this.warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
            this.warnInfo = { line: -1, startCol: -1, endCol: -1, filePath: '' };
        }
    }
    isExistIssueReport() {
        for (let defect of this.issues) {
            if (defect.defect.reportLine === this.warnInfo.line &&
                defect.defect.reportColumn === this.warnInfo.startCol) {
                return true;
            }
        }
        return false;
    }
    traverseViewTreeByChildren(viewTreeRoot, fileSignature, scene, waterFlowCount, lazyForEachCount) {
        let isFinded = false;
        for (let child of viewTreeRoot.children) {
            let classSignature = child?.signature;
            if (classSignature && classSignature instanceof arkanalyzer_1.ClassSignature) {
                if (fileSignature !== classSignature.getDeclaringFileSignature()) {
                    this.usedComponentMap.has(classSignature);
                    continue;
                }
                this.usedComponentMap.set(classSignature, classSignature.getClassName());
            }
            if (this.traverseViewTree(child, fileSignature, scene, waterFlowCount, lazyForEachCount)) {
                isFinded = true;
            }
            if (classSignature && classSignature instanceof arkanalyzer_1.ClassSignature) {
                this.usedComponentMap.delete(classSignature);
            }
        }
        return isFinded;
    }
    findSymbolInAppear(vals, scene) {
        for (let val of vals) {
            if (val instanceof arkanalyzer_1.ArkAssignStmt) {
                let busyMethods = new Set();
                return this.findSymbolInStmt(val, scene, busyMethods);
            }
        }
        return false;
    }
    findSymbolInStmt(stmt, scene, busyMethods) {
        let invokeArgvs = null;
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                invokeArgvs = rightOp.getArgs();
            }
        }
        else if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
            invokeArgvs = stmt.getInvokeExpr().getArgs();
        }
        if (invokeArgvs) {
            return this.findSymbolInArgs(invokeArgvs, scene, stmt, busyMethods);
        }
        return false;
    }
    findSymbolInArgs(invokeArgvs, scene, stmt, busyMethods) {
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (type instanceof arkanalyzer_1.FunctionType) {
                let methodSignature = type.getMethodSignature();
                let anonymousMethod = scene.getMethod(methodSignature);
                if (anonymousMethod !== null && !busyMethods.has(anonymousMethod.getSignature())) {
                    return this.findSymbolInMethod(anonymousMethod, scene, busyMethods);
                }
                else {
                    logger.warn('Find FunctionType method error.');
                }
            }
        }
        return false;
    }
    findSymbolInMethod(method, scene, busyMethods) {
        const stmts = method.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return false;
        }
        const curMethodSignature = method.getSignature();
        busyMethods.add(curMethodSignature);
        for (let stmt of stmts) {
            if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
                const invokeSignature = stmt.getInvokeExpr().getMethodSignature();
                if (busyMethods.has(invokeSignature)) {
                    continue;
                }
                const onDataAddStr = '@ohosSdk/component/lazy_for_each.d.ts: DataChangeListener.onDataAdd(number)';
                const onDataAddedStr = '@ohosSdk/component/lazy_for_each.d.ts: DataChangeListener.onDataAdded(number)';
                let invokeSignatureStr = invokeSignature.toString();
                if (invokeSignatureStr === onDataAddStr || invokeSignatureStr === onDataAddedStr) {
                    busyMethods.delete(curMethodSignature);
                    return true;
                }
                let hasTargetsinvokeSignature = this.findSymbolInStmt(stmt, scene, busyMethods);
                if (hasTargetsinvokeSignature) {
                    busyMethods.delete(curMethodSignature);
                    return true;
                }
                let invokeMethod = this.getInvokeMethod(scene, invokeSignature, stmt);
                if (invokeMethod === null) {
                    continue;
                }
                return this.findSymbolInMethod(invokeMethod, scene, busyMethods);
            }
        }
        return false;
    }
    getInvokeMethod(scene, invokeSignature, stmt) {
        let arkMethod = scene.getMethod(invokeSignature);
        if (arkMethod !== null) {
            return arkMethod;
        }
        let invokeSignatureName = invokeSignature.getMethodSubSignature().getMethodName();
        let declaringClass = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkClass();
        if (declaringClass === undefined) {
            return null;
        }
        let supperClass = declaringClass.getSuperClass();
        if (supperClass) {
            arkMethod = supperClass.getMethodWithName(invokeSignatureName);
            return arkMethod;
        }
        return null;
    }
    getWarnInfoByAttributes(key, vals) {
        if ([this.CREATE].includes(key)) {
            for (let val of vals) {
                if (val instanceof arkanalyzer_1.ArkAssignStmt) {
                    this.getWarnInfo(val);
                    break;
                }
            }
        }
    }
    getWarnInfo(stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile === undefined) {
            return;
        }
        this.warnInfo.filePath = arkFile.getFilePath();
        let originalPosition = stmt.getOriginPositionInfo();
        this.warnInfo.line = originalPosition.getLineNo();
        this.warnInfo.startCol = originalPosition.getColNo();
        this.warnInfo.endCol = this.warnInfo.startCol + this.WATERFLOW.length - 1;
    }
}
exports.WaterFlowUpdateDataCheck = WaterFlowUpdateDataCheck;
