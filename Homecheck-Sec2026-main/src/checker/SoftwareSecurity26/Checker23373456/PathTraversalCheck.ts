import {ArkFile, Stmt} from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'PathTraversalCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects potential path traversal vulnerabilities using unvalidated file paths.'
};

export class PathTraversalCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    // 文件操作相关的方法
    private fileOperationPatterns = [
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
    private traversalPatterns = [
        /\.\.\//g, // ../
        /\.\.\\/g, // ..\
        /\$\{.*?\}/g, // 模板字符串中的变量
        /["'`]\s*\+\s*["'`]/g // 字符串拼接
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
                    if (text && this.isPathTraversalVulnerable(text)) {
                        this.reportIssue(targetFile, stmt, methodName);
                    }
                }
            }
        }
    }

    private isPathTraversalVulnerable(text: string): boolean {
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
