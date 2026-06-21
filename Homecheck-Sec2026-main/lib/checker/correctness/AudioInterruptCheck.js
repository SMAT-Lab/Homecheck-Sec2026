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
exports.AudioInterruptCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const VarInfo_1 = require("../../model/VarInfo");
const StringUtils_1 = require("../../utils/checker/StringUtils");
const Defects_1 = require("../../model/Defects");
const multimediaAPI8CreateSignList = [
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioRenderer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRendererOptions, @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRenderer>)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioRenderer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRendererOptions, @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRenderer,void>)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioRenderer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRendererOptions)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioCapturer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturerOptions, @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturer>)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioCapturer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturerOptions)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAudioCapturer(@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturerOptions, @ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturer,void>)`
];
const multimediaAPI9CreateSignList = [
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAVPlayer(@ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer>)`,
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAVPlayer()`,
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.${arkanalyzer_1.DEFAULT_ARK_CLASS_NAME}.createAVPlayer(@ohosSdk/api/@ohos.base.d.ts: AsyncCallback<@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer,void>)`
];
const multimediaAPI11CreateSignList = [
    `@ohosSdk/api/@ohos.multimedia.audioHaptic.d.ts: audioHaptic.AudioHapticManager.createPlayer(number, AudioHapticPlayerOptions)`,
    `@ohosSdk/api/@ohos.multimedia.audioHaptic.d.ts: audioHaptic.AudioHapticManager.createPlayer(number, @ohosSdk/api/@ohos.multimedia.audioHaptic.d.ts: audioHaptic.AudioHapticPlayerOptions)`
];
const multimediaInterruptSignList = [
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer.on('audioInterrupt', @ohosSdk/api/@ohos.base.d.ts: Callback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.InterruptEvent>)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRenderer.on('audioInterrupt', @ohosSdk/api/@ohos.base.d.ts: Callback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.InterruptEvent>)`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturer.on('audioInterrupt', @ohosSdk/api/@ohos.base.d.ts: Callback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.InterruptEvent>)`,
    `@ohosSdk/api/@ohos.multimedia.audioHaptic.d.ts: audioHaptic.AudioHapticPlayer.on('audioInterrupt', @ohosSdk/api/@ohos.base.d.ts: Callback<@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.InterruptEvent>)`
];
const multimediaTypeList = [
    `@ohosSdk/api/@ohos.multimedia.media.d.ts: media.AVPlayer`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRenderer`,
    `@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioCapturer`,
    `@ohosSdk/api/@ohos.multimedia.audioHaptic.d.ts: audioHaptic.AudioHapticPlayer`
];
const AUDIO_INTERRUPT = 'audioInterrupt';
const multimediaInterruptStmtList = new Set();
const multimediaCreateList = [];
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AudioInterruptCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/audio-interrupt-check.md',
    description: 'When implementing audio playback or recording features in your app, make sure it listens for audio focus changes and acts accordingly.'
};
var UseType;
(function (UseType) {
    UseType[UseType["CALLBACK"] = 0] = "CALLBACK";
    UseType[UseType["PROMISE_THEN"] = 1] = "PROMISE_THEN";
    UseType[UseType["PROMISE_AWIT"] = 2] = "PROMISE_AWIT";
    UseType[UseType["UNKNOWN"] = 3] = "UNKNOWN";
})(UseType || (UseType = {}));
class AudioInterruptCheck {
    metaData = gMetaData;
    rule;
    issues = [];
    registerMatchers() {
        const matchBuildCb = {
            matcher: undefined,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (scene) => {
        for (let arkFile of scene.getFiles()) {
            this.processClass(arkFile);
        }
        this.commonInvokerMatch();
        for (let cmi of multimediaCreateList) {
            if (!cmi.interruptInfo) {
                let targetArkFile = cmi.createStmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
                if (!targetArkFile) {
                    continue;
                }
                this.reportIssue(targetArkFile, cmi.createStmt, cmi.methodName);
            }
        }
    };
    processClass(arkFile) {
        for (let clazz of arkFile.getClasses()) {
            for (let mtd of clazz.getMethods()) {
                this.processArkMethod(arkFile, mtd);
            }
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                for (let mtd of clazz.getMethods()) {
                    this.processArkMethod(arkFile, mtd);
                }
            }
        }
    }
    processArkMethod(arkFile, method) {
        let busyMethods = new Set();
        let stmts = method.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        for (let i = 0; i < stmts.length; i++) {
            let stmt = stmts[i];
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoker) {
                continue;
            }
            const methodSignature = invoker.getMethodSignature();
            const methodName = methodSignature.getMethodSubSignature().getMethodName();
            if (this.isAudioInterruptStmt(arkFile, stmt, invoker)) {
                multimediaInterruptStmtList.add(stmt);
                continue;
            }
            if (!this.isMultimediaCreateStmt(stmt)) {
                continue;
            }
            let createInfo = {
                methodName: methodName,
                createStmt: stmt,
                varInfo: null,
                fieldInfo: null,
                interruptInfo: null
            };
            multimediaCreateList.push(createInfo);
            if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
                let callbackMethod = this.getInvokeCallbackMethod(arkFile, stmt, methodName);
                if (!callbackMethod) {
                    continue;
                }
                busyMethods.add(methodSignature);
                this.processCallbackMethod(arkFile, callbackMethod, 0, createInfo, busyMethods, UseType.CALLBACK);
                continue;
            }
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let leftOp = stmt.getLeftOp();
                if (this.isAwaitReturnStmt(stmt)) {
                    this.processCallbackMethod(arkFile, method, i, createInfo, busyMethods, UseType.PROMISE_AWIT);
                    continue;
                }
                let thenCallbackMethod = this.getPromiseThenCallbackMethod(arkFile, leftOp);
                if (!thenCallbackMethod) {
                    continue;
                }
                busyMethods.add(thenCallbackMethod.getSignature());
                this.processCallbackMethod(arkFile, thenCallbackMethod, 0, createInfo, busyMethods, UseType.PROMISE_THEN);
            }
        }
    }
    isAwaitReturnStmt(stmt) {
        let leftOp = stmt.getLeftOp();
        if (!(leftOp instanceof arkanalyzer_1.Local)) {
            return false;
        }
        if (!leftOp.getName().includes('%')) {
            return false;
        }
        let usedStmts = leftOp.getUsedStmts();
        for (let usedStmt of usedStmts) {
            if (!(usedStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = usedStmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkAwaitExpr) {
                return true;
            }
        }
        return false;
    }
    getPromiseThenCallbackMethod(arkFile, leftOp) {
        if (!(leftOp instanceof arkanalyzer_1.Local)) {
            return null;
        }
        let usedStmts = leftOp.getUsedStmts();
        if (usedStmts.length === 0) {
            return null;
        }
        let firstStmt = usedStmts[0];
        let thenInvoker = Index_1.CheckerUtils.getInvokeExprFromStmt(firstStmt);
        if (!thenInvoker) {
            return null;
        }
        let methodSignature = thenInvoker.getMethodSignature();
        let thenMethodName = methodSignature.getMethodSubSignature().getMethodName();
        if (thenMethodName !== 'then') {
            return null;
        }
        let args = thenInvoker.getArgs();
        if (args.length === 0) {
            return null;
        }
        let thenArg = args[0];
        if (!(thenArg instanceof arkanalyzer_1.Local)) {
            return null;
        }
        let thenArgType = thenArg.getType();
        if (!(thenArgType instanceof arkanalyzer_1.FunctionType)) {
            return null;
        }
        return arkFile.getScene().getMethod(thenArgType.getMethodSignature());
    }
    processCallbackMethod(arkFile, callbackMethod, index, createInfo, busyMethods, useType) {
        let stmts = callbackMethod.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        for (let i = index; i < stmts.length; i++) {
            let stmt = stmts[i];
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt && this.isInstanceAssignToVariable(callbackMethod, stmt, useType)) {
                this.parseRealAttachInstance(callbackMethod, stmt, createInfo, useType);
            }
            else if (stmt instanceof arkanalyzer_1.ArkInvokeStmt && this.isResolveAssignToVariable(arkFile, stmt, useType)) {
                let invokeExpr = stmt.getInvokeExpr();
                if (!(invokeExpr instanceof arkanalyzer_1.ArkPtrInvokeExpr)) {
                    continue;
                }
                let ptr = invokeExpr.getFuncPtrLocal();
                if (!(ptr instanceof arkanalyzer_1.ArkInstanceFieldRef)) {
                    continue;
                }
                let base = this.getFieldByBase(ptr.getBase());
                if (base && base instanceof arkanalyzer_1.Local) {
                    createInfo.varInfo = base;
                }
                else if (base && base instanceof arkanalyzer_1.ArkField) {
                    createInfo.varInfo = ptr.getBase();
                    createInfo.fieldInfo = base;
                }
            }
            let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invoker) {
                continue;
            }
            if (this.isAudioInterruptStmt(arkFile, stmt, invoker)) {
                this.parseInvokerAudioInterruptStmt(callbackMethod, stmt, invoker, createInfo, useType);
                continue;
            }
            for (let arg of invoker.getArgs()) {
                if (!this.isArgTypeMultimedia(callbackMethod, arg, useType)) {
                    continue;
                }
                let methodSignature = invoker.getMethodSignature();
                if (busyMethods.has(methodSignature)) {
                    continue;
                }
                busyMethods.add(methodSignature);
                let invokeChainMethod = arkFile.getScene().getMethod(methodSignature);
                if (!invokeChainMethod) {
                    continue;
                }
                this.processCallbackMethod(arkFile, invokeChainMethod, 0, createInfo, busyMethods, UseType.CALLBACK);
            }
        }
    }
    parseRealAttachInstance(callbackMethod, stmt, createInfo, useType) {
        let leftOp = stmt.getLeftOp();
        if (leftOp instanceof arkanalyzer_1.Local) {
            createInfo.varInfo = leftOp;
            let useStmts = leftOp.getUsedStmts();
            for (let usedStmt of useStmts) {
                if (!(usedStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                let usedLeftOp = usedStmt.getLeftOp();
                let usedRightOp = usedStmt.getRightOp();
                if (usedRightOp instanceof arkanalyzer_1.Local && usedRightOp.getName() === leftOp.getName()) {
                    this.parseRealAttachInstance(callbackMethod, usedStmt, createInfo, useType);
                }
                else if (usedLeftOp instanceof arkanalyzer_1.Local && usedRightOp instanceof arkanalyzer_1.ArkAwaitExpr) {
                    createInfo.varInfo = usedLeftOp;
                }
            }
        }
        else if (leftOp instanceof arkanalyzer_1.AbstractFieldRef) {
            createInfo.fieldInfo = callbackMethod.getDeclaringArkClass().getField(leftOp.getFieldSignature());
        }
        else {
            logger.debug('Process callback method unknown type.');
        }
    }
    isArgTypeMultimedia(callbackMethod, arg, useType) {
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let argType = arg.getType();
        if (multimediaTypeList.includes(argType.toString())) {
            return true;
        }
        if (argType instanceof arkanalyzer_1.UnionType) {
            for (let type of argType.getTypes()) {
                if (multimediaTypeList.includes(type.toString())) {
                    return true;
                }
            }
        }
        let declaringStmt = arg.getDeclaringStmt();
        let backTrackCount = 0;
        while (declaringStmt && backTrackCount < 12) {
            if (this.isMultimediaCreateStmt(declaringStmt)) {
                return true;
            }
            if (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let leftOpType = declaringStmt.getLeftOp().getType().toString();
                let rightOp = declaringStmt.getRightOp();
                let rightOpType = rightOp.getType().toString();
                if (multimediaTypeList.includes(leftOpType) || multimediaTypeList.includes(rightOpType)) {
                    return true;
                }
                if (rightOp instanceof arkanalyzer_1.Local) {
                    declaringStmt = rightOp.getDeclaringStmt();
                }
                else {
                    break;
                }
            }
            else {
                break;
            }
            backTrackCount++;
        }
        if (useType === UseType.CALLBACK || useType === UseType.PROMISE_THEN) {
            let parameter = callbackMethod.getParameters().find((param) => {
                return param.getName() === arg.getName();
            });
            return parameter !== undefined;
        }
        return false;
    }
    getInvokeCallbackMethod(arkFile, stmt, methodName) {
        let arg = null;
        if (methodName === 'createAVPlayer') {
            arg = stmt.getInvokeExpr().getArg(0);
        }
        else if (methodName === 'createAudioRenderer' || methodName === 'createAudioCapturer') {
            arg = stmt.getInvokeExpr().getArg(1);
        }
        if (!arg) {
            return null;
        }
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return null;
        }
        let type = arg.getType();
        if (!(type instanceof arkanalyzer_1.FunctionType)) {
            return null;
        }
        return arkFile.getScene().getMethod(type.getMethodSignature());
    }
    parseInvokerAudioInterruptStmt(callbackMethod, stmt, invoker, createInfo, useType) {
        if (!(invoker instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return;
        }
        let base = invoker.getBase();
        let baseInfo = this.getFieldByBase(base);
        if (!baseInfo) {
            logger.debug('Can not find invoker base.');
            return;
        }
        let localInfo = createInfo.varInfo;
        if (localInfo && baseInfo instanceof arkanalyzer_1.Local && baseInfo.getName() === localInfo.getName()) {
            createInfo.interruptInfo = stmt;
            return;
        }
        let fieldInfo = createInfo.fieldInfo;
        if (fieldInfo && baseInfo instanceof arkanalyzer_1.ArkField &&
            (fieldInfo.getSignature().toString() === baseInfo.getSignature().toString())) {
            createInfo.interruptInfo = stmt;
            return;
        }
        if (useType === UseType.CALLBACK || useType === UseType.PROMISE_THEN) {
            let targetParam = callbackMethod.getParameters().find((param) => param.getName() === baseInfo?.getName());
            if (targetParam) {
                createInfo.interruptInfo = stmt;
                return;
            }
        }
        if (baseInfo instanceof arkanalyzer_1.Local) {
            createInfo.varInfo = baseInfo;
        }
        else if (baseInfo instanceof arkanalyzer_1.AbstractFieldRef) {
            createInfo.fieldInfo = baseInfo;
        }
        multimediaInterruptStmtList.add(stmt);
        this.commonInvokerMatch();
    }
    getFieldByBase(base) {
        let callMethod = base.getDeclaringStmt()?.getCfg()?.getDeclaringMethod();
        if (!callMethod) {
            return base;
        }
        if (!base.getName().includes('%')) {
            if (callMethod.getBody()?.getLocals().has(base.getName())) {
                return base;
            }
        }
        else {
            let declaringStmt = base.getDeclaringStmt();
            if (!declaringStmt || !(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                return null;
            }
            let rightOp = declaringStmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                return callMethod.getDeclaringArkClass().getField(rightOp.getFieldSignature());
            }
            else if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
                let classSignature = rightOp.getFieldSignature().getDeclaringSignature();
                if (!(classSignature instanceof arkanalyzer_1.ClassSignature)) {
                    return null;
                }
                let targetClass = callMethod.getDeclaringArkFile().getScene().getClass(classSignature);
                if (!targetClass) {
                    return null;
                }
                return targetClass.getField(rightOp.getFieldSignature());
            }
            else {
                logger.debug('Temp variable unknown type, not implement.');
            }
        }
        return null;
    }
    commonInvokerMatch() {
        for (let cmi of multimediaCreateList) {
            if (cmi.interruptInfo) {
                continue;
            }
            for (let stmt of multimediaInterruptStmtList) {
                let invoker = stmt.getInvokeExpr();
                if (!invoker || !(invoker instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
                    continue;
                }
                let base = invoker.getBase();
                if (this.isInvokerAndStmtMatch(cmi, base)) {
                    cmi.interruptInfo = stmt;
                    break;
                }
            }
        }
    }
    isInvokerAndStmtMatch(cmi, base) {
        let baseInfo = this.getFieldByBase(base);
        if (!baseInfo) {
            return false;
        }
        let fieldInfo = cmi.fieldInfo;
        if (fieldInfo && (baseInfo instanceof arkanalyzer_1.ArkField) &&
            fieldInfo.getSignature().toString() === baseInfo.getSignature().toString()) {
            return true;
        }
        let localInfo = cmi.varInfo;
        if (localInfo && (baseInfo instanceof arkanalyzer_1.Local) && !baseInfo.getName().includes('%') &&
            localInfo.getName() === baseInfo.getName()) {
            return true;
        }
        let declaringStmt = base.getDeclaringStmt();
        while (declaringStmt && (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            let leftOp = declaringStmt.getLeftOp();
            if (leftOp instanceof arkanalyzer_1.Local && this.isDesignatedField(leftOp, declaringStmt, fieldInfo, localInfo)) {
                return true;
            }
            let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromAwaitStmt(declaringStmt);
            if (!invokeExpr) {
                return false;
            }
            let targetArkFile = declaringStmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
            if (!targetArkFile) {
                return false;
            }
            let invokeMethod = targetArkFile.getScene().getMethod(invokeExpr.getMethodSignature());
            if (!invokeMethod) {
                return false;
            }
            let returnOp = this.getReturnOp(invokeMethod);
            if (!returnOp) {
                return false;
            }
            declaringStmt = returnOp.getDeclaringStmt();
        }
        return false;
    }
    isDesignatedField(leftOp, declaringStmt, fieldInfo, localInfo) {
        if (leftOp.getName().includes('%')) {
            let rightOp = declaringStmt.getRightOp();
            if (fieldInfo && rightOp instanceof arkanalyzer_1.AbstractFieldRef &&
                rightOp.getFieldSignature().toString() === fieldInfo.getSignature().toString()) {
                return true;
            }
        }
        else {
            if (localInfo && localInfo.getName() === leftOp.getName()) {
                return true;
            }
            if (this.isMultimediaCreateStmt(declaringStmt)) {
                return true;
            }
        }
        return false;
    }
    getReturnOp(invokeMethod) {
        let blocks = invokeMethod.getCfg()?.getBlocks();
        if (!blocks) {
            return null;
        }
        for (let block of blocks) {
            let tailStmt = block.getTail();
            if (tailStmt && tailStmt instanceof arkanalyzer_1.ArkReturnStmt) {
                let returnOp = tailStmt.getOp();
                if (returnOp instanceof arkanalyzer_1.Local) {
                    return returnOp;
                }
            }
        }
        return null;
    }
    isResolveAssignToVariable(arkFile, stmt, useType) {
        const invoke = stmt.getInvokeExpr();
        if (!(invoke instanceof arkanalyzer_1.ArkPtrInvokeExpr)) {
            return false;
        }
        let fieldRef = invoke.getFuncPtrLocal();
        if (!(fieldRef instanceof arkanalyzer_1.AbstractFieldRef)) {
            return false;
        }
        let fieldName = fieldRef.getFieldName();
        if (fieldName !== 'resolve') {
            return false;
        }
        let declareSignature = fieldRef.getFieldSignature().getDeclaringSignature();
        let resolveClass = arkFile.getScene().getClass(declareSignature);
        if (!resolveClass) {
            return false;
        }
        let superClassName = resolveClass.getSuperClassName();
        if (superClassName === 'Promise<T>') {
            return true;
        }
        return false;
    }
    isInstanceAssignToVariable(callbackMethod, stmt, useType) {
        let rightOp = stmt.getRightOp();
        let rightType = rightOp.getType();
        if (this.typeProcess(useType, stmt, rightType, rightOp)) {
            return true;
        }
        if (!(rightOp instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let hasInLocal = callbackMethod.getBody()?.getLocals().has(rightOp.getName());
        if (!hasInLocal) {
            return false;
        }
        if (!this.isArgTypeMultimedia(callbackMethod, rightOp, useType)) {
            logger.debug('Maybe include middle variables, not implement.');
        }
        if (!(rightType instanceof arkanalyzer_1.UnknownType) && multimediaTypeList.includes(rightType.toString())) {
            return true;
        }
        let leftOp = stmt.getLeftOp();
        let leftType = leftOp.getType();
        let parameters = callbackMethod.getParameters();
        if (parameters.length === 0) {
            return false;
        }
        let parameterType = parameters[parameters.length - 1].getType();
        if (parameterType instanceof arkanalyzer_1.UnknownType && rightType instanceof arkanalyzer_1.UnknownType && leftType instanceof arkanalyzer_1.UnknownType) {
            return true;
        }
        else if (!(parameterType instanceof arkanalyzer_1.UnknownType) || !(rightType instanceof arkanalyzer_1.UnknownType) || !(leftOp instanceof arkanalyzer_1.AbstractFieldRef)) {
            return false;
        }
        if (!(leftType instanceof arkanalyzer_1.UnionType)) {
            return multimediaTypeList.includes(leftType.toString());
        }
        for (let type of leftType.getTypes()) {
            if (multimediaTypeList.includes(type.toString())) {
                return true;
            }
        }
        return false;
    }
    typeProcess(useType, stmt, rightType, rightOp) {
        if (useType === UseType.PROMISE_AWIT) {
            if (this.isAwaitReturnStmt(stmt) && this.isMultimediaCreateStmt(stmt)) {
                return true;
            }
        }
        if (useType !== UseType.CALLBACK && useType !== UseType.PROMISE_THEN) {
            if (multimediaTypeList.includes(rightType.toString())) {
                return true;
            }
        }
        return false;
    }
    isMultimediaCreateStmt(stmt) {
        let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invoker) {
            return false;
        }
        const methodSignature = invoker.getMethodSignature();
        const methodSignatureStr = methodSignature.toString();
        let apiVersion = Index_1.CheckerStorage.getInstance().getApiVersion();
        if (apiVersion < 8) {
            return false;
        }
        if (apiVersion < 9) {
            return multimediaAPI8CreateSignList.includes(methodSignatureStr);
        }
        if (apiVersion < 11) {
            return multimediaAPI8CreateSignList.includes(methodSignatureStr) || multimediaAPI9CreateSignList.includes(methodSignatureStr);
        }
        return multimediaAPI8CreateSignList.includes(methodSignatureStr) ||
            multimediaAPI9CreateSignList.includes(methodSignatureStr) || multimediaAPI11CreateSignList.includes(methodSignatureStr);
    }
    isAudioInterruptStmt(arkFile, stmt, invoker) {
        if (!this.isAudioInterruptSignature(arkFile, invoker)) {
            return false;
        }
        let args = invoker.getArgs();
        if (args.length === 0) {
            return false;
        }
        let arg0 = args[0];
        let varInfo = new VarInfo_1.VarInfo(stmt, stmt.scope);
        let interruptStr = StringUtils_1.StringUtils.getStringByScope(arkFile, varInfo, arg0);
        return interruptStr === AUDIO_INTERRUPT;
    }
    isAudioInterruptSignature(arkFile, invoker) {
        const methodSignature = invoker.getMethodSignature();
        const classSignatureStr = methodSignature.getDeclaringClassSignature().toString();
        if (!multimediaTypeList.includes(classSignatureStr)) {
            return false;
        }
        let methodName = methodSignature.getMethodSubSignature().getMethodName();
        if (methodName !== 'on') {
            return false;
        }
        let onArkMethod = arkFile.getScene().getMethod(methodSignature);
        if (!onArkMethod) {
            return false;
        }
        let declareSignatures = onArkMethod.getDeclareSignatures();
        if (!declareSignatures) {
            return false;
        }
        for (let declareSignature of declareSignatures) {
            let declareSignatureStr = declareSignature.toString();
            if (multimediaInterruptSignList.includes(declareSignatureStr)) {
                return true;
            }
        }
        return false;
    }
    reportIssue(arkFile, stmt, methodName) {
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        let methodNameIndex = text.indexOf(methodName);
        if (methodNameIndex === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColum = originalPosition.getColNo() + methodNameIndex;
        let endColum = startColum + methodName.length - 1;
        let filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AudioInterruptCheck = AudioInterruptCheck;
