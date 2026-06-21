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
exports.PathTraversalCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../../Index");
const Index_2 = require("../../../Index");
const Defects_1 = require("../../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PathTraversalCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects potential path traversal vulnerabilities using unvalidated file paths.'
};
class PathTraversalCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    // 文件操作相关的方法
    fileOperationPatterns = [
        /readFile\s*\(/gi,
        /writeFile\s*\(/gi,
        /readFileSync\s*\(/gi,
        /writeFileSync\s*\(/gi,
        /open\s*\(/gi,
        /access\s*\(/gi,
        /unlink\s*\(/gi,
        /mkdir\s*\(/gi,
        /resolve\s*\(/gi,
        /join\s*\(/gi
    ];
    // 路径遍历相关的模式
    traversalPatterns = [
        /\.\.\//g,
        /\.\.\\/g,
        /\$\{.*?\}/g,
        /["'`]\s*\+\s*["'`]/g // 字符串拼接
    ];
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        for (const arkClass of targetFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                if (arkMethod.getName() == '_DEFAULT_ARK_METHOD') {
                    continue;
                }
                const methodName = arkMethod.getName();
                const cfg = arkMethod.getCfg();
                if (cfg == undefined) {
                    continue;
                }
                for (const stmt of cfg.getStmts()) {
                    const text = stmt.getOriginalText();
                    if (text && this.isPathTraversalVulnerable(text)) {
                        this.reportIssue(targetFile, stmt, methodName);
                    }
                }
            }
        }
    };
    isPathTraversalVulnerable(text) {
        // 检查是否包含文件操作
        let hasFileOperation = false;
        for (const pattern of this.fileOperationPatterns) {
            if (pattern.test(text)) {
                hasFileOperation = true;
                break;
            }
        }
        if (!hasFileOperation) {
            return false;
        }
        // 检查是否有路径遍历相关的操作
        for (const pattern of this.traversalPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }
    reportIssue(arkFile, stmt, methodName) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const startColumn = originPositionInfo.getColNo();
        const endColunm = startColumn + text.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.PathTraversalCheck = PathTraversalCheck;
