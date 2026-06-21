import { ArkFile, ArkInstanceInvokeExpr, Constant, Stmt } from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';


const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'HttpPlaintextCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects http plaintext.'
};

export class HttpPlaintextCheck implements BaseChecker {
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

    // 检测 http 调用
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

                    // 扫描语句原始文本，匹配 .request("http://...") 或 .request('http://...')
                    // 不用依赖 AST 类型推断（局部变量上的实例方法调用可能推断失败）
                    let reported = false;
                    for (const expr of stmt.getExprs()) {
                        if (expr instanceof ArkInstanceInvokeExpr) {
                            const callName = expr.getMethodSignature()
                                .getMethodSubSignature().getMethodName();
                            if (callName === "request" && expr.getArgs().length > 0) {
                                const firstArg = expr.getArg(0);
                                if (firstArg instanceof Constant) {
                                    const value = firstArg.getValue();
                                    if (typeof value === 'string' && value.startsWith('http://')) {
                                        this.reportIssue(targetFile, stmt, methodName);
                                        reported = true;
                                    }
                                }
                            }
                        }
                    }

                    // 文本回退：AST 没匹配到但实际代码存在 http 请求
                    if (!reported) {
                        const text = stmt.getOriginalText();
                        if (text && /\.request\s*\(\s*["']http:\/\//.test(text)) {
                            this.reportIssue(targetFile, stmt, methodName);
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