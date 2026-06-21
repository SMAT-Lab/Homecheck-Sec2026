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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GifHardwareDecodingCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Index_1 = require("../../Index");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const gifComponentOptionsTypeStrList = [
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponentV2.ets: GIFComponentV2.ControllerOptions`,
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponent.ets: GIFComponent.ControllerOptions`
];
const gifComponentOptionsNewTypeStrList = [
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponentV2.ets: GIFComponentV2.ControllerOptions.constructor()`,
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponent.ets: GIFComponent.ControllerOptions.constructor()`
];
const gifOptionSetOpenHarwareStrList = [
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponentV2.ets: GIFComponentV2.ControllerOptions.setOpenHardware(boolean)`,
    `@thirdParty/@ohos/gif-drawable/src/main/ets/components/gif/display/GIFComponent.ets: GIFComponent.ControllerOptions.setOpenHardware(boolean)`
];
let gifLibVersion = 'unknown';
let hardwareVersionList = ['2.1.1-rc.0'];
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'GifHardwareDecodingCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/gif-hardware-decoding-check.md',
    description: 'Enable hardware decoding for GIF images.'
};
class GifHardwareDecodingCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (arkFile) => {
        if (gifLibVersion === 'unknown') {
            gifLibVersion = this.getGifDrawableVersion(arkFile.getScene());
        }
        const gifOptionsList = [];
        let hasImportGifDrawable = false;
        for (let importInfo of arkFile.getImportInfos()) {
            let form = importInfo.getFrom();
            if (form && form === '@ohos/gif-drawable') {
                hasImportGifDrawable = true;
                break;
            }
        }
        let hasViewTree = false;
        for (let clazz of arkFile.getClasses()) {
            if (clazz.hasViewTree()) {
                hasViewTree = true;
                break;
            }
        }
        if (hasImportGifDrawable && hasViewTree) {
            this.processArkFile(arkFile, gifOptionsList);
        }
        let isDefaultHardware = this.isDefaultHardwareVersion(gifLibVersion);
        for (let optionInfo of gifOptionsList) {
            if (isDefaultHardware === undefined && isDefaultHardware) {
                if (optionInfo.setStmt && !optionInfo.openHardware) {
                    this.reportIssue(optionInfo.optionInfo);
                }
            }
            else {
                if (!optionInfo.openHardware) {
                    this.reportIssue(optionInfo.optionInfo);
                }
            }
        }
    };
    isDefaultHardwareVersion(version) {
        if (version === '') {
            return undefined;
        }
        if (hardwareVersionList.includes(version)) {
            return true;
        }
        const checkVersion = (ver, baseVersion) => {
            const arr = this.getVersionResult(ver, baseVersion);
            return arr.some((value) => value > 0);
        };
        if (version.startsWith('~')) {
            const ver = this.getMaJarVersion(version);
            return checkVersion(ver, '2.2.0');
        }
        else if (version.startsWith('^')) {
            const ver = this.getMaJarVersion(version);
            return checkVersion(ver, '3.0.0');
        }
        else {
            let majarVersion = version;
            let rcVersion = '';
            if (version.includes('-')) {
                const vers = version.split('-');
                majarVersion = vers[0];
                rcVersion = vers[1].split('.')[1];
            }
            const arr = this.getVersionResult(majarVersion, '2.1.1');
            if (rcVersion !== '') {
                arr.push(Number(rcVersion));
            }
            else {
                arr.push(0);
            }
            return arr.some((value) => value > 0);
        }
    }
    getVersionResult(ver1, ver2) {
        let cmps = [];
        let ver1s = ver1.split('.');
        let ver2s = ver2.split('.');
        for (let i = 0; i < ver1s.length; i++) {
            let num1 = Number(ver1s[i]);
            let num2 = Number(ver2s[i]);
            cmps.push(num1 - num2);
        }
        return cmps;
    }
    getMaJarVersion(version) {
        let ver = version;
        if (version.startsWith('~')) {
            ver = version.replace('~', '');
        }
        else if (version.startsWith('^')) {
            ver = version.replace('^', '');
        }
        if (ver.includes('-')) {
            ver = ver.split('-')[0];
        }
        return ver;
    }
    processArkFile(arkFile, gifOptionsList) {
        for (let clazz of arkFile.getClasses()) {
            if (!clazz.hasViewTree()) {
                continue;
            }
            for (let field of clazz.getFields()) {
                let typeStr = field.getType().toString();
                if (gifComponentOptionsTypeStrList.includes(typeStr)) {
                    let variableInfo = { optionInfo: field, setStmt: null, openHardware: false };
                    gifOptionsList.push(variableInfo);
                }
            }
            this.processArkMethod(clazz, gifOptionsList);
        }
    }
    processArkMethod(clazz, gifOptionsList) {
        for (let method of clazz.getMethods()) {
            let stmts = method.getCfg()?.getStmts() ?? [];
            for (let stmt of stmts) {
                this.processStmt(stmt, gifOptionsList);
            }
        }
    }
    processStmt(stmt, gifOptionsList) {
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            this.processAssignStmt(stmt, gifOptionsList);
        }
        let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return;
        }
        let methodSignature = invokeExpr.getMethodSignature();
        let methodSignatureStr = methodSignature.toString();
        if (gifComponentOptionsNewTypeStrList.includes(methodSignatureStr)) {
            this.getGifOptionInfo(invokeExpr, gifOptionsList);
        }
        if (gifOptionSetOpenHarwareStrList.includes(methodSignatureStr)) {
            this.processGifOptionInfoIfHardwareDecode(invokeExpr, gifOptionsList, stmt);
        }
    }
    processGifOptionInfoIfHardwareDecode(invokeExpr, gifOptionsList, stmt) {
        if (this.isHardwareDecode(invokeExpr.getArg(0))) {
            this.processGifOptionInfo(invokeExpr, gifOptionsList, stmt);
        }
    }
    processGifOptionInfo(invokeExpr, gifOptionsList, stmt) {
        if (invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let base = invokeExpr.getBase();
            let realBase = this.getRealBase(base);
            if (!realBase) {
                return;
            }
            for (let gifOptionInfo of gifOptionsList) {
                if (realBase instanceof arkanalyzer_1.Local && gifOptionInfo.optionInfo instanceof arkanalyzer_1.Local &&
                    realBase.getName() === gifOptionInfo.optionInfo.getName()) {
                    gifOptionInfo.openHardware = true;
                    gifOptionInfo.setStmt = stmt;
                }
                else if (realBase instanceof arkanalyzer_1.AbstractFieldRef && gifOptionInfo.optionInfo instanceof arkanalyzer_1.ArkField &&
                    realBase.getFieldSignature().toString() === gifOptionInfo.optionInfo.getSignature().toString()) {
                    gifOptionInfo.openHardware = true;
                    gifOptionInfo.setStmt = stmt;
                }
            }
        }
    }
    getRealBase(base) {
        if (!base.getName().includes('%')) {
            return base;
        }
        let declaringStmt = base.getDeclaringStmt();
        if (declaringStmt && declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let rightOp = declaringStmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                return rightOp;
            }
            if (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                return this.getRealBase(rightOp.getBase());
            }
        }
        return null;
    }
    isHardwareDecode(arg) {
        if (arg instanceof Constant_1.BooleanConstant) {
            return arg.getValue() === 'true';
        }
        return false;
    }
    getGifOptionInfo(invokeExpr, gifOptionsList) {
        if (!(invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return;
        }
        let base = invokeExpr.getBase();
        let usedStmts = base.getUsedStmts();
        for (let stmt of usedStmts) {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = stmt.getRightOp();
            let leftOp = stmt.getLeftOp();
            if (rightOp === base && leftOp instanceof arkanalyzer_1.Local) {
                let variableInfo = { optionInfo: leftOp, setStmt: null, openHardware: false };
                gifOptionsList.push(variableInfo);
            }
        }
    }
    processAssignStmt(stmt, gifOptionsList) {
        let leftOp = stmt.getLeftOp();
        let rightOp = stmt.getRightOp();
        let typeStr = leftOp.getType().toString();
        if (gifComponentOptionsTypeStrList.includes(typeStr)) {
            let rightOptionInfo = this.getRightOptionInfo(rightOp, gifOptionsList);
            if (rightOptionInfo[0]) {
                this.updateLeftOptionHardware(leftOp, gifOptionsList, rightOptionInfo);
            }
        }
    }
    updateLeftOptionHardware(leftOp, gifOptionsList, rightOptionInfo) {
        for (let gifOptionInfo of gifOptionsList) {
            if (leftOp instanceof arkanalyzer_1.Local && gifOptionInfo.optionInfo instanceof arkanalyzer_1.Local &&
                leftOp.getName() === gifOptionInfo.optionInfo.getName()) {
                gifOptionInfo.openHardware = true;
                gifOptionInfo.setStmt = rightOptionInfo[1];
            }
            else if (leftOp instanceof arkanalyzer_1.AbstractFieldRef && gifOptionInfo.optionInfo instanceof arkanalyzer_1.ArkField &&
                leftOp.getFieldSignature().toString() === gifOptionInfo.optionInfo.getSignature().toString()) {
                gifOptionInfo.openHardware = true;
                gifOptionInfo.setStmt = rightOptionInfo[1];
            }
        }
    }
    getRightOptionInfo(rightOp, gifOptionsList) {
        for (let gifOptionInfo of gifOptionsList) {
            if (rightOp instanceof arkanalyzer_1.Local && gifOptionInfo.optionInfo instanceof arkanalyzer_1.Local &&
                rightOp.getName() === gifOptionInfo.optionInfo.getName()) {
                return [gifOptionInfo.openHardware, gifOptionInfo.setStmt];
            }
            else if (rightOp instanceof arkanalyzer_1.AbstractFieldRef && gifOptionInfo.optionInfo instanceof arkanalyzer_1.ArkField &&
                rightOp.getFieldSignature().toString() === gifOptionInfo.optionInfo.getSignature().toString()) {
                return [gifOptionInfo.openHardware, gifOptionInfo.setStmt];
            }
        }
        return [false, null];
    }
    getGifDrawableVersion(sence) {
        let ohPkgContent = sence.getOhPkgContent();
        let deps = ohPkgContent['dependencies'];
        if (!deps) {
            return '';
        }
        let version = deps['@ohos/gif-drawable'];
        if (!version) {
            return '';
        }
        let depVersion = version;
        const libOhPkgFilePath = path_1.default.join(sence.getRealProjectDir(), 'oh_modules', '@ohos', 'gif-drawable', 'oh-package.json5');
        if (fs_1.default.existsSync(libOhPkgFilePath)) {
            let libOhPkgContent = (0, arkanalyzer_1.fetchDependenciesFromFile)(libOhPkgFilePath);
            depVersion = libOhPkgContent['version'];
        }
        else {
            logger.debug('Lib oh-package.json5 is not exist, please check!');
        }
        return depVersion;
    }
    reportIssue(optionInfo) {
        let lineNum = -1;
        let startColum = -1;
        let endColumn = -1;
        let filePath = '';
        if (optionInfo instanceof arkanalyzer_1.ArkField) {
            let positionInfo = optionInfo.getOriginPosition();
            lineNum = positionInfo.getLineNo();
            let fieldName = optionInfo.getName();
            let lineCode = optionInfo.getCode();
            startColum = positionInfo.getColNo() + lineCode.indexOf(fieldName);
            endColumn = startColum + fieldName.length - 1;
            let arkFile = optionInfo.getDeclaringArkClass().getDeclaringArkFile();
            filePath = arkFile.getFilePath();
        }
        else {
            let keyword = optionInfo.getName();
            let declaringStmt = optionInfo.getDeclaringStmt();
            if (!declaringStmt) {
                return;
            }
            let originalPosition = declaringStmt.getOriginPositionInfo();
            let text = declaringStmt.getOriginalText() ?? '';
            lineNum = originalPosition.getLineNo();
            startColum = originalPosition.getColNo() + text.indexOf(keyword);
            endColumn = startColum + keyword.length - 1;
            let arkFile = declaringStmt.getCfg().getDeclaringMethod().getDeclaringArkFile();
            filePath = arkFile.getFilePath();
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
    }
}
exports.GifHardwareDecodingCheck = GifHardwareDecodingCheck;
