import {ArkFile, Stmt} from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'HardcodedSecretCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects hardcoded secrets like passwords, API keys, and tokens.'
};

export class HardcodedSecretCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    // 检测硬编码密钥的关键词
    private secretPatterns = [
        /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /apiKey\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /token\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /AKIA[0-9A-Z]{16}/g, // AWS key pattern
        /sk-[a-zA-Z0-9]{48,}/g // OpenAI key pattern
    ];

    public registerMatchers(): MatcherCallback[] {
        const fileMatchBuildCb: MatcherCallback = {
            matcher: this.fileMatcher,
            callback: this.check
        }
        return [fileMatchBuildCb];
    }

    public check = (targetFile: ArkFile) => {
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
    }

    private containsHardcodedSecret(text: string): boolean {
        for (const pattern of this.secretPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }

    public reportIssue(arkFile: ArkFile, stmt: Stmt, methodName: string): void {
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
        let defects = new Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}
