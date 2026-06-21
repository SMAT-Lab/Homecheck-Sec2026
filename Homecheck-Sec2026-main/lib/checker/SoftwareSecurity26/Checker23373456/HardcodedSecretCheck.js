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
exports.HardcodedSecretCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../../Index");
const Index_2 = require("../../../Index");
const Defects_1 = require("../../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'HardcodedSecretCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects hardcoded secrets like passwords, API keys, and tokens.'
};
class HardcodedSecretCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    // 检测硬编码密钥的关键词
    secretPatterns = [
        /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /apiKey\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /AKIA[0-9A-Z]{16}/g,
        /sk-[a-zA-Z0-9]{48,}/g // OpenAI key pattern
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
                    if (text && this.containsHardcodedSecret(text)) {
                        this.reportIssue(targetFile, stmt, methodName);
                    }
                }
            }
        }
    };
    containsHardcodedSecret(text) {
        for (const pattern of this.secretPatterns) {
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
exports.HardcodedSecretCheck = HardcodedSecretCheck;
