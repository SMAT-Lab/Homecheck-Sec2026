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
exports.getModuleKind = exports.OH_MODULES_DIR = void 0;
const fs_1 = __importDefault(require("fs"));
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const path_1 = __importDefault(require("path"));
const moduleComponent_1 = require("./moduleComponent");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.TOOL, 'depGraphUtils');
exports.OH_MODULES_DIR = './oh_modules/';
function getModuleKind(modulePath) {
    const moduleJson5Path = path_1.default.join(modulePath, './src/main/module.json5');
    const content = (0, arkanalyzer_1.fetchDependenciesFromFile)(moduleJson5Path);
    if (!content.type) {
        switch (content.type) {
            case 'entry':
                return moduleComponent_1.ModuleCategory.ENTRY;
            case 'feature':
                return moduleComponent_1.ModuleCategory.FEATURE;
            case 'har':
                return moduleComponent_1.ModuleCategory.HAR;
            case 'shared':
                return moduleComponent_1.ModuleCategory.HSP;
            default:
                break;
        }
    }
    const ohPkgPath = path_1.default.join(modulePath, arkanalyzer_1.OH_PACKAGE_JSON5);
    if (!fs_1.default.existsSync(ohPkgPath)) {
        return moduleComponent_1.ModuleCategory.UNKNOWN;
    }
    const ohPkgContent = (0, arkanalyzer_1.fetchDependenciesFromFile)(ohPkgPath);
    if (ohPkgContent.packageType) {
        return moduleComponent_1.ModuleCategory.HSP;
    }
    else {
        return moduleComponent_1.ModuleCategory.HAR;
    }
}
exports.getModuleKind = getModuleKind;
