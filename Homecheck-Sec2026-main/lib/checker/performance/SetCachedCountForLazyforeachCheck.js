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
exports.SetCachedCountForLazyforeachCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'SetCachedCountForLazyforeachCheck');
let warnInfo = { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
const cacheCountControls = ['Grid', 'List', 'Swiper', 'WaterFlow'];
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/set-cached-count-for-lazyforeach-check.md',
    description: 'Set cachedCount to preloaded items to achieve better scrolling experience.'
};
;
class SetCachedCountForLazyforeachCheck {
    metaData = gMetaData;
    CREATE = 'create';
    CACHED_COUNT = 'cachedCount';
    LAZY_FOREACH = 'LazyForEach';
    usedComponentMap = new Map();
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
        let fileSignature = target.getDeclaringArkFile().getFileSignature();
        if (!viewTreeTool.hasTraverse(target)) {
            let viewTreeRoot = target.getViewTree()?.getRoot();
            if (!viewTreeRoot) {
                return;
            }
            this.traverseViewTree(viewTreeRoot, fileSignature);
        }
    };
    traverseViewTree(viewTreeRoot, fileSignature) {
        let hasCachedCount = false;
        let hasLazyForeach = false;
        if (viewTreeRoot === undefined) {
            return;
        }
        let name = viewTreeRoot.name;
        if (cacheCountControls.includes(name)) {
            hasLazyForeach = this.isLazyForeach(viewTreeRoot);
            if (!hasLazyForeach) {
                return;
            }
            for (let [key, vals] of viewTreeRoot.attributes) {
                if (key === this.CREATE) {
                    this.getWarnInfoByVals(name, vals);
                }
                else if (key === this.CACHED_COUNT) {
                    hasCachedCount = true;
                }
            }
            if (!hasCachedCount) {
                this.addIssueReport(this.issues);
            }
        }
        if (viewTreeRoot.children.length > 0) {
            this.traverseViewTreeByChild(viewTreeRoot, fileSignature);
        }
    }
    traverseViewTreeByChild(viewTreeRoot, fileSignature) {
        for (let child of viewTreeRoot.children) {
            let signature = child.signature;
            if (signature && signature instanceof lib_1.ClassSignature) {
                if (fileSignature !== signature.getDeclaringFileSignature() || this.usedComponentMap.has(signature)) {
                    continue;
                }
                this.usedComponentMap.set(signature, signature.getClassName());
            }
            else if (signature && signature instanceof lib_1.MethodSignature) {
                if (this.usedComponentMap.has(signature)) {
                    continue;
                }
                this.usedComponentMap.set(signature, signature.getMethodSubSignature().getMethodName());
            }
            this.traverseViewTree(child, fileSignature);
            if (signature && signature instanceof lib_1.ClassSignature) {
                this.usedComponentMap.delete(signature);
            }
        }
    }
    isLazyForeach(viewTreeRoot) {
        for (let child of viewTreeRoot.children) {
            let signature = child.signature;
            if (signature) {
                if (this.usedComponentMap.has(signature)) {
                    continue;
                }
                if (signature instanceof lib_1.ClassSignature) {
                    this.usedComponentMap.set(signature, signature.getClassName());
                }
                else if (signature instanceof lib_1.MethodSignature) {
                    this.usedComponentMap.set(signature, signature.getMethodSubSignature().getMethodName());
                }
            }
            if (this.isLazyForeachByChild(child)) {
                return true;
            }
            if (signature && signature instanceof lib_1.ClassSignature) {
                this.usedComponentMap.delete(signature);
            }
        }
        return false;
    }
    isLazyForeachByChild(child) {
        if (child.name === this.LAZY_FOREACH) {
            return true;
        }
        else if (child.children.length > 0) {
            for (let subChild of child.children) {
                if (this.isLazyForeach(subChild)) {
                    return true;
                }
            }
        }
        return false;
    }
    getWarnInfoByVals(name, vals) {
        for (let val of vals) {
            if (val instanceof lib_1.ArkAssignStmt) {
                this.getWarnInfo(name, val);
                break;
            }
        }
    }
    getWarnInfo(name, stmt) {
        const arkFile = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originPosition = stmt.getOriginPositionInfo();
            warnInfo.lineNum = originPosition.getLineNo();
            warnInfo.startCol = originPosition.getColNo();
            warnInfo.endCol = warnInfo.startCol + name.length - 1;
            warnInfo.filePath = arkFile.getFilePath();
        }
    }
    addIssueReport(issues) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (warnInfo.lineNum !== -1 && !this.isExistIssueReport(issues)) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    isExistIssueReport(defects) {
        for (let defect of defects) {
            if (defect.defect.mergeKey.substring(1, defect.defect.mergeKey.indexOf('%')) === warnInfo.filePath &&
                defect.defect.reportLine === warnInfo.lineNum && defect.defect.reportColumn === warnInfo.startCol) {
                return true;
            }
        }
        return false;
    }
}
exports.SetCachedCountForLazyforeachCheck = SetCachedCountForLazyforeachCheck;
