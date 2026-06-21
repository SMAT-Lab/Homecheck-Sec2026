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
exports.ColorOverlayEffectCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ColorOverlayEffectCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/color-overlay-effect-check.md',
    description: 'It is recommended that you use the API for color calculation.'
};
class ColorOverlayEffectCheck {
    metaData = gMetaData;
    gFilePath = '';
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
    check = (target) => {
        let viewTreeRoot = target.getViewTree()?.getRoot();
        if (!viewTreeRoot) {
            return;
        }
        this.traverseViewTree(viewTreeRoot, target);
    };
    traverseViewTree(viewTreeRoot, arkClass) {
        if (viewTreeRoot === undefined) {
            return;
        }
        if (viewTreeRoot.name === 'Stack') {
            this.stackOperation(viewTreeRoot, arkClass);
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                let classSignature = child.signature;
                if (classSignature && child.isCustomComponent()) {
                    continue;
                }
                this.traverseViewTree(child, arkClass);
            }
        }
    }
    stackOperation(viewTreeRoot, arkClass) {
        let children = viewTreeRoot.children;
        if (children.length < 2) {
            return;
        }
        for (let i = 0; i < children.length - 1; i++) {
            let childName = children[i].name;
            for (let j = i + 1; j < children.length; j++) {
                if (childName === children[j].name) {
                    this.childrenCheck(children[i], children[j], arkClass);
                }
            }
        }
    }
    childrenCheck(child, children, arkClass) {
        let childAttributes = child.attributes;
        let childrenAttributes = children.attributes;
        if (childAttributes.size !== childrenAttributes.size) {
            return;
        }
        let isChildHasColor = false;
        let isAttributeSame = true;
        for (let childAttribute of childAttributes) {
            let name = childAttribute[0];
            if (name === 'backgroundColor') {
                isChildHasColor = true;
            }
            if (name === 'create' || name === 'pop') {
                continue;
            }
            let childValues = childAttribute[1];
            if (!(childValues instanceof Array)) {
                continue;
            }
            let childStmt = childValues[0];
            let childOrgStmtStr = childStmt.getOriginalText();
            if (!childOrgStmtStr || childOrgStmtStr.length === 0) {
                continue;
            }
            let orgStr = this.getOrgStr(childOrgStmtStr, name);
            if (!this.attributeCheck(name, orgStr, childrenAttributes)) {
                isAttributeSame = false;
                break;
            }
        }
        if (isChildHasColor && isAttributeSame) {
            this.setReportIssue(arkClass, child);
            this.setReportIssue(arkClass, children);
        }
    }
    getOrgStr(childOrgStmtStr, name) {
        if (!childOrgStmtStr) {
            return undefined;
        }
        let attributeName = '.' + name;
        let originalTexts = childOrgStmtStr.split('\n');
        for (let originalText of originalTexts) {
            if (originalText.includes(attributeName)) {
                return originalText;
            }
        }
        return undefined;
    }
    attributeCheck(name, childOrgStmtStr, childrenAttributes) {
        for (let childrenAttribute of childrenAttributes) {
            if (name !== childrenAttribute[0]) {
                continue;
            }
            if (name === 'backgroundColor') {
                return true;
            }
            let childrenValues = childrenAttribute[1];
            let childrenStmt = childrenValues[0];
            let method = childrenStmt.getCfg().getDeclaringMethod();
            if (!method) {
                continue;
            }
            let childrenOrgStmtStr = childrenStmt.getOriginalText();
            if (!childrenOrgStmtStr || childrenOrgStmtStr.length === 0) {
                continue;
            }
            let orgStr = this.getOrgStr(childrenOrgStmtStr, name);
            if (orgStr === childOrgStmtStr) {
                return true;
            }
        }
        return false;
    }
    setReportIssue(arkClass, viewTreeRoot) {
        let arkFile = arkClass.getDeclaringArkFile();
        for (let [key, vals] of viewTreeRoot.attributes) {
            if (key !== 'create') {
                continue;
            }
            let stmt = vals[0];
            this.addIssueReport(arkFile, stmt, viewTreeRoot.name);
        }
    }
    addIssueReport(arkFile, stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, stmt, keyword);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(arkFile, stmt, keyword) {
        if (arkFile) {
            const originPosition = stmt.getOriginPositionInfo();
            const lineNum = originPosition.getLineNo();
            const text = stmt.getOriginalText();
            let startCol = -1;
            let endCol = -1;
            if (text && text?.length !== 0) {
                startCol = text.indexOf(keyword) + originPosition.getColNo();
                endCol = startCol + keyword.length - 1;
            }
            if (startCol === -1) {
                return undefined;
            }
            const originPath = arkFile.getFilePath();
            return { lineNum, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ColorOverlayEffectCheck = ColorOverlayEffectCheck;
