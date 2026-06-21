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
exports.ImageInterpolationCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImageInterpolationCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-interpolation-check.md',
    description: 'Exercise caution when applying ImageInterpolation.None, which may cause significant aliasing.'
};
class ImageInterpolationCheck {
    metaData = gMetaData;
    NONE = 'None';
    IMAGE = 'ImageAttribute';
    INTERPOLATION = 'interpolation';
    ABOUTTOAPPEAR = 'aboutToAppear';
    IMAGEINTERPOLATION = 'ImageInterpolation';
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        if (arkFile.getFilePath().endsWith('.ets')) {
            for (let clazz of arkFile.getClasses()) {
                this.classProcess(clazz);
            }
            for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
                for (let clazz of namespace.getClasses()) {
                    this.classProcess(clazz);
                }
            }
        }
    };
    classProcess(clazz) {
        for (let method of clazz.getMethods()) {
            const stmts = method.getCfg()?.getStmts() ?? [];
            for (const stmt of stmts) {
                this.stmtProcess(stmt);
            }
        }
    }
    stmtProcess(stmt) {
        const invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        const declaringClassName = invoker?.getMethodSignature().getDeclaringClassSignature().getClassName() ?? '';
        const interfaceName = invoker?.getMethodSignature().getMethodSubSignature().getMethodName() ?? '';
        if (interfaceName !== this.INTERPOLATION || declaringClassName !== this.IMAGE) {
            return;
        }
        const args = invoker?.getArgs();
        if (!args || args.length === 0) {
            return;
        }
        const interProlationArg = args[0];
        if (interProlationArg instanceof lib_1.Local) {
            const argStmt = interProlationArg.getDeclaringStmt();
            if (argStmt instanceof lib_1.ArkAssignStmt) {
                const rightOp = argStmt.getRightOp();
                if (rightOp instanceof lib_1.ArkStaticFieldRef) {
                    this.staticFieldRefProcess(rightOp, stmt);
                }
                else if (rightOp instanceof lib_1.ArkInstanceFieldRef) {
                    this.instanceFieldRefProcess(rightOp, stmt);
                }
            }
        }
    }
    staticFieldRefProcess(rightOp, stmt) {
        const fieldName = rightOp.getFieldName();
        const className = rightOp.getFieldSignature().getBaseName();
        if (fieldName === this.NONE && className === this.IMAGEINTERPOLATION) {
            this.addIssueReport(stmt);
        }
    }
    instanceFieldRefProcess(rightOp, stmt) {
        const fieldSignature = rightOp.getFieldSignature();
        let hasImageInterpolationAssignment = false;
        const base = rightOp.getBase();
        const usedStmts = base.getUsedStmts();
        for (const usedStmt of usedStmts) {
            if (usedStmt instanceof lib_1.ArkAssignStmt) {
                hasImageInterpolationAssignment = this.usedStmtProcess(usedStmt, fieldSignature, stmt);
                if (hasImageInterpolationAssignment) {
                    break;
                }
            }
        }
        if (!hasImageInterpolationAssignment) {
            const aboutToAppear = stmt.getCfg().getDeclaringMethod().getDeclaringArkClass().getMethodWithName(this.ABOUTTOAPPEAR);
            const stmts = aboutToAppear?.getBody()?.getCfg().getStmts() ?? [];
            for (const aboutToAppearStmt of stmts) {
                hasImageInterpolationAssignment = this.aboutToAppearStmtProcess(fieldSignature, aboutToAppearStmt, stmt);
                if (hasImageInterpolationAssignment) {
                    break;
                }
            }
            if (!hasImageInterpolationAssignment) {
                const initField = aboutToAppear?.getDeclaringArkClass().getFieldWithName(fieldSignature.getFieldName());
                if (initField === null || initField === undefined) {
                    return;
                }
                for (const initStmt of initField.getInitializer()) {
                    this.initStmtProcess(initStmt, stmt, fieldSignature);
                }
            }
        }
    }
    usedStmtProcess(usedStmt, fieldSignature, stmt) {
        const usedLeftOp = usedStmt.getLeftOp();
        const usedRightOp = usedStmt.getRightOp();
        if (usedRightOp instanceof lib_1.Local && usedLeftOp instanceof lib_1.ArkInstanceFieldRef && fieldSignature === usedLeftOp.getFieldSignature()) {
            const arkArkAssignStmt = usedRightOp.getDeclaringStmt();
            if (arkArkAssignStmt instanceof lib_1.ArkAssignStmt) {
                return this.arkAssignStmtProcess(arkArkAssignStmt, stmt);
            }
        }
        else if (usedRightOp instanceof lib_1.ArkInstanceFieldRef && usedLeftOp instanceof lib_1.Local && fieldSignature === usedRightOp.getFieldSignature()) {
            const arkArkAssignStmt = usedLeftOp.getDeclaringStmt();
            if (arkArkAssignStmt instanceof lib_1.ArkAssignStmt) {
                return this.arkAssignStmtProcess(arkArkAssignStmt, stmt);
            }
        }
        return false;
    }
    aboutToAppearStmtProcess(fieldSignature, aboutToAppearStmt, stmt) {
        if (!(aboutToAppearStmt instanceof lib_1.ArkAssignStmt)) {
            return false;
        }
        const aboutToAppearLeftOp = aboutToAppearStmt.getLeftOp();
        if (aboutToAppearLeftOp instanceof lib_1.ArkInstanceFieldRef && aboutToAppearLeftOp.getFieldSignature() === fieldSignature) {
            const aboutToAppearRightOp = aboutToAppearStmt.getRightOp();
            if (aboutToAppearRightOp instanceof lib_1.Local) {
                const rightOpDeclaringStmt = aboutToAppearRightOp.getDeclaringStmt();
                if (rightOpDeclaringStmt && rightOpDeclaringStmt instanceof lib_1.ArkAssignStmt) {
                    this.arkAssignStmtProcess(rightOpDeclaringStmt, stmt);
                }
            }
            return true;
        }
        return false;
    }
    initStmtProcess(initStmt, stmt, fieldSignature) {
        if (initStmt instanceof lib_1.ArkAssignStmt) {
            const initLeftOp = initStmt.getLeftOp();
            const initRightOp = initStmt.getRightOp();
            if (initRightOp instanceof lib_1.Local && initLeftOp instanceof lib_1.ArkInstanceFieldRef && initLeftOp.getFieldSignature() === fieldSignature) {
                const initDeclaringStmt = initRightOp.getDeclaringStmt();
                if (initDeclaringStmt instanceof lib_1.ArkAssignStmt) {
                    this.arkAssignStmtProcess(initDeclaringStmt, stmt);
                }
                return true;
            }
        }
        return false;
    }
    arkAssignStmtProcess(rightOpDeclaringStmt, stmt) {
        const aboutToAppearDeclaringStmtRight = rightOpDeclaringStmt.getRightOp();
        if (!(aboutToAppearDeclaringStmtRight instanceof lib_1.ArkStaticFieldRef)) {
            return false;
        }
        const aboutToAppearDeclaringStmtRightField = aboutToAppearDeclaringStmtRight.getFieldSignature();
        const classDeclaringSignature1 = aboutToAppearDeclaringStmtRightField.getDeclaringSignature();
        if (classDeclaringSignature1 instanceof lib_1.ClassSignature) {
            const imageInterpolationClassName1 = classDeclaringSignature1.getClassName();
            if (imageInterpolationClassName1 === this.IMAGEINTERPOLATION) {
                if (aboutToAppearDeclaringStmtRightField.getFieldName() === this.NONE) {
                    this.addIssueReport(stmt);
                }
                return true;
            }
        }
        return false;
    }
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(stmt) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        const originPosition = stmt.getOperandOriginalPosition(stmt.getDefAndUses().length - 1);
        if (arkFile && originPosition) {
            let line = originPosition?.getFirstLine();
            let endCol = originPosition?.getFirstCol() - 1;
            let startCol = endCol - this.INTERPOLATION.length;
            const originPath = arkFile.getFilePath();
            return { line, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ImageInterpolationCheck = ImageInterpolationCheck;
