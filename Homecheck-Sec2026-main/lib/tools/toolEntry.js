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
exports.Tools = exports.runTool = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const BuildModuleChains_1 = require("./BuildModuleChains");
const ProjectConfig_1 = require("../model/ProjectConfig");
const FileUtils_1 = require("../utils/common/FileUtils");
const builder_1 = require("./depGraph/builder");
const Index_1 = require("../Index");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.TOOL, 'runTool');
function runTool(tool, argvObj) {
    const startTime = new Date().getTime();
    const projectConfig = new ProjectConfig_1.ProjectConfig(Index_1.ConfigUtils.getConfig(argvObj.projectConfigPath));
    let depGraphOutputDir = argvObj.depGraphOutputDir;
    try {
        // 日志配置
        Index_1.ConfigUtils.setLogConfig(projectConfig);
        logger.info('start to run tool...');
        const scene = buildScene(projectConfig);
        if (!scene) {
            return;
        }
        // 运行对应工具模块
        switch (tool) {
            case Tools.ImportChains:
                logger.info('start to buildModuleChains...');
                (0, BuildModuleChains_1.buildModuleChains)(scene, [], projectConfig.reportDir);
                logger.info('buildModuleChains completed.');
                break;
            case Tools.DepGraph:
                if (!depGraphOutputDir) {
                    logger.warn('The output directory of dependency graph is not set, by default it will be set to current directory.');
                    depGraphOutputDir = './';
                }
                if (!fs_1.default.existsSync(depGraphOutputDir)) {
                    logger.error(`The given depGraphOutputDir: ${depGraphOutputDir} is not exist.`);
                    process.exit(-1);
                }
                genFileDepGraph(depGraphOutputDir, scene.getFiles());
                genModuleDepGraph(depGraphOutputDir, scene);
                break;
            default:
                logger.error(`Unknown tool: ${tool}`);
                break;
        }
    }
    catch (error) {
        logger.error(`Error occurred: ${error.message}`);
        return;
    }
    const endTime = new Date().getTime();
    logger.info(`HomeCheck tools took: ${(endTime - startTime) / 1000}s`);
}
exports.runTool = runTool;
function buildScene(projectConfig) {
    try {
        // 构建SceneConfig
        const config = new arkanalyzer_1.SceneConfig();
        const fileList = FileUtils_1.FileUtils.getAllFiles(projectConfig.projectPath, ['.ts', '.ets']);
        config.buildFromProjectFiles(projectConfig.projectName, projectConfig.projectPath, fileList, FileUtils_1.FileUtils.genSdks(projectConfig));
        logger.info('Build sceneConfig completed.');
        // 构建Scene
        const scene = new arkanalyzer_1.Scene();
        scene.buildSceneFromFiles(config);
        logger.info('Build scene completed.');
        scene.inferTypes();
        logger.info('Infer types completed.');
        return scene;
    }
    catch (error) {
        logger.error(`Build scene or infer types error: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        return null;
    }
}
function genFileDepGraph(outputPath, arkFiles) {
    const fileDepGraphJson = path_1.default.join(outputPath, './fileDepGraph.json');
    const fileDepGraphDot = path_1.default.join(outputPath, './fileDepGraph.dot');
    logger.info('Started to build file dependency graph...');
    const depGraph = (0, builder_1.buildFileDepGraph)(arkFiles);
    const jsonRes = JSON.stringify(depGraph.toJson());
    FileUtils_1.FileUtils.writeToFile(fileDepGraphJson, jsonRes, FileUtils_1.WriteFileMode.OVERWRITE);
    logger.info('Building dependency graph in json format has completed.');
    const dotRes = depGraph.dump();
    FileUtils_1.FileUtils.writeToFile(fileDepGraphDot, dotRes, FileUtils_1.WriteFileMode.OVERWRITE);
    logger.info('Building dependency graph in dot format has completed.');
    logger.info('Building file dependency graph completed.');
}
function genModuleDepGraph(outputPath, scene) {
    const moduleDepGraphJson = path_1.default.join(outputPath, './moduleDepGraph.json');
    const moduleDepGraphDot = path_1.default.join(outputPath, './moduleDepGraph.dot');
    logger.info('Started to build module dependency graph...');
    const depGraph = (0, builder_1.buildModuleDepGraph)(scene);
    const jsonRes = JSON.stringify(depGraph.toJson());
    FileUtils_1.FileUtils.writeToFile(moduleDepGraphJson, jsonRes, FileUtils_1.WriteFileMode.OVERWRITE);
    logger.info('Building module graph in json format has completed.');
    const dotRes = depGraph.dump();
    FileUtils_1.FileUtils.writeToFile(moduleDepGraphDot, dotRes, FileUtils_1.WriteFileMode.OVERWRITE);
    logger.info('Building module graph in dot format has completed.');
    logger.info('Building file module graph completed.');
}
var Tools;
(function (Tools) {
    Tools[Tools["ImportChains"] = 0] = "ImportChains";
    Tools[Tools["DepGraph"] = 1] = "DepGraph";
})(Tools = exports.Tools || (exports.Tools = {}));
