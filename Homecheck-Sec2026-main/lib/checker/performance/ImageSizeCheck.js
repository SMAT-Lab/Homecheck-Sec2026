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
exports.ImageSizeCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const path_1 = __importDefault(require("path"));
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const ImageUtils_1 = require("../../utils/checker/ImageUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ImageSizeCheck');
const viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const moduleMediaMap = new Map();
const moduleElementMap = new Map();
const moduleRawMap = new Map();
const moduleResMap = new Map();
const VP_TO_PX_RATIO = 4;
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/image-size-check.md',
    description: 'Set the size of the image source file properly and use the memory resources properly to reduce the application memory occupied by the image.'
};
class ImageSizeCheck {
    metaData = gMetaData;
    IMAGE = 'Image';
    WIDTH = 'width';
    HEIGHT = 'height';
    SIZE = 'size';
    CREATE = 'create';
    BACKGROUND_IMAGE = 'backgroundImage';
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
    check = (scene) => {
        if (moduleMediaMap.size === 0 || moduleRawMap.size === 0) {
            this.cacheProjectImages(scene);
        }
        for (let arkFile of scene.getFiles()) {
            for (let clazz of arkFile.getClasses()) {
                this.classProcess(arkFile, clazz);
            }
            for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
                for (let clazz of namespace.getClasses()) {
                    this.classProcess(arkFile, clazz);
                }
            }
        }
    };
    cacheProjectImages(scene) {
        let moduleScope = 'AppScope';
        let mediaDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'base', 'media');
        let elementDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'base', 'element');
        let rawDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'base', 'rawfile');
        let resDir = path_1.default.join(scene.getRealProjectDir(), moduleScope, 'resources', 'base', 'resfile');
        moduleMediaMap.set(moduleScope, Index_1.FileUtils.getAllFiles(mediaDir, []));
        moduleElementMap.set(moduleScope, Index_1.FileUtils.getAllFiles(elementDir, []));
        moduleRawMap.set(moduleScope, Index_1.FileUtils.getAllFiles(rawDir, []));
        moduleResMap.set(moduleScope, Index_1.FileUtils.getAllFiles(resDir, []));
        for (let [key, value] of scene.getModuleSceneMap()) {
            mediaDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'media');
            elementDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'element');
            rawDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'rawfile');
            resDir = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'base', 'resfile');
            moduleMediaMap.set(key, Index_1.FileUtils.getAllFiles(mediaDir, []));
            moduleElementMap.set(key, Index_1.FileUtils.getAllFiles(elementDir, []));
            moduleRawMap.set(key, Index_1.FileUtils.getAllFiles(rawDir, []));
            moduleResMap.set(key, Index_1.FileUtils.getAllFiles(resDir, []));
        }
    }
    classProcess(arkFile, clazz) {
        if (clazz.hasViewTree() && !viewTreeTool.hasTraverse(clazz)) {
            let viewTreeRoot = clazz.getViewTree()?.getRoot();
            if (viewTreeRoot) {
                this.traverseViewTree(arkFile, viewTreeRoot);
            }
        }
        for (let method of clazz.getMethods()) {
            let viewTreeRoot = method.getViewTree()?.getRoot();
            if (viewTreeRoot) {
                this.traverseViewTree(arkFile, viewTreeRoot);
            }
        }
    }
    traverseViewTree(arkFile, viewTreeRoot) {
        if (viewTreeRoot.name === this.IMAGE) {
            let size = this.getComponentSizeByWidthAndHeight(arkFile, viewTreeRoot);
            if (size.width === 0 || size.height === 0) {
                return;
            }
            let createStmt = viewTreeRoot.attributes.get(this.CREATE);
            if (!createStmt) {
                return;
            }
            this.calculateImageSize(arkFile, size, createStmt, this.IMAGE);
        }
        if (viewTreeRoot.attributes.has(this.BACKGROUND_IMAGE)) {
            let size = this.getComponentSizeByWidthAndHeight(arkFile, viewTreeRoot);
            if (size.width !== 0 && size.height !== 0) {
                let backgroundStmt = viewTreeRoot.attributes.get(this.BACKGROUND_IMAGE);
                if (backgroundStmt) {
                    this.calculateImageSize(arkFile, size, backgroundStmt, this.BACKGROUND_IMAGE);
                }
            }
        }
        if (viewTreeRoot.children.length === 0) {
            return;
        }
        for (let child of viewTreeRoot.children) {
            if (viewTreeTool.hasTraverse(viewTreeRoot)) {
                continue;
            }
            this.traverseViewTree(arkFile, child);
        }
    }
    calculateImageSize(arkFile, size, createStmt, keyword) {
        let imagePath = this.getImageResourcePath(arkFile, createStmt);
        if (!imagePath) {
            return;
        }
        const imageInfo = (0, ImageUtils_1.readImageInfo)(imagePath);
        if (!imageInfo) {
            return;
        }
        let componentSize = size.width * size.height;
        let imageSize = imageInfo.width * imageInfo.height;
        if (imageSize > componentSize) {
            this.addIssueReport(createStmt[0], keyword);
        }
    }
    getComponentSizeByWidthAndHeight(arkFile, treeNode) {
        let size = { width: 0, height: 0 };
        let attributes = treeNode.attributes;
        if (attributes.has(this.WIDTH) && attributes.has(this.HEIGHT)) {
            let widthStmt = attributes.get(this.WIDTH);
            if (!widthStmt) {
                return size;
            }
            let heightStmt = attributes.get(this.HEIGHT);
            if (!heightStmt) {
                return size;
            }
            let width = this.getValueByStmt(widthStmt[0]);
            if (width === 0) {
                return size;
            }
            let height = this.getValueByStmt(heightStmt[0]);
            if (height === 0) {
                return size;
            }
            size.width = width;
            size.height = height;
        }
        else if (attributes.has(this.SIZE)) {
            let sizeStmt = attributes.get(this.SIZE);
            if (!sizeStmt) {
                return size;
            }
            size = this.getComponentSizeBySize(arkFile, sizeStmt[0]);
        }
        return size;
    }
    getComponentSizeBySize(arkFile, sizeStmt) {
        let size = { width: 0, height: 0 };
        let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(sizeStmt);
        if (!invoker) {
            return size;
        }
        let arg0 = invoker.getArg(0);
        let type = arg0.getType();
        if (!(type instanceof lib_1.ClassType)) {
            return size;
        }
        let sizeClass = arkFile.getScene().getClass(type.getClassSignature());
        if (!sizeClass) {
            return size;
        }
        let widthField = sizeClass.getFieldWithName(this.WIDTH);
        if (!widthField) {
            return size;
        }
        let initializer = widthField.getInitializer();
        size.width = this.getValueByStmt(initializer[0]);
        let heightField = sizeClass.getFieldWithName(this.HEIGHT);
        if (!heightField) {
            return size;
        }
        initializer = heightField.getInitializer();
        size.height = this.getValueByStmt(initializer[0]);
        return size;
    }
    getImageResourcePath(arkFile, createStmt) {
        let imageName = this.getImageName(createStmt);
        let moduleName = arkFile.getModuleName();
        if (imageName === '') {
            return '';
        }
        if (moduleName === undefined) {
            return '';
        }
        let moduleImagePaths = moduleMediaMap.get(moduleName);
        if (!moduleImagePaths) {
            return '';
        }
        for (let imagePath of moduleImagePaths) {
            let baseName = path_1.default.basename(imagePath);
            if (baseName.startsWith(imageName)) {
                return imagePath;
            }
        }
        for (let [key, imagePaths] of moduleMediaMap) {
            for (let imagePath of imagePaths) {
                let baseName = path_1.default.basename(imagePath);
                if (baseName.startsWith(imageName)) {
                    return imagePath;
                }
            }
        }
        return '';
    }
    getImageName(createStmt) {
        let stmt = createStmt[0];
        let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invoker) {
            return '';
        }
        let arg0 = invoker.getArg(0);
        if (!(arg0 instanceof lib_1.Local)) {
            return '';
        }
        let declaringStmt = arg0.getDeclaringStmt();
        if (!declaringStmt) {
            return '';
        }
        if (!(declaringStmt instanceof lib_1.ArkAssignStmt)) {
            return '';
        }
        let argInvoker = Index_1.CheckerUtils.getInvokeExprFromStmt(declaringStmt);
        if (!argInvoker) {
            return '';
        }
        let methodName = argInvoker.getMethodSignature().getMethodSubSignature().getMethodName();
        if (methodName !== '$r') {
            return '';
        }
        let argRes = argInvoker.getArg(0);
        if (!(argRes instanceof Constant_1.StringConstant)) {
            return '';
        }
        let imageName = argRes.getValue().split('.')[2];
        return imageName;
    }
    getValueByStmt(initStmt) {
        let invoker = Index_1.CheckerUtils.getInvokeExprFromStmt(initStmt);
        if (invoker) {
            let arg0 = invoker.getArg(0);
            return this.getArgValue(arg0);
        }
        if (initStmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = initStmt.getRightOp();
            return this.getArgValue(rightOp);
        }
        return 0;
    }
    getArgValue(arg0) {
        if (arg0 instanceof Constant_1.NumberConstant) {
            let value = arg0.getValue();
            return Number(value) * VP_TO_PX_RATIO;
        }
        if (arg0 instanceof Constant_1.StringConstant) {
            let value = arg0.getValue();
            if (value.endsWith('px')) {
                return Number(value.replace('px', ''));
            }
            if (value.endsWith('vp')) {
                return Number(value.replace('vp', '')) * VP_TO_PX_RATIO;
            }
        }
        if (arg0 instanceof lib_1.Local) {
            return 0;
        }
        return 0;
    }
    addIssueReport(stmt, keyword) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt, keyword);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(stmt, keyword) {
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition?.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text?.length === 0) {
            return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        if (!arkFile) {
            logger.debug('ArkFile is null.');
            return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
        }
        let startCol = 0;
        let originalTexts = text.split('\n');
        let lineCount = -1;
        for (let originalText of originalTexts) {
            lineCount++;
            if (!originalText.includes(keyword)) {
                continue;
            }
            if (lineCount === 0) {
                startCol = originalText.indexOf(this.IMAGE) + originPosition.getColNo();
            }
            else {
                startCol = originalText.indexOf(keyword) + 1;
            }
            break;
        }
        let lineNum = line + lineCount;
        let endCol = startCol + keyword.length - 1;
        const originPath = arkFile.getFilePath();
        return { lineNum, startCol, endCol, filePath: originPath };
    }
}
exports.ImageSizeCheck = ImageSizeCheck;
