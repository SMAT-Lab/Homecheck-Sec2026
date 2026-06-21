"use strict";
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
exports.LottieAnimationDestoryCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Stmt_1 = require("arkanalyzer/lib/core/base/Stmt");
const Expr_1 = require("arkanalyzer/lib/core/base/Expr");
const Type_1 = require("arkanalyzer/lib/core/base/Type");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const Local_1 = require("arkanalyzer/lib/core/base/Local");
const Ref_1 = require("arkanalyzer/lib/core/base/Ref");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const destoryMethods = ['aboutToDisappear', 'onPageHide', 'onDisAppear'];
const loadAnimationSignatureStrs = [
    '@thirdParty/@ohos/lottie/index.d.ts: LottiePlayer.loadAnimation(@internalSdk/@internal/es5.d.ts: ObjectConstructor)',
    '@thirdParty/@ohos/lottie/index.d.ts: LottiePlayer.loadAnimation(@ES2015/BuiltinClass: Object)'
];
const lottieDestorySignatureStr = '@thirdParty/@ohos/lottie/index.d.ts: LottiePlayer.destroy(string)';
const animationDestorySignatureStr = '@thirdParty/@ohos/lottie/index.d.ts: AnimationItem.destroy(string)';
const addEventListenerSignatureStr = '@thirdParty/@ohos/lottie/index.d.ts: AnimationItem.addEventListener(string, LoadCallback<T = any>)';
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'LottieAnimationDestoryCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/lottie-animation-destroy-check.md',
    description: 'Destroy Lottie animations correctly.'
};
class LottieAnimationDestoryCheck {
    metaData = gMetaData;
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
        let hasImportLottie = false;
        for (let importInfo of arkFile.getImportInfos()) {
            let form = importInfo.getFrom();
            if (form && form === '@ohos/lottie') {
                hasImportLottie = true;
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
        if (hasImportLottie && hasViewTree) {
            this.processArkFile(arkFile);
        }
    };
    processArkFile(arkFile) {
        let loadAnims = [];
        let releaseMethods = [];
        for (let clazz of arkFile.getClasses()) {
            for (let arkMethod of clazz.getMethods()) {
                this.processArkMethod(arkFile, arkMethod, loadAnims, releaseMethods);
            }
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                for (let arkMethod of clazz.getMethods()) {
                    this.processArkMethod(arkFile, arkMethod, loadAnims, releaseMethods);
                }
            }
        }
        if (loadAnims.length === 0) {
            return;
        }
        let destroyAnimCount = this.getDestroyAnimCount(loadAnims, releaseMethods);
        if (destroyAnimCount === 0) {
            for (let animInfo of loadAnims) {
                let invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(animInfo.initStmt);
                if (invokerExpr && invokerExpr instanceof Expr_1.ArkInstanceInvokeExpr) {
                    let baseName = invokerExpr.getBase().getName();
                    this.reportIssue(arkFile, animInfo.initStmt, baseName);
                }
            }
        }
        else if (destroyAnimCount < loadAnims.length) {
            for (let animInfo of loadAnims) {
                if (!animInfo.destoryStmt) {
                    continue;
                }
                let invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(animInfo.destoryStmt);
                if (!invokerExpr || !(invokerExpr instanceof Expr_1.ArkInstanceInvokeExpr)) {
                    continue;
                }
                let baseName = this.getInstanceBaseName(invokerExpr.getBase());
                let realFile = animInfo.destoryStmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
                if (realFile) {
                    this.reportIssue(realFile, animInfo.destoryStmt, baseName);
                }
            }
        }
    }
    getDestroyAnimCount(loadAnims, releaseMethods) {
        let destroyAnimCount = 0;
        let busyMethods = new Set();
        for (let arkMethod of releaseMethods) {
            if (destroyAnimCount >= loadAnims.length) {
                break;
            }
            busyMethods.clear();
            destroyAnimCount += this.getCountFromDestroryMethod(loadAnims, arkMethod, busyMethods);
        }
        return destroyAnimCount;
    }
    getCountFromDestroryMethod(loadAnims, arkMethod, busyMethods) {
        let destroyAnimCount = 0;
        busyMethods.add(arkMethod.getSignature());
        for (let stmt of arkMethod.getBody()?.getCfg()?.getStmts() ?? []) {
            let invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            if (!(invokeExpr instanceof Expr_1.AbstractInvokeExpr)) {
                continue;
            }
            let methodSignature = invokeExpr.getMethodSignature();
            let methodSignatureStr = methodSignature.toString();
            if (busyMethods.has(methodSignature)) {
                continue;
            }
            if (methodSignatureStr !== lottieDestorySignatureStr && methodSignatureStr !== animationDestorySignatureStr) {
                let invokeMethods = this.findCallerMethodByInvoker(stmt, invokeExpr);
                for (let subMethod of invokeMethods) {
                    destroyAnimCount += this.getCountFromDestroryMethod(loadAnims, subMethod, busyMethods);
                }
                continue;
            }
            if (methodSignatureStr === lottieDestorySignatureStr && invokeExpr.getArgs().length === 0) {
                destroyAnimCount = loadAnims.length;
                break;
            }
            let targetAnim = loadAnims.find((anim) => { return anim.destoryStmt === null; });
            if (targetAnim) {
                destroyAnimCount++;
                targetAnim.destoryStmt = stmt;
            }
        }
        return destroyAnimCount;
    }
    findCallerMethodByInvoker(stmt, invokeExpr) {
        let methods = [];
        let invokerFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        let invokerClass = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkClass();
        if (!invokerFile || !invokerClass) {
            return methods;
        }
        let invokeArgs = invokeExpr.getArgs();
        for (let argv of invokeArgs) {
            let type = argv.getType();
            if (!(type instanceof Type_1.FunctionType)) {
                continue;
            }
            let anonymousMethod = invokerFile.getScene().getMethod(type.getMethodSignature());
            if (!anonymousMethod) {
                logger.debug('Find FunctionType method error!');
                continue;
            }
            methods.push(anonymousMethod);
        }
        let invokeMethod = invokerFile.getScene().getMethod(invokeExpr.getMethodSignature());
        if (!invokeMethod) {
            logger.debug('Find method error!');
            return methods;
        }
        methods.push(invokeMethod);
        return methods;
    }
    processArkMethod(arkFile, arkMethod, loadInfos, releaseMethods) {
        for (let stmt of arkMethod.getBody()?.getCfg()?.getStmts() ?? []) {
            let invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokerExpr) {
                continue;
            }
            let methodSignature = invokerExpr.getMethodSignature();
            let methodSignatureStr = methodSignature.toString();
            let methodName = methodSignature.getMethodSubSignature().getMethodName();
            if (loadAnimationSignatureStrs.includes(methodSignatureStr)) {
                let animItemName = this.getInstanceName(stmt);
                let animName = this.getAnimName(arkFile, invokerExpr.getArg(0));
                loadInfos.push({ initStmt: stmt, animItemName: animItemName, animName: animName, destoryStmt: null });
            }
            else {
                this.findReleaseMethod(arkFile, invokerExpr, methodName, methodSignatureStr, releaseMethods);
            }
        }
        let methodName = arkMethod.getSubSignature().getMethodName();
        if (destoryMethods.includes(methodName)) {
            releaseMethods.push(arkMethod);
        }
    }
    findReleaseMethod(arkFile, invokerExpr, methodName, methodSignatureStr, releaseMethods) {
        if (methodSignatureStr === addEventListenerSignatureStr) {
            let eventName = invokerExpr.getArg(0);
            if (!(eventName instanceof Constant_1.Constant)) {
                return;
            }
            if (eventName.getValue() !== 'complete') {
                return;
            }
            let callback = invokerExpr.getArg(1);
            let type = callback.getType();
            if (!(type instanceof Type_1.FunctionType)) {
                return;
            }
            let animCompleteMethod = arkFile.getScene().getMethod(type.getMethodSignature());
            if (!animCompleteMethod) {
                logger.debug('Find FunctionType method error!');
                return;
            }
            releaseMethods.push(animCompleteMethod);
            return;
        }
        if (!destoryMethods.includes(methodName)) {
            return;
        }
        let invokeArgvs = invokerExpr.getArgs();
        for (let argv of invokeArgvs) {
            let type = argv.getType();
            if (!(type instanceof Type_1.FunctionType)) {
                continue;
            }
            let anonymousMethod = arkFile.getScene().getMethod(type.getMethodSignature());
            if (!anonymousMethod) {
                logger.debug('Find FunctionType method error!');
                return;
            }
            releaseMethods.push(anonymousMethod);
        }
    }
    getAnimName(arkFile, value) {
        if (!(value instanceof Local_1.Local)) {
            return '';
        }
        let type = value.getType();
        if (!(type instanceof Type_1.ClassType)) {
            return '';
        }
        let anonymousClassSignature = type.getClassSignature();
        let anonymousClass = arkFile.getClass(anonymousClassSignature);
        if (!anonymousClass) {
            return '';
        }
        let nameField = anonymousClass.getFieldWithName('name');
        if (!nameField) {
            return '';
        }
        let stmts = nameField.getInitializer();
        if (stmts.length === 0) {
            return '';
        }
        let stmt = stmts[0];
        if (!(stmt instanceof Stmt_1.ArkAssignStmt)) {
            return '';
        }
        let initializer = stmt.getRightOp();
        if (!initializer) {
            return '';
        }
        if (initializer instanceof Constant_1.Constant) {
            return initializer.getValue();
        }
        if (initializer instanceof Local_1.Local) {
            return initializer.getName();
        }
        if (initializer instanceof Ref_1.ArkInstanceFieldRef) {
            return initializer.getFieldName();
        }
        if (initializer instanceof Ref_1.ArkStaticFieldRef) {
            let baseName = initializer.getFieldSignature().getBaseName();
            return baseName + initializer.getFieldName();
        }
        return '';
    }
    getInstanceName(stmt) {
        if (!stmt) {
            return '';
        }
        if (stmt instanceof Stmt_1.ArkInvokeStmt) {
            return '';
        }
        if (!(stmt instanceof Stmt_1.ArkAssignStmt)) {
            return '';
        }
        let leftOp = stmt.getLeftOp();
        if (!(leftOp instanceof Local_1.Local)) {
            return '';
        }
        if (!leftOp.getName().includes('%')) {
            return leftOp.getName();
        }
        for (let useStmt of leftOp.getUsedStmts()) {
            if (!(useStmt instanceof Stmt_1.ArkAssignStmt)) {
                continue;
            }
            let leftVal = useStmt.getLeftOp();
            if (leftVal instanceof Ref_1.ArkInstanceFieldRef) {
                return leftVal.getFieldName();
            }
        }
        return '';
    }
    getInstanceBaseName(value) {
        if (!(value instanceof Local_1.Local)) {
            return '';
        }
        if (!value.getName().includes('%')) {
            return value.getName();
        }
        let declaringStmt = value.getDeclaringStmt();
        if (!declaringStmt || !(declaringStmt instanceof Stmt_1.ArkAssignStmt)) {
            return '';
        }
        let rightOp = declaringStmt.getRightOp();
        if (rightOp instanceof Ref_1.ArkInstanceFieldRef) {
            return rightOp.getFieldName();
        }
        return '';
    }
    reportIssue(arkFile, stmt, keyword) {
        let filePath = arkFile.getFilePath();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColum = originalPosition.getColNo() + text.indexOf(keyword);
        let endColum = startColum + keyword.length - 1;
        filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.LottieAnimationDestoryCheck = LottieAnimationDestoryCheck;
