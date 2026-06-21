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
exports.StartWindowIconCheck = void 0;
const fs_1 = require("fs");
const arkanalyzer_1 = require("arkanalyzer");
const fs_2 = __importDefault(require("fs"));
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const path_1 = __importDefault(require("path"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const ImageUtils_1 = require("../../utils/checker/ImageUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'StartWindowIconCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/start-window-icon-check.md',
    description: 'For faster app startup, keep the startup icon size within 256 x 256 pixels.'
};
class StartWindowIconCheck {
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
        let moduleJson5Files = this.getJson5Files(scene.getRealProjectDir(), ['.json5']);
        for (let filePath of moduleJson5Files) {
            if (filePath.endsWith('module.json5')) {
                const jsonData = (0, arkanalyzer_1.fetchDependenciesFromFile)(filePath);
                let module = jsonData.module;
                let type = module.type;
                if (type !== 'entry') {
                    continue;
                }
                let mainElement = module.mainElement;
                if (mainElement === undefined) {
                    continue;
                }
                let abilities = module.abilities;
                if (abilities === undefined) {
                    continue;
                }
                for (let ability of abilities) {
                    this.iconCheckByAbility(ability, mainElement, filePath);
                }
            }
        }
    };
    iconCheckByAbility(ability, mainElement, filePath) {
        let abilityName = ability.name;
        if (abilityName === mainElement) {
            let startWindowIcon = ability.startWindowIcon;
            if (startWindowIcon !== undefined && startWindowIcon.startsWith('$media:')) {
                this.iconCheckByIcon(startWindowIcon, filePath, abilityName);
            }
        }
    }
    iconCheckByIcon(startWindowIcon, filePath, abilityName) {
        try {
            let iconName = startWindowIcon.substring(startWindowIcon.indexOf(':') + 1);
            let subReadFilePath = filePath.substring(0, filePath.lastIndexOf('src'));
            subReadFilePath = path_1.default.join(subReadFilePath, 'src', 'main', 'resources', 'base', 'media');
            if (!this.pathExistsSync(subReadFilePath)) {
                logger.warn(`No permission to access the icon search path ${subReadFilePath}`);
                return;
            }
            for (let name of fs_2.default.readdirSync(subReadFilePath)) {
                if (name.split('.')[0] === iconName) {
                    this.iconCheckByIconPath(subReadFilePath, name, filePath, abilityName);
                }
            }
        }
        catch (e) {
            logger.warn(`StartWindowIconCheck error`, e);
        }
    }
    iconCheckByIconPath(subReadFilePath, name, filePath, abilityName) {
        let isReport = this.iconCheck(path_1.default.join(subReadFilePath, name));
        if (isReport) {
            const warnInfo = this.getWarnInfo(filePath, abilityName);
            const severity = this.rule.alert ?? this.metaData.severity;
            let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    pathExistsSync(path) {
        try {
            (0, fs_1.accessSync)(path, fs_1.constants.F_OK);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    getWarnInfo(filePath, abilityName) {
        let line = 0;
        let isAbilities = false;
        let isAbilityName = false;
        let isTargetsAbility = false;
        let isStartWindowIcon = false;
        let readData = fs_2.default.readFileSync(filePath, 'utf8');
        let readLines = readData.split('\n');
        let warnInfo = { line: -1, startCol: -1, endCol: -1 };
        for (let readLine of readLines) {
            line++;
            let lineData = readLine.split(':');
            if (readLine.includes('"abilities"')) {
                isAbilities = true;
            }
            else if (isAbilities && lineData[0].includes('"name"')) {
                isAbilityName = true;
                if (lineData[1].includes(abilityName)) {
                    isTargetsAbility = true;
                }
            }
            else if (isAbilities && lineData[0].includes('"startWindowIcon"')) {
                isStartWindowIcon = true;
                warnInfo.line = line;
                warnInfo.startCol = readLine.indexOf(':') + 2;
                warnInfo.endCol = readLine.lastIndexOf('"') + 1;
            }
            if (isAbilityName && isStartWindowIcon) {
                if (isTargetsAbility) {
                    return warnInfo;
                }
                isAbilityName = false;
                isStartWindowIcon = false;
            }
        }
        return warnInfo;
    }
    iconCheck(iconPath) {
        try {
            const info = (0, ImageUtils_1.readImageInfo)(iconPath);
            if (info === undefined) {
                return false;
            }
            const maxSize = 256 * 256;
            if (info.width !== undefined && info.height !== undefined) {
                const iconSize = info.width * info.height;
                if (iconSize > maxSize) {
                    return true;
                }
            }
        }
        catch (err) {
            logger.warn(`Error for check icon: ${err}`);
        }
        return false;
    }
    getJson5Files(srcPath, exts, filenameArr = [], visited = new Set()) {
        if (!fs_2.default.existsSync(srcPath)) {
            logger.warn('Input directory is not exist, please check!');
            return filenameArr;
        }
        const realSrc = fs_2.default.realpathSync(srcPath);
        if (visited.has(realSrc)) {
            return filenameArr;
        }
        visited.add(realSrc);
        let fileNames = fs_2.default.readdirSync(realSrc);
        fileNames.forEach((fileName) => {
            if (fileName !== 'oh_modules' &&
                fileName !== 'node_modules' &&
                fileName !== 'hvigorfile.ts' &&
                fileName !== 'ohosTest' &&
                fileName !== 'build') {
                const realFile = path_1.default.resolve(realSrc, fileName);
                if (fs_2.default.statSync(realFile).isDirectory()) {
                    this.getJson5Files(realFile, exts, filenameArr, visited);
                }
                else if (exts.includes(path_1.default.extname(fileName))) {
                    filenameArr.push(realFile);
                }
            }
        });
        return filenameArr;
    }
}
exports.StartWindowIconCheck = StartWindowIconCheck;
