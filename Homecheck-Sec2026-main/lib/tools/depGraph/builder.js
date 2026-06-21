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
exports.buildModuleDepGraph = exports.buildFileDepGraph = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const fileComponent_1 = require("./fileComponent");
const fileDeps_1 = require("./fileDeps");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const moduleComponent_1 = require("./moduleComponent");
const moduleDeps_1 = require("./moduleDeps");
const utils_1 = require("./utils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.TOOL, 'DepGraph');
function buildFileDepGraph(arkFiles) {
    let depGraph = new fileComponent_1.FileDepsGraph();
    let arkFileDeps = fileDeps_1.ArkFileDeps.getInstance();
    arkFiles.forEach(arkFile => {
        const nodeAttr = {
            name: arkFile.getFilePath(),
            kind: 0,
        };
        let srcNode = depGraph.addDepsNode(arkFile.getFilePath(), nodeAttr);
        arkFileDeps.addDeps(depGraph, srcNode, arkFile);
    });
    return depGraph;
}
exports.buildFileDepGraph = buildFileDepGraph;
function buildModuleDepGraph(scene) {
    let moduleGraph = new moduleComponent_1.ModuleDepsGraph();
    let moduleDeps = moduleDeps_1.ModuleDeps.getInstance();
    const modules = getModules(scene.getRealProjectDir());
    modules.forEach((modulePath) => {
        logger.info(`Project module: ${modulePath} found.`);
        const nodeAttr = {
            name: modulePath,
            kind: (0, utils_1.getModuleKind)(modulePath),
        };
        if (!moduleGraph.hasDepsNode(modulePath)) {
            let srcNode = moduleGraph.addDepsNode(modulePath, nodeAttr);
            moduleDeps.addDeps(moduleGraph, srcNode);
        }
    });
    return moduleGraph;
}
exports.buildModuleDepGraph = buildModuleDepGraph;
function getModules(projectPath) {
    const buildProfile = path_1.default.join(projectPath, arkanalyzer_1.BUILD_PROFILE_JSON5);
    let modulePaths = [];
    if (fs_1.default.existsSync(buildProfile)) {
        let configurationsText;
        try {
            configurationsText = fs_1.default.readFileSync(buildProfile, 'utf-8');
        }
        catch (error) {
            logger.error(`Error reading file: ${error}`);
            return modulePaths;
        }
        const buildProfileJson = (0, arkanalyzer_1.parseJsonText)(configurationsText);
        const modules = buildProfileJson.modules;
        if (modules instanceof Array) {
            modules.forEach((module) => {
                modulePaths.push(path_1.default.resolve(projectPath, module.srcPath));
            });
        }
    }
    else {
        logger.warn('There is no build-profile.json5 for this project.');
    }
    return modulePaths;
}
