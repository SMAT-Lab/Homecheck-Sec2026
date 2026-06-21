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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeCheckFixEngine = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = require("fs-extra");
const FileUtils_1 = require("../../utils/common/FileUtils");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const FixUtils_1 = require("../../utils/common/FixUtils");
const FIX_OUTPUT_DIR = './fixedCode';
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'HomeCheckFixEngine');
class HomeCheckFixEngine {
    constructor() {
        (0, fs_extra_1.removeSync)(FIX_OUTPUT_DIR);
    }
    applyFix(arkFile, issues) {
        let fixPath = '';
        const remainIssues = [];
        for (let issue of issues) {
            let fix = issue.fix;
            if (fix === undefined) {
                remainIssues.push(issue);
                continue;
            }
            if (!FixUtils_1.FixUtils.isFunctionFix(fix)) {
                remainIssues.push(issue);
                continue;
            }
            let functionFix = fix;
            if (!issue.defect.fixable) {
                remainIssues.push(issue);
                continue;
            }
            if (!functionFix.fix(arkFile, issue.defect.fixKey)) {
                remainIssues.push(issue);
                continue;
            }
            fixPath = path_1.default.join(FIX_OUTPUT_DIR, arkFile.getName() + '.fix');
            if (this.arkFileToFile(arkFile, fixPath)) {
                functionFix.fixed = true;
                break;
            }
        }
        return { defects: remainIssues.map((issue => issue.defect)), output: '', filePath: fixPath };
    }
    arkFileToFile(arkFile, outputPath) {
        if (!arkFile) {
            return false;
        }
        const printer = new arkanalyzer_1.SourceFilePrinter(arkFile);
        try {
            FileUtils_1.FileUtils.writeToFile(outputPath, printer.dump(), FileUtils_1.WriteFileMode.OVERWRITE);
            return true;
        }
        catch (e) {
            logger.error(e);
            return false;
        }
    }
}
exports.HomeCheckFixEngine = HomeCheckFixEngine;
