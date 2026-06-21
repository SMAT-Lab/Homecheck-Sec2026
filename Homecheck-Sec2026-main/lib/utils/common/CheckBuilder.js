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
exports.projectCheckBuilder = exports.fileCheckBuilder = void 0;
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
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const File2Check_1 = require("../../model/File2Check");
const Project2Check_1 = require("../../model/Project2Check");
const CheckerFactory_1 = require("./CheckerFactory");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CheckBuilder');
function fileCheckBuilder(arkFile, enabledRules) {
    let checkIns = new File2Check_1.File2Check();
    checkIns.arkFile = arkFile;
    enabledRules.forEach(rule => {
        const checkerInstance = CheckerFactory_1.CheckerFactory.getChecker(rule);
        if (checkerInstance) {
            checkIns.addChecker(rule.ruleId, checkerInstance);
        }
        else {
            logger.error(`Cannot find checker according rule id: ${rule.ruleId}`);
        }
    });
    return checkIns;
}
exports.fileCheckBuilder = fileCheckBuilder;
function projectCheckBuilder(arkFiles, enabledRules) {
    let checkIns = new Project2Check_1.Project2Check();
    checkIns.arkFiles = arkFiles;
    enabledRules.forEach(rule => {
        const checkerInstance = CheckerFactory_1.CheckerFactory.getChecker(rule);
        if (checkerInstance) {
            checkIns.addChecker(rule.ruleId, checkerInstance);
        }
        else {
            logger.log(`Cannot find checker according rule id: ${rule.ruleId}`);
        }
    });
    return checkIns;
}
exports.projectCheckBuilder = projectCheckBuilder;
