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
exports.ImageFormatCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const ImageUtils_1 = require("../../utils/checker/ImageUtils");
const Defects_1 = require("../../model/Defects");
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImageFormatCheck');
let hasCheckJson5 = false;
let ImageFormats = ['jpg', 'png', 'webp'];
let moduleMediaMap = new Map();
let moduleRawMap = new Map();
let moduleResMap = new Map();
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-format-check.md',
    description: 'Use ASTC images.'
};
var ResourceType;
(function (ResourceType) {
    ResourceType[ResourceType["MEDIA"] = 0] = "MEDIA";
    ResourceType[ResourceType["RAWFILE"] = 1] = "RAWFILE";
    ResourceType[ResourceType["RESFILE"] = 2] = "RESFILE";
    ResourceType[ResourceType["NET"] = 3] = "NET";
})(ResourceType || (ResourceType = {}));
class ImageFormatCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    registerMatchers() {
        const matchBuildCb = {
            matcher: undefined,
            callback: this.check
        };
        return [matchBuildCb];
    }
    /**
     * Image Format check.
     *
     * @param scene
     */
    check = (scene) => {
        if (!hasCheckJson5) {
            hasCheckJson5 = true;
            if (moduleMediaMap.size === 0 || moduleRawMap.size === 0) {
                this.cacheProjectImages(scene);
            }
            this.checkImageFormatInJson5(scene);
        }
        for (let arkFile of scene.getFiles()) {
            this.checkImageFormatInEts(arkFile);
        }
    };
    /**
     * Cache project image files.
     *
     * @param scene
     */
    cacheProjectImages(scene) {
        // 缓存AppScope中的资源
        let moduleScope = 'AppScope';
        let mediaDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'base', 'media');
        let rawDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'rawfile');
        let resDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'resfile');
        moduleMediaMap.set(moduleScope, Index_1.FileUtils.getAllFiles(mediaDir, []));
        moduleRawMap.set(moduleScope, Index_1.FileUtils.getAllFiles(rawDir, []));
        moduleResMap.set(moduleScope, Index_1.FileUtils.getAllFiles(resDir, []));
        // 缓存每个module中的资源
        for (let [key, value] of scene.getModuleSceneMap()) {
            mediaDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'media');
            rawDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'rawfile');
            resDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'resfile');
            moduleMediaMap.set(key, Index_1.FileUtils.getAllFiles(mediaDir, []));
            moduleRawMap.set(key, Index_1.FileUtils.getAllFiles(rawDir, []));
            moduleResMap.set(key, Index_1.FileUtils.getAllFiles(resDir, []));
        }
    }
    /**
     * Check image format in json5.
     *
     * @param scene
     */
    checkImageFormatInJson5(scene) {
        let realProjectDir = scene.getRealProjectDir();
        let appScopeJson5Path = path_1.default.join(realProjectDir, 'AppScope', 'app.json5');
        if ((0, fs_1.existsSync)(appScopeJson5Path)) {
            const jsonData = (0, arkanalyzer_1.fetchDependenciesFromFile)(appScopeJson5Path);
            let app = jsonData.app;
            let iconName = app.icon.substring(app.icon.indexOf(':') + 1);
            if (this.isImageSuggest(ResourceType.MEDIA, scene, 'AppScope', iconName)) {
                this.reportJson5Issue(appScopeJson5Path, app.icon);
            }
        }
        for (let [key, value] of scene.getModuleSceneMap()) {
            let moduleJson5Path = path_1.default.join(value.getModulePath(), 'src', 'main', 'module.json5');
            if (!(0, fs_1.existsSync)(moduleJson5Path)) {
                logger.debug('module json5 not exist');
                continue;
            }
            const jsonData = (0, arkanalyzer_1.fetchDependenciesFromFile)(moduleJson5Path);
            let moduleJson5 = jsonData.module;
            let abilities = moduleJson5.abilities;
            if (abilities) {
                this.checkImageFormatInAbility(scene, key, moduleJson5Path, abilities);
            }
            let extensionAbilities = moduleJson5.extensionAbilities;
            if (extensionAbilities) {
                this.checkImageFormatInExtensionAbility(scene, key, moduleJson5Path, extensionAbilities);
            }
        }
    }
    checkImageFormatInAbility(scene, moduleName, moduleJson5Path, abilities) {
        for (let ability of abilities) {
            let icon = ability.icon;
            if (icon && icon.startsWith('$media:')) {
                let iconName = icon.substring(icon.indexOf(':') + 1);
                if (this.isImageSuggest(ResourceType.MEDIA, scene, moduleName, iconName)) {
                    this.reportJson5Issue(moduleJson5Path, icon);
                }
            }
            let startWindowIcon = ability.startWindowIcon;
            if (startWindowIcon && startWindowIcon.startsWith('$media:')) {
                let iconName = startWindowIcon.substring(startWindowIcon.indexOf(':') + 1);
                if (this.isImageSuggest(ResourceType.MEDIA, scene, moduleName, iconName)) {
                    this.reportJson5Issue(moduleJson5Path, startWindowIcon);
                }
            }
        }
    }
    checkImageFormatInExtensionAbility(scene, moduleName, moduleJson5Path, extensionAbilities) {
        for (let extensionAbility of extensionAbilities) {
            let icon = extensionAbility.icon;
            if (icon && icon.startsWith('$media:')) {
                let iconName = icon.substring(icon.indexOf(':') + 1);
                if (this.isImageSuggest(ResourceType.MEDIA, scene, moduleName, iconName)) {
                    this.reportJson5Issue(moduleJson5Path, icon);
                }
            }
        }
    }
    /**
     * If media image is jpg, png, webp return true, otherwise false.
     *
     * @param type
     * @param scene
     * @param moduleName
     * @param imageName
     * @returns boolean
     */
    isImageSuggest(type, scene, moduleName, imageName) {
        // 如果模块名字为AppScope，则只找AppScope下面的资源
        let imageFile = moduleMediaMap.get('AppScope')?.find((imagePath) => {
            return path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '') === imageName;
        });
        if (moduleName === 'AppScope') {
            if (!imageFile) {
                return false;
            }
        }
        else {
            // 根据当前模块dependencies去找其他模块
            imageFile = this.getImageFileByDependencyTree(type, scene, moduleName, imageName);
        }
        // 未找到图片，则不上报
        if (!imageFile) {
            return false;
        }
        // 有路径，但是无文件
        if (!(0, fs_1.existsSync)(imageFile)) {
            return false;
        }
        // 获取图片的真实格式
        let ImageFormat = this.getImageFormat(imageFile);
        if (ImageFormats.includes(ImageFormat)) {
            return true;
        }
        return false;
    }
    getImageFileByDependencyTree(type, scene, moduleName, imageName) {
        // 根据资源类型，现在当前模块找
        let imageArray;
        switch (type) {
            case ResourceType.MEDIA:
                imageArray = moduleMediaMap.get(moduleName);
                break;
            case ResourceType.RAWFILE:
                imageArray = moduleRawMap.get(moduleName);
                break;
            case ResourceType.RESFILE:
                imageArray = moduleResMap.get(moduleName);
                break;
            default:
                break;
        }
        if (!imageArray) {
            return undefined;
        }
        let imageFile = imageArray.find((imagePath) => {
            return path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '') === imageName;
        });
        // 当前模块找到图片，则直接返回
        if (imageFile) {
            return imageFile;
        }
        // 当前模块找不到，则解析oh-package.json5,去依赖库中查找
        let moduleInfo = scene.getModuleScene(moduleName);
        if (!moduleInfo) {
            return undefined;
        }
        let ohPkgContent = moduleInfo.getOhPkgContent();
        let dependencies = ohPkgContent.dependencies;
        if (!dependencies) {
            return undefined;
        }
        for (let [name, value] of Object.entries(dependencies)) {
            // oh-package.json5中的modulename不一定为真实module名称
            let dependMoudleName = name;
            if (/^(file:)?\.{1,2}\//.test(value)) {
                // 需要解析相对路径最后一级的名称 "common": "file:../common"
                dependMoudleName = path_1.default.basename(value);
            }
            // 从任何一个依赖模块中找到则返回
            imageFile = this.getImageFileByDependencyTree(type, scene, dependMoudleName, imageName);
            if (imageFile) {
                return imageFile;
            }
        }
        return imageFile;
    }
    /**
     * Get image format, like jpg, png, webp, astc.
     *
     * @param imagePath
     * @returns string
     */
    getImageFormat(imagePath) {
        try {
            const info = (0, ImageUtils_1.readImageInfo)(imagePath);
            let format = info?.type;
            if (format) {
                return format;
            }
        }
        catch (err) {
            logger.error('ImageFormatCheck getImageFormat exception');
        }
        return '';
    }
    /**
     * Check image format in ets file.
     *
     * @param arkFile
     */
    checkImageFormatInEts(arkFile) {
        for (let clazz of arkFile.getClasses()) {
            // 解析Image组件中的图片格式
            if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
                let rootTreeNode = clazz.getViewTree()?.getRoot();
                if (!rootTreeNode) {
                    return;
                }
                this.traverseViewTree(arkFile, rootTreeNode);
            }
            // 解析getDrawableDescriptor和createImageSource接口参数中的图片格式
            for (let method of clazz.getMethods()) {
                this.processArkMethod(arkFile, method);
            }
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            this.traverseNameSpace(arkFile, namespace);
        }
    }
    traverseNameSpace(arkFile, namespace) {
        for (let clazz of namespace.getClasses()) {
            // 解析getDrawableDescriptor和createImageSource接口参数中的图片格式
            for (let method of clazz.getMethods()) {
                this.processArkMethod(arkFile, method);
            }
            // 解析Image组件中的图片格式
            if (!clazz.hasViewTree()) {
                continue;
            }
            if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
                let rootTreeNode = clazz.getViewTree()?.getRoot();
                if (!rootTreeNode) {
                    return;
                }
                this.traverseViewTree(arkFile, rootTreeNode);
            }
        }
    }
    /**
     * traverse view find container with one children.
     *
     * @param arkFile
     * @param treeNode
     */
    traverseViewTree(arkFile, treeNode) {
        if (treeNode === undefined || treeNode === null) {
            return;
        }
        if (treeNode.children.length === 0) {
            return;
        }
        for (let children of treeNode.children) {
            if (children.isCustomComponent()) {
                continue;
            }
            if (children.name === 'Image') {
                let stmts = children.attributes;
                let createStmt = stmts.get('create');
                if (!createStmt) {
                    continue;
                }
                let stmt = createStmt[0];
                if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    continue;
                }
                let rightOp = stmt.getRightOp();
                if (!(rightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr)) {
                    continue;
                }
                // arg为Image.create()方法的入参，类型有Constant和Local两种类型
                let arg = rightOp.getArg(0);
                // 检测Image创建时src: PixelMap, src: Resourcr, src: DrawableDescriptor的图片格式
                this.checkImageFormatInArg(arkFile, stmt, 'create', arg);
            }
            if (children.children.length !== 0) {
                this.traverseViewTree(arkFile, children);
            }
        }
    }
    processArkMethod(arkFile, method) {
        for (let stmt of method.getBody()?.getCfg().getStmts() ?? []) {
            let invokerExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!(invokerExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
                continue;
            }
            if (invokerExpr.getArgs().length === 0) {
                continue;
            }
            let methodName = invokerExpr.getMethodSignature().getMethodSubSignature().getMethodName();
            if (methodName !== 'getDrawableDescriptor' && methodName !== 'getRawFd' && methodName !== 'getRawFdSync' && methodName !== 'createImageSource') {
                return;
            }
            // 1、检测getDrawableDescriptor方法参数resId: number, resource: Resource的图片格式
            // 2、检测getRawFd和getRawFdSync方法参数path: string的图片格式
            // 3、检测createImageSource方法参数rawfile: resourceManager.RawFileDescriptor, buf: ArrayBuffer, fd: number, uri: string的图片格式
            if (methodName === 'getDrawableDescriptor') {
                this.checkImageFormatInArg(arkFile, stmt, methodName, invokerExpr.getArg(0));
            }
            else if (methodName === 'getRawFd' || methodName === 'getRawFdSync') {
                this.checkImageFormatInArg(arkFile, stmt, methodName, invokerExpr.getArg(0));
            }
            else if (methodName === 'createImageSource') {
                // promise跨方法导致推导失败，只能推导出getRawFdSync,与上面重复
            }
        }
    }
    checkImageFormatInArg(arkFile, stmt, methodName, arg) {
        // arg为Image.create或getDrawableDescriptor或getRawFd或createImageSource的参数
        if (arg instanceof arkanalyzer_1.Constant) {
            this.checkImageFormatInConstant(arkFile, stmt, methodName, arg);
        }
        else if (arg instanceof arkanalyzer_1.Local) {
            let declaringStmt = arg.getDeclaringStmt();
            if (!declaringStmt) {
                return;
            }
            if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                return;
            }
            this.checkImageFormatInArg(arkFile, declaringStmt, methodName, declaringStmt.getRightOp());
        }
        else if (arg instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            this.checkImageFormatInRef(arkFile, methodName, arg);
        }
        else if (arg instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            this.checkImageFormatInStaticExpr(arkFile, stmt, arg);
        }
        else if (arg instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            // 样例代码: Image(getContext(this).resourceManager.getDrawableDescriptor($r('app.media.impressions_bg_snowscape')))
            let subMethodName = arg.getMethodSignature().getMethodSubSignature().getMethodName();
            if (subMethodName !== 'getDrawableDescriptor' && subMethodName !== 'getRawFd' && subMethodName !== 'getRawFdSync' && subMethodName !== 'createImageSource') {
                return;
            }
            if (arg.getArgs().length === 0) {
                return;
            }
            this.checkImageFormatInArg(arkFile, stmt, subMethodName, arg.getArg(0));
        }
    }
    checkImageFormatInConstant(arkFile, stmt, methodName, arg) {
        let value = arg.getValue();
        let valueLowCase = value.toLocaleLowerCase();
        // 不检测手机沙盒资源，网络资源，手机媒体库资源
        if (valueLowCase.includes('/data/storage/') || valueLowCase.includes('http://') || valueLowCase.includes('https://') || valueLowCase.includes('ftp://') || valueLowCase.includes('file://')) {
            return;
        }
        // 其他类型资源，可能存在本地，获取文件名后，去本地资源查找
        let imageName = path_1.default.basename(value).replace(path_1.default.extname(value), '');
        if (imageName === '') {
            return;
        }
        let moduleScene = arkFile.getModuleScene();
        if (!moduleScene) {
            return;
        }
        // 这getRawFd与getRawFdSync方法则去moduleRawMap,其他则去moduleResMap缓存中查找
        if (methodName === 'getRawFd' || methodName === 'getRawFdSync') {
            if (this.isImageSuggest(ResourceType.RAWFILE, arkFile.getScene(), moduleScene.getModuleName(), imageName)) {
                this.reportEtsIssue(arkFile, stmt, value);
            }
        }
        else {
            if (this.isImageSuggest(ResourceType.RESFILE, arkFile.getScene(), moduleScene.getModuleName(), imageName)) {
                this.reportEtsIssue(arkFile, stmt, value);
            }
        }
    }
    checkImageFormatInRef(arkFile, methodName, arg) {
        // 样例代码: Image(this.mediaArr[0]), Image(this.srcPixelMap)
        let fieldName = arg.getFieldName();
        // 引用Resource对象
        if (fieldName === 'id') {
            let base = arg.getBase();
            let declaringStmt = base.getDeclaringStmt();
            if (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                this.checkImageFormatInArg(arkFile, declaringStmt, methodName, declaringStmt.getRightOp());
            }
        }
        if (arg.getBase().getName() !== 'this') {
            return;
        }
        // 引用当前类字段
        let baseSignature = arg.getFieldSignature().getDeclaringSignature();
        if (!(baseSignature instanceof arkanalyzer_1.ClassSignature)) {
            return;
        }
        let arkClass = arkFile.getClassWithName(baseSignature.getClassName());
        if (!arkClass) {
            return;
        }
        let arkField = arkClass.getFieldWithName(fieldName);
        if (!arkField) {
            return;
        }
        let stmts = arkField.getInitializer();
        if (stmts.length === 0) {
            return;
        }
        let stmt = stmts[0];
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return;
        }
        let initialValue = stmt.getRightOp();
        this.checkImageFormatInClassField(arkFile, arkField, initialValue);
        // 引用当前类的字段，暂不处理
    }
    checkImageFormatInClassField(arkFile, arkField, arg) {
        if (arg instanceof arkanalyzer_1.Constant) {
            return;
        }
        else if (arg instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            if (arg.getArgs().length === 0) {
                return;
            }
            let imageValue = arg.getArg(0);
            if (!(imageValue instanceof arkanalyzer_1.Constant)) {
                return;
            }
            let imagePath = imageValue.getValue();
            let methodName = arg.getMethodSignature().getMethodSubSignature().getMethodName();
            const moduleName = arkFile.getModuleName();
            if (!moduleName) {
                return;
            }
            if (methodName.includes('$r')) {
                let imageName = imagePath.replace('app.media.', '');
                if (this.isImageSuggest(ResourceType.MEDIA, arkFile.getScene(), moduleName, imageName)) {
                    this.reportEtsIssue(arkFile, arkField, imagePath);
                }
            }
            else if (methodName.includes('$rawfile')) {
                let imageName = path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '');
                if (this.isImageSuggest(ResourceType.RAWFILE, arkFile.getScene(), moduleName, imageName)) {
                    this.reportEtsIssue(arkFile, arkField, imagePath);
                }
            }
        }
        else if (arg instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let subMethodName = arg.getMethodSignature().getMethodSubSignature().getMethodName();
            if (subMethodName !== 'getDrawableDescriptor' && subMethodName !== 'getRawFd' && subMethodName !== 'getRawFdSync' && subMethodName !== 'createImageSource') {
                return;
            }
            if (arg.getArgs().length === 0) {
                return;
            }
            this.checkImageFormatInClassField(arkFile, arkField, arg.getArg(0));
        }
    }
    checkImageFormatInStaticExpr(arkFile, stmt, arg) {
        if (arg.getArgs().length === 0) {
            return;
        }
        let imageValue = arg.getArg(0);
        if (!(imageValue instanceof arkanalyzer_1.Constant)) {
            return;
        }
        let imagePath = imageValue.getValue();
        let methodName = arg.getMethodSignature().getMethodSubSignature().getMethodName();
        let moduleScene = arkFile.getModuleScene();
        if (!moduleScene) {
            return;
        }
        if (methodName === '$r') {
            let imageName = imagePath.replace('app.media.', '');
            if (this.isImageSuggest(ResourceType.MEDIA, arkFile.getScene(), moduleScene.getModuleName(), imageName)) {
                this.reportEtsIssue(arkFile, stmt, imagePath);
            }
        }
        else if (methodName === '$rawfile') {
            let imageName = path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '');
            if (this.isImageSuggest(ResourceType.RAWFILE, arkFile.getScene(), moduleScene.getModuleName(), imageName)) {
                this.reportEtsIssue(arkFile, stmt, imagePath);
            }
        }
    }
    /**
     * Report issue in json5.
     *
     * @param json5Path
     * @param iconName
     */
    reportJson5Issue(json5Path, iconName) {
        let severity = this.rule.alert ?? this.metaData.severity;
        let readData = fs_1.default.readFileSync(json5Path, 'utf8');
        let readLines = readData.split('\n');
        let lineNum = 1;
        let startColumn = -1;
        let endColumn = -1;
        for (let line of readLines) {
            if ((line.includes('icon') || line.includes('startWindowIcon')) && line.includes(iconName)) {
                startColumn = line.indexOf(iconName) + 1;
                endColumn = startColumn + iconName.length - 1;
                let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, json5Path, this.metaData.ruleDocPath, true, false, false);
                this.issues.push(new Defects_1.IssueReport(defects, undefined));
            }
            lineNum++;
        }
    }
    /**
     * Report issue.
     *
     * @param arkFile
     * @param stmtLike
     * @param imageName
     */
    reportEtsIssue(arkFile, stmtLike, imageName) {
        let severity = this.rule.alert ?? this.metaData.severity;
        let filePath = arkFile.getFilePath();
        let lineNum = -1;
        let startColumn = -1;
        let endColumn = -1;
        if (stmtLike instanceof arkanalyzer_1.Stmt) {
            const text = stmtLike.getOriginalText();
            if (!text || text.length === 0) {
                return;
            }
            let originalPosition = stmtLike.getOriginPositionInfo();
            lineNum = originalPosition.getLineNo();
            startColumn = originalPosition.getColNo() + text.indexOf(imageName);
            endColumn = startColumn + imageName.length - 1;
        }
        else {
            let lineCode = stmtLike.getCode();
            lineNum = stmtLike.getOriginPosition().getLineNo();
            startColumn = stmtLike.getOriginPosition().getColNo() + lineCode.indexOf(imageName);
            endColumn = startColumn + imageName.length - 1;
        }
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ImageFormatCheck = ImageFormatCheck;
