import {ArkFile, Stmt} from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'SQLInjectionCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects potential SQL injection vulnerabilities via string concatenation in queries.'
};

export class SQLInjectionCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    // SQL相关的方法名和关键词
    private sqlPatterns = [
        /query\s*\(/gi,
        /execute\s*\(/gi,
        /SELECT\s+\*/gi,
        /INSERT\s+INTO/gi,
        /UPDATE\s+/gi,
        /DELETE\s+FROM/gi,
        /WHERE\s+/gi
    ];

    // 字符串拼接的危险模式
    private concatenationPatterns = [
        /\$\{.*?\}/g, // 模板字符串
        /"\s*\+\s*"/g, // 字符串加法
        /'\s*\+\s*'/g, // 字符串加法
        /`.*?\${/g    // 模板字符串
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
                    if (text && this.isSQLInjectionVulnerable(text)) {
                        this.reportIssue(targetFile, stmt, methodName);
                    }
                }
            }
        }
    }

    private isSQLInjectionVulnerable(text: string): boolean {
        // 检查是否包含SQL操作
        let hasSQLOperation = false;
        for (const pattern of this.sqlPatterns) {
            if (pattern.test(text)) {
                hasSQLOperation = true;
                break;
            }
        }

        if (!hasSQLOperation) {
            return false;
        }

        // 检查是否有字符串拼接
        for (const pattern of this.concatenationPatterns) {
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
