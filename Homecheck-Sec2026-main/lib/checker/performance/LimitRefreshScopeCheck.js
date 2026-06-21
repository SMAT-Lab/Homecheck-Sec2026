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
exports.LimitRefreshScopeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'LimitRefreshScopeCheck');
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const cachedCountControls = ['Badge', 'Column', 'ColumnSplit', 'Counter', 'Flex', 'FlowItem', 'GridCol', 'GridRow',
    'Grid', 'GridItem', 'List', 'ListItem', 'ListItemGroup', 'Navigator', 'Panel', 'Refresh', 'RelativeContainer', 'Row', 'RowSplit',
    'Scroll', 'SideBarContainer', 'Stack', 'Swiper', 'Tabs', 'TabContent', 'WaterFlow'];
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/limit-refresh-scope-check.md',
    description: 'Add a container to the if statement to reduce the refresh range.'
};
class LimitRefreshScopeCheck {
    metaData = gMetaData;
    IF = 'If';
    CREATE = 'create';
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
        if (!viewTreeTool.hasTraverse(target)) {
            let viewTreeRoot = target.getViewTree()?.getRoot();
            if (!viewTreeRoot) {
                return;
            }
            this.traverseViewTree(viewTreeRoot);
        }
    };
    traverseViewTree(viewTreeRoot) {
        if (viewTreeTool.hasTraverse(viewTreeRoot)) {
            return;
        }
        let name = viewTreeRoot.name;
        if (name === this.IF) {
            if (this.checkParentNode(viewTreeRoot.parent)) {
                return;
            }
            for (let [key, vals] of viewTreeRoot.attributes) {
                if (key !== this.CREATE) {
                    continue;
                }
                let stmt = this.getWarnInfoByVals(vals);
                if (!stmt) {
                    continue;
                }
                this.addIssueReport(name, stmt);
                break;
            }
        }
        if (viewTreeRoot.children.length > 0) {
            for (let child of viewTreeRoot.children) {
                this.traverseViewTree(child);
            }
        }
    }
    checkParentNode(node) {
        if (!node) {
            return false;
        }
        let children = node.children;
        if (children.length !== 1) {
            return false;
        }
        let parentName = node.name;
        if (cachedCountControls.includes(parentName)) {
            return true;
        }
        else {
            return this.checkParentNode(node.parent);
        }
    }
    getWarnInfoByVals(vals) {
        let stmt = null;
        for (let val of vals) {
            if (val instanceof lib_1.ArkAssignStmt) {
                stmt = val;
            }
        }
        return stmt;
    }
    addIssueReport(name, stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(name, stmt);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(name, stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originPosition = stmt.getOriginPositionInfo();
            const lineNum = originPosition.getLineNo();
            const startCol = originPosition.getColNo();
            const endCol = startCol + name.length - 1;
            const originPath = arkFile.getFilePath();
            return { lineNum, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.LimitRefreshScopeCheck = LimitRefreshScopeCheck;
