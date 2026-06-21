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
exports.JsCodeCacheByInterceptionCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const VarInfo_1 = require("../../model/VarInfo");
const StringUtils_1 = require("../../utils/checker/StringUtils");
const Defects_1 = require("../../model/Defects");
const MIN_VERSION = 9;
const visitedMethod = new Set();
const customSchemeMap = new Map();
const schemeCmpMethods = ['startsWith', 'includes'];
const urlCmpMethods = ['endsWith', 'indexOf'];
let hasCustomSchemeCached = false;
const customizeSchemesSignatureStr = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebviewController.[static]customizeSchemes(@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebCustomScheme[])';
const webCustomSchemeSignatureStr = '@ohosSdk/api/@ohos.web.webview.d.ts: webview.WebCustomScheme';
const setResponseHeaderSignatureStr = '@ohosSdk/component/web.d.ts: WebResourceResponse.setResponseHeader(@ohosSdk/component/web.d.ts: Header[])';
const webResourceRequestTypeStr = '@ohosSdk/component/web.d.ts: WebResourceRequest';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/js-code-cache-by-interception-check.md',
    description: 'In scenarios involving JavaScript resource interception and replacement, set ResponseDataID to generate bytecode cache for faster page loading.',
    extendField: 'In scenarios involving JavaScript resource interception and replacement, enable bytecode cache in the custom protocol registration phase for faster page loading.'
};
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'JsCodeCacheByInterceptionCheck');
class JsCodeCacheByInterceptionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
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
        let api = Index_1.CheckerStorage.getInstance().getApiVersion();
        if (api < MIN_VERSION) {
            return;
        }
        if (!arkClass.hasViewTree() || this.viewTreeTool.hasTraverse(arkClass)) {
            return;
        }
        let viewRoot = arkClass.getViewTree()?.getRoot();
        if (!viewRoot) {
            return;
        }
        this.traverseViewTree(arkClass.getDeclaringArkFile(), viewRoot);
    };
    traverseViewTree(arkFile, treeNode) {
        if (!treeNode) {
            return;
        }
        if (treeNode.isCustomComponent()) {
            return;
        }
        if (treeNode.name === 'Web') {
            let stmts = treeNode.attributes.get('onInterceptRequest');
            if (!stmts) {
                return;
            }
            let stmt = stmts[0];
            let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                return;
            }
            if (invokeExpr.getArgs().length === 0) {
                return;
            }
            let argType = invokeExpr.getArg(0).getType();
            if (!(argType instanceof arkanalyzer_1.FunctionType)) {
                return;
            }
            let interceptMethod = arkFile.getScene().getMethod(argType.getMethodSignature());
            if (!interceptMethod) {
                return;
            }
            this.processOnInterceptRequestMethod(arkFile, treeNode, interceptMethod);
        }
        else {
            for (let children of treeNode.children) {
                this.traverseViewTree(arkFile, children);
            }
        }
    }
    traverseStmts(arkFile, treeNode, interceptMethod, gResUrl) {
        const stmts = interceptMethod.getCfg()?.getStmts() ?? [];
        for (let i = 0; i < stmts.length; i++) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmts[i]);
            if (!invokeExpr || invokeExpr.getArgs().length === 0) {
                continue;
            }
            const methodName = invokeExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            if (schemeCmpMethods.includes(methodName)) {
                this.parseTargetArg(arkFile, stmts[i], invokeExpr.getArgs()[0], gResUrl);
            }
            const argTypes = this.getArgType(invokeExpr);
            if (!argTypes.includes(webResourceRequestTypeStr)) {
                continue;
            }
            const invokeMethod = arkFile.getScene().getMethod(invokeExpr.getMethodSignature());
            if (!invokeMethod) {
                continue;
            }
            this.processOnInterceptRequestMethod(arkFile, treeNode, invokeMethod);
        }
    }
    processBlocks(arkFile, treeNode, interceptMethod, gResUrl) {
        const scopeFlags = new Map();
        const blocks = interceptMethod.getCfg()?.getBlocks() ?? [];
        for (let block of blocks) {
            if (!this.isIfBlock(block)) {
                continue;
            }
            const stmt = this.getIfConditionStmt(block);
            if (!stmt) {
                continue;
            }
            let resUrl = { scheme: '', suffix: '' };
            if (!this.isInterceptionJs(arkFile, stmt, resUrl)) {
                continue;
            }
            if (resUrl.scheme === '') {
                if (gResUrl.scheme === '') {
                    continue;
                }
                resUrl.scheme = gResUrl.scheme;
                resUrl.suffix = gResUrl.suffix;
            }
            if (resUrl.scheme !== 'http' && resUrl.scheme !== 'https') {
                const customSchemeModel = this.getCustomSchemeModel(arkFile.getScene(), resUrl.scheme);
                if (!customSchemeModel) {
                    this.reportIssue(arkFile, treeNode, 'onInterceptRequest', this.metaData.extendField);
                    continue;
                }
                if (!customSchemeModel.isCodeCacheSupported) {
                    const declaringArkFile = customSchemeModel.field.getDeclaringArkClass().getDeclaringArkFile();
                    this.reportIssue(declaringArkFile, customSchemeModel.field, 'schemeName', this.metaData.extendField);
                    continue;
                }
            }
            const blockStmts = block.getStmts();
            const hasSetResponseDataId = this.hasHeaderSetResponseDataId(arkFile, blockStmts);
            const scopeLevel = this.getScopeLevel(block);
            const scopeFlag = scopeFlags.get(scopeLevel);
            if (scopeFlag === undefined) {
                scopeFlags.set(scopeLevel, hasSetResponseDataId);
            }
            else if (!scopeFlag) {
                scopeFlags.set(scopeLevel, hasSetResponseDataId);
            }
        }
        return scopeFlags;
    }
    processOnInterceptRequestMethod(arkFile, treeNode, interceptMethod) {
        let gResUrl = { scheme: '', suffix: '' };
        this.traverseStmts(arkFile, treeNode, interceptMethod, gResUrl);
        const scopeFlags = this.processBlocks(arkFile, treeNode, interceptMethod, gResUrl);
        for (let [scopeLevel, hasSetResponseId] of scopeFlags) {
            if (!hasSetResponseId) {
                this.reportIssue(arkFile, treeNode, 'onInterceptRequest', this.metaData.description);
            }
        }
    }
    parseTargetArg(arkFile, stmt, value, gResUrl) {
        let scope = stmt.scope;
        let varInfo = new VarInfo_1.VarInfo(stmt, scope);
        let argStr = StringUtils_1.StringUtils.getStringByScope(arkFile, varInfo, value);
        if (argStr.includes('http://') || argStr.includes('https://')) {
            gResUrl.scheme = 'http';
            if (argStr.endsWith('js') || argStr.indexOf('.js') !== -1) {
                gResUrl.suffix = '.js';
            }
        }
        if (argStr.includes('://')) {
            let scheme = argStr.substring(0, argStr.indexOf('://'));
            gResUrl.scheme = scheme;
            if (argStr.endsWith('.js') || argStr.indexOf('.js') !== -1) {
                gResUrl.suffix = '.js';
            }
        }
    }
    getArgType(invokeExpr) {
        let argTypes = [];
        let parameters = invokeExpr.getMethodSignature().getMethodSubSignature().getParameters();
        for (let parameter of parameters) {
            argTypes.push(parameter.getType().toString());
        }
        return argTypes;
    }
    isIfBlock(block) {
        const stmts = block.getStmts();
        if (stmts.length === 0) {
            return false;
        }
        let stmt = stmts[0];
        let stmtExt = stmt;
        if (!stmtExt.scope) {
            return false;
        }
        return stmtExt.scope.scopeType === Index_1.ScopeType.IF_TYPE;
    }
    getIfConditionStmt(block) {
        let curScopeLevel = this.getScopeLevel(block);
        let predecessorBlock = block.getPredecessors();
        while (predecessorBlock.length !== 0) {
            let firstPredecessorBlock = predecessorBlock[0];
            const blkStmts = firstPredecessorBlock.getStmts();
            if (blkStmts.length === 0) {
                break;
            }
            let ifStmt = blkStmts[blkStmts.length - 1];
            let ifScopeLevel = this.getScopeLevel(firstPredecessorBlock);
            if ((curScopeLevel - ifScopeLevel) === 1 && ifStmt instanceof arkanalyzer_1.ArkIfStmt) {
                return ifStmt;
            }
            predecessorBlock = firstPredecessorBlock.getPredecessors();
        }
        return null;
    }
    getScopeLevel(block) {
        let stmts = block.getStmts();
        if (stmts.length === 0) {
            return -1;
        }
        let stmt = stmts[0];
        let scope = stmt.scope;
        if (!scope) {
            return -1;
        }
        return scope.scopeLevel;
    }
    isInterceptionJs(arkFile, ifStmt, resUrl) {
        let scope = ifStmt.scope;
        if (!(ifStmt instanceof arkanalyzer_1.ArkIfStmt)) {
            return false;
        }
        let conditionExpr = ifStmt.getConditionExpr();
        let cmpType = this.getConditionValueType(conditionExpr);
        let op1 = conditionExpr.getOp1();
        let op2 = conditionExpr.getOp2();
        let varInfo = new VarInfo_1.VarInfo(ifStmt, scope);
        if (conditionExpr.getOperator().includes('==') && cmpType instanceof arkanalyzer_1.StringType) {
            let op1Str = StringUtils_1.StringUtils.getStringByScope(arkFile, varInfo, op1);
            let op2Str = StringUtils_1.StringUtils.getStringByScope(arkFile, varInfo, op2);
            if (op1Str.endsWith('.js') || op2Str.endsWith('.js')) {
                resUrl.scheme = this.getCustomScheme([op1Str, op2Str]);
                resUrl.suffix = '.js';
                return true;
            }
        }
        else {
            if ((op1.getType() instanceof arkanalyzer_1.UnknownType || op1.getType() instanceof arkanalyzer_1.BooleanType) && (op1 instanceof arkanalyzer_1.Local)) {
                return this.isConditionIncludeJs(arkFile, varInfo, op1, resUrl);
            }
            else if ((op2.getType() instanceof arkanalyzer_1.UnknownType || op2.getType() instanceof arkanalyzer_1.BooleanType) && (op2 instanceof arkanalyzer_1.Local)) {
                return this.isConditionIncludeJs(arkFile, varInfo, op2, resUrl);
            }
        }
        return false;
    }
    getConditionValueType(expr) {
        let op1 = expr.getOp1();
        if (op1.getType() instanceof arkanalyzer_1.PrimitiveType) {
            return op1.getType();
        }
        let op2 = expr.getOp2();
        if (op2.getType() instanceof arkanalyzer_1.PrimitiveType) {
            return op2.getType();
        }
        return arkanalyzer_1.UnknownType.getInstance();
    }
    getCustomScheme(urls) {
        for (let url of urls) {
            if (!url.includes('://')) {
                continue;
            }
            let scheme = url.substring(0, url.indexOf('://'));
            return scheme;
        }
        return '';
    }
    isConditionIncludeJs(arkFile, varInfo, op, resUrl) {
        let declaringStmt = op.getDeclaringStmt();
        let digDeep = 0;
        let isInterceptionJs = false;
        while (declaringStmt) {
            if (digDeep > 20) {
                break;
            }
            if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                isInterceptionJs = false;
                break;
            }
            let rightOp = declaringStmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                let methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
                let args = rightOp.getArgs();
                if (args.length === 0) {
                    isInterceptionJs = false;
                    break;
                }
                if (!urlCmpMethods.includes(methodName)) {
                    isInterceptionJs = false;
                    break;
                }
                let arg0 = args[0];
                let rsStr = StringUtils_1.StringUtils.getStringByScope(arkFile, varInfo, arg0);
                if (rsStr.endsWith('.js')) {
                    isInterceptionJs = true;
                    break;
                }
            }
            else if (rightOp instanceof arkanalyzer_1.ArkConditionExpr) {
                let op1 = rightOp.getOp1();
                let op2 = rightOp.getOp2();
                if ((op1.getType() instanceof arkanalyzer_1.UnknownType || op1.getType() instanceof arkanalyzer_1.BooleanType) && (op1 instanceof arkanalyzer_1.Local)) {
                    return this.isConditionIncludeJs(arkFile, varInfo, op1, resUrl);
                }
                else if ((op2.getType() instanceof arkanalyzer_1.UnknownType || op2.getType() instanceof arkanalyzer_1.BooleanType) && (op2 instanceof arkanalyzer_1.Local)) {
                    return this.isConditionIncludeJs(arkFile, varInfo, op2, resUrl);
                }
                isInterceptionJs = false;
                break;
            }
            else if (rightOp instanceof arkanalyzer_1.Local) {
                declaringStmt = rightOp.getDeclaringStmt();
            }
            digDeep++;
        }
        return isInterceptionJs;
    }
    getCustomSchemeModel(sence, scheme) {
        if (hasCustomSchemeCached) {
            let schemeModel = customSchemeMap.get(scheme);
            if (schemeModel) {
                return schemeModel;
            }
            return undefined;
        }
        for (let arkFile of sence.getFiles()) {
            for (let clazz of arkFile.getClasses()) {
                this.processArkClass(arkFile, clazz, scheme);
            }
            for (const arkNamespace of arkFile.getAllNamespacesUnderThisFile()) {
                for (const clazz of arkNamespace.getClasses()) {
                    this.processArkClass(arkFile, clazz, scheme);
                }
            }
        }
        hasCustomSchemeCached = true;
        let schemeModel = customSchemeMap.get(scheme);
        if (schemeModel) {
            return schemeModel;
        }
        return undefined;
    }
    processArkClass(arkFile, clazz, scheme) {
        for (let method of clazz.getMethods()) {
            for (let stmt of method.getBody()?.getCfg()?.getStmts() ?? []) {
                let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
                if (!invokeExpr) {
                    continue;
                }
                let methodSignatureStr = invokeExpr.getMethodSignature().toString();
                if (methodSignatureStr === customizeSchemesSignatureStr) {
                    this.processSchemeContent(arkFile, clazz, invokeExpr.getArg(0));
                }
            }
        }
    }
    processSchemeContent(arkFile, clazz, value) {
        if (!(value instanceof arkanalyzer_1.Local)) {
            return;
        }
        let valueType = value.getType();
        if (!(valueType instanceof arkanalyzer_1.ArrayType)) {
            return;
        }
        let usedStmts = value.getUsedStmts();
        if (!usedStmts) {
            return;
        }
        for (let usedStmt of usedStmts) {
            if (!(usedStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = usedStmt.getRightOp();
            if (!(rightOp instanceof arkanalyzer_1.Local)) {
                continue;
            }
            let declaringStmt = rightOp.getDeclaringStmt();
            if (!declaringStmt) {
                continue;
            }
            if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let dRightOp = declaringStmt.getRightOp();
            this.processSchemeValue(arkFile, clazz, declaringStmt, dRightOp);
        }
    }
    processSchemeValue(arkFile, clazz, stmt, rightOp) {
        if (rightOp instanceof arkanalyzer_1.ArkNewExpr) {
            this.getSchemeAndCodeCacheSupport(arkFile, stmt, rightOp);
        }
        else if (rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            let instanceField = clazz.getField(rightOp.getFieldSignature());
            if (!instanceField) {
                return;
            }
            let type = instanceField.getType();
            if (!(type instanceof arkanalyzer_1.ClassType)) {
                return;
            }
            let classSignatureStr = type.getClassSignature().toString();
            if (classSignatureStr !== webCustomSchemeSignatureStr) {
                return;
            }
            let initializerStmts = instanceField.getInitializer();
            for (let initializerStmt of initializerStmts) {
                if (!(initializerStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                let rightOp = initializerStmt.getRightOp();
                if (!(rightOp instanceof arkanalyzer_1.ArkNewExpr)) {
                    continue;
                }
                this.getSchemeAndCodeCacheSupport(arkFile, initializerStmt, rightOp);
            }
        }
        else if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
            let declaringSignature = rightOp.getFieldSignature().getDeclaringSignature();
            if (!(declaringSignature instanceof arkanalyzer_1.ClassSignature)) {
                return;
            }
            let staticClass = arkFile.getScene().getClass(declaringSignature);
            if (!staticClass) {
                return;
            }
            let staticField = staticClass.getStaticFieldWithName(rightOp.getFieldName());
            if (!staticField) {
                return;
            }
            let initializerStmts = staticField.getInitializer();
            for (let initializerStmt of initializerStmts) {
                if (!(initializerStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                let rightOp = initializerStmt.getRightOp();
                if (!(rightOp instanceof arkanalyzer_1.ArkNewExpr)) {
                    continue;
                }
                this.getSchemeAndCodeCacheSupport(arkFile, initializerStmt, rightOp);
            }
        }
    }
    getSchemeAndCodeCacheSupport(arkFile, stmt, rightOp) {
        let clazzSignature = rightOp.getClassType().getClassSignature();
        let schemeClass = arkFile.getScene().getClass(clazzSignature);
        if (!schemeClass) {
            return;
        }
        let schemeNameFiled = schemeClass.getFieldWithName('schemeName');
        let isSupportCodeCacheField = schemeClass.getFieldWithName('isCodeCacheSupported');
        if (!schemeNameFiled) {
            return;
        }
        let schemeName = this.getFieldValue(arkFile, schemeNameFiled);
        let isSupportCodeCache = false;
        if (isSupportCodeCacheField) {
            isSupportCodeCache = this.getFieldValue(arkFile, isSupportCodeCacheField) === 'true';
        }
        if (schemeName !== '') {
            customSchemeMap.set(schemeName, { scheme: schemeName, isCodeCacheSupported: isSupportCodeCache, field: schemeNameFiled });
        }
    }
    getFieldValue(arkFile, arkField) {
        let stmts = arkField.getInitializer();
        if (stmts.length === 0) {
            return '';
        }
        let stmt = stmts[0];
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return '';
        }
        let rightOp = stmt.getRightOp();
        if (!rightOp) {
            return '';
        }
        if (rightOp instanceof arkanalyzer_1.Constant) {
            return rightOp.getValue();
        }
        if (rightOp instanceof arkanalyzer_1.ArkStaticFieldRef) {
            let declaringSignature = rightOp.getFieldSignature().getDeclaringSignature();
            if (!(declaringSignature instanceof arkanalyzer_1.ClassSignature)) {
                return '';
            }
            let staticClass = arkFile.getScene().getClass(declaringSignature);
            if (!staticClass) {
                return '';
            }
            let staticField = staticClass.getStaticFieldWithName(rightOp.getFieldName());
            if (!staticField) {
                return '';
            }
            return this.getFieldValue(arkFile, staticField);
        }
        return '';
    }
    hasHeaderSetResponseDataId(arkFile, stmts) {
        let hasSetResponseDataId = false;
        for (let stmt of stmts) {
            let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            let methodSignature = invokeExpr.getMethodSignature();
            let methodSignatureStr = methodSignature.toString();
            if (methodSignatureStr === setResponseHeaderSignatureStr) {
                return this.isSetResponseDataId(arkFile, invokeExpr.getArg(0));
            }
            let args = invokeExpr.getArgs();
            if (args.length === 0) {
                continue;
            }
            if (visitedMethod.has(methodSignature)) {
                continue;
            }
            visitedMethod.add(methodSignature);
            let argTypes = this.getArgType(invokeExpr);
            if (!argTypes.includes('WebResourceResponse')) {
                continue;
            }
            let invokeMethod = arkFile.getScene().getMethod(methodSignature);
            if (!invokeMethod) {
                continue;
            }
            let subStmts = invokeMethod.getCfg()?.getStmts() ?? [];
            hasSetResponseDataId = this.hasHeaderSetResponseDataId(arkFile, subStmts);
            if (hasSetResponseDataId) {
                return true;
            }
        }
        return hasSetResponseDataId;
    }
    isSetResponseDataId(arkFile, arg) {
        if (!(arg instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let usedStmts = arg.getUsedStmts();
        for (let useStmt of usedStmts) {
            if (!(useStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = useStmt.getRightOp();
            let valueType = rightOp.getType();
            if (!(valueType instanceof arkanalyzer_1.ClassType)) {
                continue;
            }
            let paramClass = arkFile.getScene().getClass(valueType.getClassSignature());
            if (!paramClass) {
                continue;
            }
            let keyFields = paramClass.getFields();
            for (let field of keyFields) {
                if (this.getFieldValue(arkFile, field) === 'ResponseDataID') {
                    return true;
                }
            }
        }
        return false;
    }
    reportIssue(arkFile, nodeOrField, keyword, description) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let filePath = arkFile.getFilePath();
        let lineNum = -1;
        let startColumn = -1;
        let endColumn = -1;
        if (nodeOrField instanceof arkanalyzer_1.ArkField) {
            let orgPosition = nodeOrField.getOriginPosition();
            lineNum = orgPosition.getLineNo();
            startColumn = orgPosition.getColNo();
            endColumn = startColumn + keyword.length;
        }
        else {
            let invokeStmts = nodeOrField.attributes.get(keyword);
            if (!invokeStmts) {
                return;
            }
            let invokeExpr = invokeStmts[0].getInvokeExpr();
            if (!invokeExpr) {
                return;
            }
            if (invokeExpr.getArgs().length === 0) {
                return;
            }
            let arg0 = invokeExpr.getArg(0);
            let firstArgPosition = invokeStmts[0].getOperandOriginalPosition(arg0);
            if (!firstArgPosition) {
                return;
            }
            lineNum = firstArgPosition.getFirstLine();
            endColumn = firstArgPosition.getFirstCol() - 1;
            startColumn = endColumn - keyword.length;
        }
        if (lineNum === -1 || startColumn === -1) {
            return;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.JsCodeCacheByInterceptionCheck = JsCodeCacheByInterceptionCheck;
