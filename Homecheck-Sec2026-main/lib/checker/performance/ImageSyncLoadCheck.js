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
exports.ImageSyncLoadCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImageSyncLoadCheck');
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-sync-load-check.md',
    description: 'Asynchronous loading is recommended when a Iarge image is input.'
};
class ImageSyncLoadCheck {
    metaData = gMetaData;
    IMAGE = 'Image';
    SYNCLOAD = 'syncLoad';
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        const matchMethodCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchClazzCb, matchMethodCb];
    }
    check = (target) => {
        if (target instanceof ArkClass_1.ArkClass && !viewTreeTool.hasTraverse(target)) {
            this.obtainClassViewTree(target);
        }
        else if (target instanceof lib_1.ArkMethod) {
            this.obtainMethodViewTree(target);
        }
    };
    obtainClassViewTree(clazz) {
        let viewTreeRoot = clazz.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        this.traverseViewTree(viewTreeRoot);
    }
    obtainMethodViewTree(method) {
        let viewTreeRoot = method.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        this.traverseViewTree(viewTreeRoot);
    }
    traverseViewTree(viewTreeRoot) {
        if (viewTreeTool.hasTraverse(viewTreeRoot)) {
            return;
        }
        if (viewTreeRoot.name === this.IMAGE) {
            for (let [key, vals] of viewTreeRoot.attributes) {
                if (key !== this.SYNCLOAD) {
                    continue;
                }
                let stmt = this.checkSyncLoadByVals(vals);
                if (stmt) {
                    this.addIssueReport(stmt);
                }
            }
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                this.traverseViewTree(child);
            }
        }
    }
    checkSyncLoadByVals(vals) {
        let stmt = null;
        for (let val of vals) {
            if (val instanceof lib_1.ArkInvokeStmt) {
                stmt = val;
            }
            else if (val instanceof lib_1.ArkAssignStmt) {
                let leftOp = val.getLeftOp();
                if (leftOp instanceof lib_1.Local) {
                    stmt = leftOp.getDeclaringStmt();
                }
            }
            else if (val instanceof Array) {
                let value = val[0].toString();
                if (value === 'true') {
                    return stmt;
                }
            }
        }
        return null;
    }
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            let text = stmt.getOriginalText();
            let startCol = 0;
            if (!text || text?.length === 0) {
                return undefined;
            }
            let checkText = '.syncLoad(true)';
            let originalTexts = text.split('\n');
            let lineCount = -1;
            for (let originalText of originalTexts) {
                lineCount++;
                if (!originalText.includes(checkText)) {
                    continue;
                }
                if (lineCount === 0) {
                    startCol = originalText.indexOf(checkText) + originPosition.getColNo();
                }
                else {
                    startCol = originalText.indexOf(checkText) + 1;
                }
                let endCol = startCol + checkText.length - 1;
                let lineNum = line + lineCount;
                const originPath = arkFile.getFilePath();
                return { lineNum, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ImageSyncLoadCheck = ImageSyncLoadCheck;
