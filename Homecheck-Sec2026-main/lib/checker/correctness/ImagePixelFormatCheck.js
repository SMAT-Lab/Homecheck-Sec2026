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
exports.ImagePixelFormatCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImagePixelFormatCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-pixel-format-check.md',
    description: 'Exercise caution when using the RGB_565 format, which can result in unexpected color banding.'
};
class ImagePixelFormatCheck {
    metaData = gMetaData;
    CREATEPIXELMAP = 'createPixelMap';
    INITIALIZATIONOPTIONS = 'InitializationOptions';
    DECODINGOPTIONS = 'DecodingOptions';
    PIXELFORMAT = 'pixelFormat';
    DESIREDPIXELFORMAT = 'desiredPixelFormat';
    rule;
    defects = [];
    issues = [];
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (target) => {
        const stmts = target.getCfg()?.getStmts() ?? [];
        for (const stmt of stmts) {
            this.stmtProcess(stmt);
        }
    };
    stmtProcess(stmt) {
        const invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        const methodSignature = invoker?.getMethodSignature();
        if (!methodSignature) {
            return;
        }
        const methodSubSignature = methodSignature.getMethodSubSignature();
        const interfaceName = methodSubSignature.getMethodName() ?? '';
        if (interfaceName !== this.CREATEPIXELMAP) {
            return;
        }
        const args = invoker?.getArgs();
        if (!args || args.length === 0) {
            return;
        }
        const createPixelMapParameterTypes = methodSubSignature.getParameterTypes();
        for (let index = 0; index < createPixelMapParameterTypes.length; index++) {
            const createPixelMapParameterType = createPixelMapParameterTypes[index];
            if (createPixelMapParameterType instanceof lib_1.ClassType) {
                const parameterTypeClassName = createPixelMapParameterType.getClassSignature().getClassName();
                const createPixelMapArg = args[index];
                const firstArgStmt = args[0];
                if (parameterTypeClassName === this.INITIALIZATIONOPTIONS || parameterTypeClassName === this.DECODINGOPTIONS) {
                    this.argProcess(createPixelMapArg, firstArgStmt, stmt);
                }
            }
        }
    }
    argProcess(createPixelMapArg, firstArgStmt, stmt) {
        if (createPixelMapArg instanceof lib_1.Local) {
            const argStmt = createPixelMapArg.getDeclaringStmt();
            if (argStmt instanceof lib_1.ArkAssignStmt) {
                const rightOp = argStmt.getRightOp();
                if (rightOp instanceof lib_1.ArkNewExpr) {
                    const newClassSignature = rightOp.getClassType().getClassSignature();
                    this.newExperProcess(newClassSignature, stmt);
                }
                else if (rightOp instanceof lib_1.Local) {
                    this.argProcess(rightOp, firstArgStmt, stmt);
                }
                else if (rightOp instanceof lib_1.ArkInstanceInvokeExpr) {
                    this.arkInstanceInvokeExprProcess(rightOp, firstArgStmt, stmt);
                }
            }
        }
    }
    newExperProcess(newClassSignature, stmt) {
        const newClass = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile().getScene().getClass(newClassSignature);
        const pixelFormatField = newClass?.getFieldWithName(this.PIXELFORMAT) ?? newClass?.getFieldWithName(this.DESIREDPIXELFORMAT);
        if (pixelFormatField === null || pixelFormatField === undefined) {
            return;
        }
        const initializerStmts = pixelFormatField.getInitializer();
        if (initializerStmts.length === 0) {
            return;
        }
        const initializerStmt = initializerStmts[initializerStmts.length - 1];
        if (!(initializerStmt instanceof lib_1.ArkAssignStmt)) {
            return;
        }
        const initRightOp = initializerStmt.getRightOp();
        if (initRightOp instanceof Constant_1.NumberConstant && initRightOp.getValue() === '2') {
            this.addIssueReport(stmt);
        }
        else if (initRightOp instanceof lib_1.Local) {
            const initDeclaringStmt = initRightOp.getDeclaringStmt();
            if (initDeclaringStmt instanceof lib_1.ArkAssignStmt) {
                const initAssignRightOp = initDeclaringStmt.getRightOp();
                if (initAssignRightOp instanceof lib_1.ArkStaticFieldRef && initAssignRightOp.getFieldName() === 'RGB_565') {
                    this.addIssueReport(stmt);
                }
            }
        }
    }
    arkInstanceInvokeExprProcess(rightOp, firstArgStmt, stmt) {
        const returnType = rightOp.getMethodSignature().getMethodSubSignature().getReturnType();
        if (returnType instanceof lib_1.ClassType && returnType.getClassSignature().getClassName() === this.DECODINGOPTIONS) {
            const arkMethod = stmt.getCfg().getDeclaringMethod().getDeclaringArkClass().getMethod(rightOp.getMethodSignature());
            const decodingOptionsStmts = arkMethod?.getCfg()?.getStmts() ?? [];
            for (const decodingOptionsStmt of decodingOptionsStmts) {
                if (decodingOptionsStmt instanceof lib_1.ArkAssignStmt) {
                    this.arkAssignStmtProcess(decodingOptionsStmt, firstArgStmt, stmt);
                }
            }
        }
    }
    arkAssignStmtProcess(decodingOptionsStmt, firstArgStmt, stmt) {
        const decodingOptionsLeftOp = decodingOptionsStmt.getLeftOp();
        const decodingOptionsRightOp = decodingOptionsStmt.getRightOp();
        if (decodingOptionsLeftOp instanceof lib_1.Local && decodingOptionsRightOp instanceof lib_1.Local) {
            const leftType = decodingOptionsLeftOp.getType();
            const rightType = decodingOptionsRightOp.getType();
            if (leftType instanceof lib_1.ClassType && rightType instanceof lib_1.ClassType) {
                const leftClass = leftType.getClassSignature();
                const rightClass = rightType.getClassSignature();
                if (leftClass.getClassName() === this.DECODINGOPTIONS) {
                    this.newExperProcess(rightClass, stmt);
                }
            }
        }
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
        const originPosition = stmt.getOriginPositionInfo();
        if (arkFile && originPosition) {
            const line = originPosition?.getLineNo();
            const originalText = stmt.getOriginalText() ?? '';
            const startCol = originPosition.getColNo() + originalText.indexOf(this.CREATEPIXELMAP);
            const endCol = startCol + this.CREATEPIXELMAP.length;
            const originPath = arkFile.getFilePath();
            return { line, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ImagePixelFormatCheck = ImagePixelFormatCheck;
