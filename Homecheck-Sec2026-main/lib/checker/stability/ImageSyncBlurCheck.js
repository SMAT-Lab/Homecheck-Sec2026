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
exports.ImageSyncBlurCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImageSyncBlurCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-sync-blur-check.md',
    description: 'Static images should use the correct color picking method.'
};
const DEFAULT_SIGNATURE = '@ohosSdk/component/common.d.ts: AdaptiveColor.[static]DEFAULT';
const ADAPTIVE_COLOR = 'adaptiveColor';
const IMAGE_BLUR = 'Image';
const BLUR_STYLE = 'foregroundBlurStyle';
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
class ImageSyncBlurCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (arkClass) => {
        let viewTreeRoot = arkClass.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        this.traverseViewTree(viewTreeRoot, arkClass);
    };
    traverseViewTree(viewTreeRoot, arkClass) {
        if (viewTreeTool.hasTraverse(viewTreeRoot)) {
            return;
        }
        if (viewTreeRoot.name === IMAGE_BLUR) {
            for (let [key, vals] of viewTreeRoot.attributes) {
                if (key !== BLUR_STYLE) {
                    continue;
                }
                this.checkSyncBlurByVals(vals, arkClass);
            }
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                this.traverseViewTree(child, arkClass);
            }
        }
    }
    checkSyncBlurByVals(vals, arkClass) {
        let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(vals[0]);
        if (!invoker) {
            return;
        }
        let arg = invoker.getArg(1);
        if (arg instanceof lib_1.Local) {
            let stmt = arg.getDeclaringStmt();
            if (stmt) {
                this.traversalLocals(stmt);
            }
            else {
                this.traversalDefaultClass(arkClass.getDeclaringArkFile(), arg.getName());
            }
        }
    }
    traversalLocals(declaringStmt) {
        let method = declaringStmt.getCfg().getDeclaringMethod();
        if (!(declaringStmt instanceof lib_1.ArkAssignStmt)) {
            return;
        }
        let rightOp = declaringStmt.getRightOp();
        if (rightOp instanceof lib_1.Local || rightOp instanceof lib_1.ArkNewExpr) {
            let type = rightOp.getType();
            if (!(type instanceof lib_1.ClassType)) {
                return;
            }
            let arkClass = method.getDeclaringArkFile().getScene().getClass(type.getClassSignature());
            let fields = arkClass?.getFields();
            if (!fields) {
                return;
            }
            this.checkFieldsForAdaptiveColor(fields);
        }
        else if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
            let field = method.getDeclaringArkClass().getField(rightOp.getFieldSignature());
            if (!field) {
                return;
            }
            let initializer = field.getInitializer()[0];
            this.traversalLocals(initializer);
        }
    }
    traversalDefaultClass(arkFile, name) {
        let defaultClass = arkFile.getDefaultClass();
        let method = defaultClass.getMethods()[0];
        let locals = method.getBody()?.getLocals();
        if (!locals) {
            return;
        }
        for (let [key, value] of locals) {
            if (!(value instanceof lib_1.Local)) {
                continue;
            }
            if (key !== name) {
                continue;
            }
            let declaringStmt = value.getDeclaringStmt();
            if (!declaringStmt) {
                return;
            }
            this.traversalLocals(declaringStmt);
        }
    }
    checkFieldsForAdaptiveColor(fields) {
        for (const field of fields) {
            let name = field.getName();
            if (name !== ADAPTIVE_COLOR) {
                continue;
            }
            let initializer = field.getInitializer()[0];
            if (initializer instanceof lib_1.ArkAssignStmt) {
                let rightOp = initializer.getRightOp();
                if (!(rightOp instanceof lib_1.ArkStaticFieldRef)) {
                    continue;
                }
                if (rightOp.getFieldSignature().toString() !== DEFAULT_SIGNATURE) {
                    this.reportIssue(field, name);
                }
            }
        }
    }
    reportIssue(field, name) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = field.getDeclaringArkClass().getDeclaringArkFile().getFilePath();
        let lineNum = field.getOriginPosition().getLineNo();
        let startColum = field.getOriginPosition().getColNo();
        let endColumn = startColum + name.length - 1;
        let defects = new Index_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ImageSyncBlurCheck = ImageSyncBlurCheck;
