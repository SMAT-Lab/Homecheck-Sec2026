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
exports.DarkColorModeCheck = void 0;
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'DarkColorModeCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/dark-color-mode-check.md',
    description: 'Properly adapt to the dark mode.'
};
class DarkColorModeCheck {
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
    check = (scene) => {
        for (let [key, value] of scene.getModuleSceneMap()) {
            let darkFilePath = path_1.default.join(value.getModulePath(), 'src', 'main', 'resources', 'dark');
            if (!(0, fs_1.existsSync)(darkFilePath)) {
                this.reportIssue(path_1.default.join(value.getModulePath(), 'src', 'main', 'module.json5'));
            }
        }
    };
    reportIssue(filePath) {
        let severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(0, 0, 0, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.DarkColorModeCheck = DarkColorModeCheck;
