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
exports.WebCacheModeCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'WebCacheModeCheck');
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const WEB = 'Web';
const CACHEMODE = 'cacheMode';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/web-cache-mode-check.md',
    description: 'Avoid setting the Web component\'s cacheMode attribute to Online.'
};
const cachemodeSignature = '@ohosSdk/component/web.d.ts: CacheMode.[static]Online';
class WebCacheModeCheck {
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
        if (viewtreeRoot === undefined) {
            return;
        }
        let name = viewtreeRoot.name;
        if (name === WEB) {
            this.cacheModeOnlineCheck(viewtreeRoot, arkClass);
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
    cacheModeOnlineCheck(viewtreeRoot, arkClass) {
        let vals = viewtreeRoot.attributes.get(CACHEMODE);
        if (!vals) {
            return;
        }
        let stmt = vals[0];
        let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return;
        }
        let arg = invokeExpr.getArg(0);
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return;
        }
        let declaringStmt = arg.getDeclaringStmt();
        if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return;
        }
        let rightOp = declaringStmt.getRightOp();
        if (this.traverseField(rightOp, arkClass)) {
            this.reportIssue(stmt, arg);
        }
    }
    traverseField(rightOp, arkClass) {
        if (!(rightOp instanceof arkanalyzer_1.AbstractFieldRef)) {
            return false;
        }
        let fieldSignature = rightOp.getFieldSignature();
        if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
            let fieldSignatureStr = fieldSignature.toString();
            if (fieldSignatureStr === cachemodeSignature) {
                return true;
            }
        }
        else {
            let field = arkClass.getField(fieldSignature);
            if (!field) {
                return false;
            }
            let initializerStmts = field.getInitializer();
            for (let initializerStmt of initializerStmts) {
                if (!(initializerStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                let rightOpStmt = initializerStmt.getRightOp();
                return this.traverseField(rightOpStmt, arkClass);
            }
        }
        return false;
    }
    reportIssue(stmt, arg) {
        const filePath = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile().getFilePath();
        let fullPosition = stmt.getOperandOriginalPosition(arg);
        if (!fullPosition) {
            return;
        }
        let lineNum = fullPosition.getFirstLine();
        let startColumn = fullPosition.getFirstCol();
        let endColumn = fullPosition.getLastCol() - 1;
        if (lineNum === -1 || startColumn === -1 || endColumn === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.WebCacheModeCheck = WebCacheModeCheck;
