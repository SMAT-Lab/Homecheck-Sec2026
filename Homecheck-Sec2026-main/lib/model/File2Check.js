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
exports.File2Check = void 0;
const Matchers_1 = require("../matcher/Matchers");
const matchFiles_1 = require("../matcher/matcherAdapter/matchFiles");
const matchNameSpaces_1 = require("../matcher/matcherAdapter/matchNameSpaces");
const matchClass_1 = require("../matcher/matcherAdapter/matchClass");
const matchMethods_1 = require("../matcher/matcherAdapter/matchMethods");
const matchFields_1 = require("../matcher/matcherAdapter/matchFields");
const FileUtils_1 = require("../utils/common/FileUtils");
const Disable_1 = require("../utils/common/Disable");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'File2Check');
class File2Check {
    arkFile;
    enabledRuleCheckerMap = new Map();
    issues = [];
    flMatcherMap = new Map();
    nsMatcherMap = new Map();
    clsMatcherMap = new Map();
    mtdMatcherMap = new Map();
    fieldMatcherMap = new Map();
    constructor() {
    }
    addChecker(ruleId, checker) {
        this.enabledRuleCheckerMap.set(ruleId, checker);
    }
    collectMatcherCallbacks() {
        this.enabledRuleCheckerMap.forEach(checker => {
            const matcherCallbacks = checker.registerMatchers();
            matcherCallbacks.forEach(obj => {
                const matcher = obj.matcher;
                const callback = obj.callback;
                switch (matcher?.matcherType) {
                    case Matchers_1.MatcherTypes.FILE:
                        this.flMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.NAMESPACE:
                        this.nsMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.CLASS:
                        this.clsMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.METHOD:
                        this.mtdMatcherMap.set(matcher, callback);
                        break;
                    case Matchers_1.MatcherTypes.FIELD:
                        this.fieldMatcherMap.set(matcher, callback);
                        break;
                }
            });
        });
    }
    async emitCheck() {
        this.flMatcherMap.forEach((callback, matcher) => {
            (0, matchFiles_1.matchFiles)([this.arkFile], matcher, callback);
        });
        this.nsMatcherMap.forEach((callback, matcher) => {
            (0, matchNameSpaces_1.matchNameSpaces)([this.arkFile], matcher, callback);
        });
        this.clsMatcherMap.forEach((callback, matcher) => {
            (0, matchClass_1.matchClass)([this.arkFile], matcher, callback);
        });
        this.mtdMatcherMap.forEach((callback, matcher) => {
            (0, matchMethods_1.matchMethods)([this.arkFile], matcher, callback);
        });
        this.fieldMatcherMap.forEach((callback, matcher) => {
            (0, matchFields_1.matchFields)([this.arkFile], matcher, callback);
        });
    }
    collectIssues() {
        this.enabledRuleCheckerMap.forEach((v, k) => {
            this.issues.push(...(v.issues?.reduce((acc, cur) => {
                if (acc.some((item) => item.defect.mergeKey === cur.defect.mergeKey)) {
                    logger.debug('Skip the repeated issue, please check. issue.mergeKey = ' + cur.defect.mergeKey);
                }
                else {
                    acc.push(cur);
                }
                return acc;
            }, [])));
        });
    }
    async checkDisable() {
        const fileLineList = await FileUtils_1.FileUtils.readLinesFromFile(this.arkFile.getFilePath());
        this.issues = (0, Disable_1.filterDisableIssue)(fileLineList, this.issues);
    }
    async run() {
        this.collectMatcherCallbacks();
        await this.emitCheck();
        this.collectIssues();
        await this.checkDisable();
    }
}
exports.File2Check = File2Check;
