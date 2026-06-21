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
exports.ResourcesFileCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const StringUtils_1 = require("../../utils/checker/StringUtils");
const Defects_1 = require("../../model/Defects");
const VarInfo_1 = require("../../model/VarInfo");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ResourcesFileCheck');
let ImageFormats = ['.jpg', '.png', '.webp', '.astc', '.json'];
let moduleMediaMap = new Map();
let moduleRawMap = new Map();
let moduleResMap = new Map();
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/resources-file-check.md',
    description: 'Suggestion: The image resources is not used.'
};
var ResourceType;
(function (ResourceType) {
    ResourceType[ResourceType["MEDIA"] = 0] = "MEDIA";
    ResourceType[ResourceType["RAWFILE"] = 1] = "RAWFILE";
    ResourceType[ResourceType["RESFILE"] = 2] = "RESFILE";
    ResourceType[ResourceType["NET"] = 3] = "NET";
})(ResourceType || (ResourceType = {}));
class ResourcesFileCheck {
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
     * resource file check.
     *
     * @param scene
     */
    check = (scene) => {
        // .json5文件
        this.cacheProjectImages(scene);
        this.checkImageFormatInJson5(scene);
        // 解析ets文件中图片资源，image组件和api调用场景
        for (let arkFile of scene.getFiles()) {
            this.checkImageFormatInEts(arkFile, scene);
        }
        // 遍历map
        this.mapProcess();
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
        moduleMediaMap.set(moduleScope, Index_1.FileUtils.getAllFiles(mediaDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
        moduleRawMap.set(moduleScope, Index_1.FileUtils.getAllFiles(rawDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
        moduleResMap.set(moduleScope, Index_1.FileUtils.getAllFiles(resDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
        // 缓存每个module中的资源
        for (let [key, value] of scene.getModuleSceneMap()) {
            mediaDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'media');
            rawDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'rawfile');
            resDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'resfile');
            moduleMediaMap.set(key, Index_1.FileUtils.getAllFiles(mediaDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
            moduleRawMap.set(key, Index_1.FileUtils.getAllFiles(rawDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
            moduleResMap.set(key, Index_1.FileUtils.getAllFiles(resDir, ImageFormats).map(filePath => ({ filePath: filePath, inUse: false })));
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
            this.imageSuggest(ResourceType.MEDIA, 'AppScope', iconName, scene);
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
                this.checkImageFormatInAbility(key, abilities, scene);
            }
            let extensionAbilities = moduleJson5.extensionAbilities;
            if (extensionAbilities) {
                this.checkImageFormatInExtensionAbility(key, extensionAbilities, scene);
            }
        }
    }
    imageSuggest(type, moduleName, imageName, scene) {
        if (moduleName === 'AppScope') {
            // 如果模块名字为AppScope，则只找AppScope下面的资源
            let paths = moduleMediaMap.get('AppScope');
            if (paths === undefined) {
                return;
            }
            for (let imagePath of paths) {
                if (path_1.default.basename(imagePath.filePath).replace(path_1.default.extname(imagePath.filePath), '') === imageName) {
                    // 修改状态值
                    imagePath.inUse = true;
                }
            }
        }
        else {
            this.getImageFileByDependencyTree(type, scene, moduleName, imageName);
        }
    }
    getImageFileByDependencyTree(type, scene, moduleName, imageName) {
        // 根据资源类型，现在当前模块找
        if (this.moduleProcess(type, moduleName, imageName)) {
            // 本模块找到
            return;
        }
        // 去其他模块找
        let moduleInfo = scene.getModuleScene(moduleName);
        if (!moduleInfo) {
            return;
        }
        let ohPkgContent = moduleInfo.getOhPkgContent();
        let dependencies = ohPkgContent.dependencies;
        if (!dependencies) {
            return;
        }
        for (let [name, value] of Object.entries(dependencies)) {
            // oh-package.json5中的modulename不一定为真实module名称
            let dependMoudleName = name;
            if (/^(file:)?\.{1,2}\//.test(value)) {
                // 需要解析相对路径最后一级的名称 "common": "file:../common"
                dependMoudleName = path_1.default.basename(value);
            }
            if (this.moduleProcess(type, dependMoudleName, imageName)) {
                // 本模块找到
                return;
            }
        }
    }
    moduleProcess(type, moduleName, imageName) {
        // 当前模块找到，返回查找结果
        let imageArrays;
        switch (type) {
            case ResourceType.MEDIA:
                imageArrays = moduleMediaMap.get(moduleName);
                break;
            case ResourceType.RAWFILE:
                imageArrays = moduleRawMap.get(moduleName);
                break;
            case ResourceType.RESFILE:
                imageArrays = moduleResMap.get(moduleName);
                break;
            default:
                break;
        }
        return this.imageProcess(imageArrays, imageName);
    }
    imageProcess(imageArrays, imageName) {
        if (imageArrays === undefined) {
            return false;
        }
        for (let imageArray of imageArrays) {
            if (path_1.default.basename(imageArray.filePath).replace(path_1.default.extname(imageArray.filePath), '') !== imageName) {
                continue;
            }
            let fileFormat = path_1.default.extname(imageArray.filePath);
            if (fileFormat === '.json') {
                // 解析json文件
                const jsonData = (0, arkanalyzer_1.fetchDependenciesFromFile)(imageArray.filePath);
                return this.checkMediaPrefix(jsonData, imageArrays);
            }
            else {
                // 修改状态值
                imageArray.inUse = true;
                return true;
            }
        }
        return false;
    }
    checkMediaPrefix(obj, imageArrays) {
        for (let key in obj) {
            let value = obj[key];
            if (typeof value === 'string' && value.toString().startsWith('$media')) {
                let iconName = value.substring(value.indexOf(':') + 1);
                return this.imageProcess(imageArrays, iconName);
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                // 如果值是对象，递归调用函数继续检查
                this.checkMediaPrefix(obj[key], imageArrays);
            }
        }
        return false;
    }
    checkImageFormatInAbility(moduleName, abilities, scene) {
        for (let ability of abilities) {
            let icon = ability.icon;
            if (icon && icon.startsWith('$media:')) {
                let iconName = icon.substring(icon.indexOf(':') + 1);
                this.imageSuggest(ResourceType.MEDIA, moduleName, iconName, scene);
            }
            let startWindowIcon = ability.startWindowIcon;
            if (startWindowIcon && startWindowIcon.startsWith('$media:')) {
                let iconName = startWindowIcon.substring(startWindowIcon.indexOf(':') + 1);
                this.imageSuggest(ResourceType.MEDIA, moduleName, iconName, scene);
            }
        }
    }
    checkImageFormatInExtensionAbility(moduleName, extensionAbilities, scene) {
        for (let extensionAbility of extensionAbilities) {
            let icon = extensionAbility.icon;
            if (icon && icon.startsWith('$media:')) {
                let iconName = icon.substring(icon.indexOf(':') + 1);
                this.imageSuggest(ResourceType.MEDIA, moduleName, iconName, scene);
            }
        }
    }
    checkImageFormatInEts(arkFile, scene) {
        for (let clazz of arkFile.getClasses()) {
            this.classProcess(clazz, scene);
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                this.classProcess(clazz, scene);
            }
        }
    }
    classProcess(clazz, scene) {
        for (let method of clazz.getMethods()) {
            let busyMethods = new Set();
            this.findSymbolInMethod(method, scene, busyMethods);
        }
        let instanceInitMethod = clazz.getInstanceInitMethod();
        let initBusyMethods = new Set();
        this.findSymbolInMethod(instanceInitMethod, scene, initBusyMethods);
        let staticInitMethod = clazz.getStaticInitMethod();
        let staticInitBusyMethods = new Set();
        this.findSymbolInMethod(staticInitMethod, scene, staticInitBusyMethods);
    }
    findSymbolInMethod(method, scene, busyMethods) {
        const stmts = method.getBody()?.getCfg().getStmts();
        if (!stmts) {
            return;
        }
        const curMethodSignature = method.getSignature();
        busyMethods.add(curMethodSignature);
        for (let stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const invokeSignature = invokeExpr.getMethodSignature();
            if (busyMethods.has(invokeSignature)) {
                continue;
            }
            let clazz = method.getDeclaringArkClass();
            let methodName = invokeSignature.getMethodSubSignature().getMethodName();
            let moduleName = clazz.getDeclaringArkFile().getModuleName();
            if (moduleName === undefined) {
                continue;
            }
            if (methodName === '$r') {
                let imagePath = this.getImagePath(invokeExpr, clazz, stmt);
                let imageName = imagePath.replace('app.media.', '');
                this.imageSuggest(ResourceType.MEDIA, moduleName, imageName, scene);
            }
            else if (methodName === '$rawfile') {
                let imagePath = this.getImagePath(invokeExpr, clazz, stmt);
                let imageName = path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '');
                this.imageSuggest(ResourceType.RAWFILE, moduleName, imageName, scene);
            }
            else if (methodName === 'getRawFd' || methodName === 'getRawFdSync') {
                let imagePath = this.getImagePath(invokeExpr, clazz, stmt);
                this.getRawFdProcess(imagePath, moduleName, scene);
            }
        }
        busyMethods.delete(curMethodSignature);
    }
    getImagePath(invokeExpr, clazz, stmt) {
        let arg = invokeExpr.getArg(0);
        let varInfo = new VarInfo_1.VarInfo(stmt, stmt.scope);
        return StringUtils_1.StringUtils.getStringByScope(clazz.getDeclaringArkFile(), varInfo, arg);
    }
    getRawFdProcess(imagePath, moduleName, scene) {
        let valueLowCase = imagePath.toLocaleLowerCase();
        // 不检测手机沙盒资源，网络资源，手机媒体库资源
        if (valueLowCase.includes('/data/storage/') || valueLowCase.includes('http://') || valueLowCase.includes('https://') || valueLowCase.includes('ftp://') || valueLowCase.includes('file://')) {
            return;
        }
        // 其他类型资源，可能存在本地，获取文件名后，去本地资源查找
        let imageName = path_1.default.basename(imagePath).replace(path_1.default.extname(imagePath), '');
        if (imageName === '') {
            return;
        }
        this.imageSuggest(ResourceType.RAWFILE, moduleName, imageName, scene);
    }
    mapProcess() {
        // 遍历map筛选
        for (let imageUses of moduleMediaMap.values()) {
            imageUses.forEach(imageUse => {
                if (!imageUse.inUse && path_1.default.extname(imageUse.filePath) !== '.json') {
                    this.reportIssue(imageUse.filePath);
                }
            });
        }
        for (let imageUses of moduleRawMap.values()) {
            imageUses.forEach(imageUse => {
                if (!imageUse.inUse && path_1.default.extname(imageUse.filePath) !== '.json') {
                    this.reportIssue(imageUse.filePath);
                }
            });
        }
        for (let imageUses of moduleResMap.values()) {
            imageUses.forEach(imageUse => {
                if (!imageUse.inUse && path_1.default.extname(imageUse.filePath) !== '.json') {
                    this.reportIssue(imageUse.filePath);
                }
            });
        }
    }
    reportIssue(filePath) {
        let severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(0, 0, 0, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.ResourcesFileCheck = ResourcesFileCheck;
