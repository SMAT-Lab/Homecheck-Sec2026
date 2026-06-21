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
exports.ModuleDeps = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const moduleComponent_1 = require("./moduleComponent");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const utils_1 = require("./utils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.TOOL, 'moduleDeps');
class ModuleDeps {
    static instance;
    constructor() {
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new ModuleDeps();
        }
        return this.instance;
    }
    addDeps(depsGraph, src) {
        const moduleOhPkgPath = path_1.default.join(src.getNodeAttr().name, arkanalyzer_1.OH_PACKAGE_JSON5);
        if (moduleOhPkgPath) {
            const dstNodes = this.getDstDeps(moduleOhPkgPath);
            dstNodes.forEach((dstNode) => {
                if (!depsGraph.hasDepsNode(dstNode.name)) {
                    const dst = depsGraph.addDepsNode(dstNode.name, dstNode);
                    const edge = depsGraph.addEdge(src, dst, { kind: 0 });
                    this.addDeps(depsGraph, dst);
                }
            });
        }
    }
    getDstDeps(ohPkgPath) {
        let dstDeps = [];
        const ohContent = (0, arkanalyzer_1.fetchDependenciesFromFile)(ohPkgPath);
        let depMaps = new Map();
        if (ohContent && ohContent.dependencies) {
            Object.entries(ohContent.dependencies).forEach(([name, value]) => {
                dstDeps.push(this.genDstNode(name, value, ohPkgPath));
            });
        }
        return dstDeps;
    }
    genDstNode(key, value, ohPkgPath) {
        if (value.startsWith('tag:')) {
            return {
                name: path_1.default.join(path_1.default.dirname(ohPkgPath), utils_1.OH_MODULES_DIR, key),
                kind: moduleComponent_1.ModuleCategory.TAGGED_PACKAGE,
                tag: value.replace(/^tag:/, ''),
            };
        }
        else if (/^(file:|\.\/|\.\.\/)/.test(value)) {
            return this.handleLocal(key, value.replace(/^file:/, ''), ohPkgPath);
        }
        else if (/^[~^0-9]/.test(value)) {
            return {
                name: path_1.default.join(path_1.default.dirname(ohPkgPath), utils_1.OH_MODULES_DIR, key),
                kind: moduleComponent_1.ModuleCategory.THIRD_PARTY_PACKAGE,
                tag: value,
            };
        }
        else {
            return {
                name: `Unknown: key is ${key}, value is ${value}, module path is ${path_1.default.dirname(ohPkgPath)}.`,
                kind: moduleComponent_1.ModuleCategory.UNKNOWN,
            };
        }
    }
    handleLocal(moduleName, modulePath, ohPkgPath) {
        const moduleInstalledPath = path_1.default.join(path_1.default.dirname(ohPkgPath), utils_1.OH_MODULES_DIR, moduleName);
        const originPkgPath = path_1.default.join(path_1.default.dirname(ohPkgPath), modulePath);
        const isDir = fs_1.default.statSync(originPkgPath).isDirectory();
        let moduleKind = (0, utils_1.getModuleKind)(moduleInstalledPath);
        if (moduleKind === moduleComponent_1.ModuleCategory.UNKNOWN && (modulePath.endsWith('.hsp') || modulePath.endsWith('.tgz'))) {
            moduleKind = moduleComponent_1.ModuleCategory.HSP;
        }
        else if (moduleKind === moduleComponent_1.ModuleCategory.UNKNOWN && (modulePath.endsWith('.har'))) {
            moduleKind = moduleComponent_1.ModuleCategory.HAR;
        }
        return {
            name: isDir ? originPkgPath : moduleInstalledPath,
            kind: moduleKind,
            originPath: isDir ? undefined : originPkgPath,
        };
    }
}
exports.ModuleDeps = ModuleDeps;
