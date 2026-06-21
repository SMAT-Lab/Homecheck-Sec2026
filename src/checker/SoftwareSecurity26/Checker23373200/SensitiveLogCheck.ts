import { ArkFile, ArkInstanceInvokeExpr, ArkStaticInvokeExpr, Constant, Stmt } from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'SensitiveLogCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects sensitive log output.'
};

const SENSITIVE_KEYWORDS = ['password', 'pwd', 'token', 'secret', 'credential', 'apikey', 'api_key', 'privatekey', 'session'];

export class SensitiveLogCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

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
                if (cfg == undefined) continue;

                for (const stmt of cfg.getStmts()) {
                    if (stmt.getExprs().length === 0) continue;

                    for (const expr of stmt.getExprs()) {
                        if (expr instanceof ArkStaticInvokeExpr || expr instanceof ArkInstanceInvokeExpr) {
                            const callName = expr.getMethodSignature()
                                .getMethodSubSignature().getMethodName();
                            if (['log', 'info', 'warn', 'error', 'debug'].includes(callName)) {
                                // 直接扫描语句原始文本中的敏感关键词
                                // 能匹配模板字符串 console.info(`...${password}...`)
                                // 和字符串拼接 console.log('...' + token) 等所有形式
                                const text = stmt.getOriginalText();
                                if (text && SENSITIVE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) {
                                    this.reportIssue(targetFile, stmt, methodName);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
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
        const startColumn = originPositionInfo.getColNo() + text.lastIndexOf(methodName);
        const endColunm = startColumn + methodName.length;
        let defects = new Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}