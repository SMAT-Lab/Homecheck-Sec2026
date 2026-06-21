import { ArkFile, ArkInstanceInvokeExpr, Stmt, ArkNormalBinopExpr, ArkAssignStmt, Local } from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'SqlInjectionCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects sql injection.'
};

export class SqlInjectionCheck implements BaseChecker {
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
                if (arkMethod.getName() == '_DEFAULT_ARK_METHOD') continue;
                const methodName = arkMethod.getName();
                const cfg = arkMethod.getCfg();
                if (cfg == undefined) continue;

                // 第一遍：收集所有字符串拼接赋值 (如 let sql = "SELECT ..." + name)
                const concatVars = new Set<string>();
                for (const stmt of cfg.getStmts()) {
                    if (stmt instanceof ArkAssignStmt) {
                        const leftOp = stmt.getLeftOp();
                        const rightOp = stmt.getRightOp();
                        if (leftOp instanceof Local && rightOp instanceof ArkNormalBinopExpr) {
                            const op = rightOp.getOperator();
                            if (op === '+') {
                                concatVars.add(leftOp.getName());
                            }
                        }
                    }
                }

                // 第二遍：检测 querySql/executeSql 是否使用了拼接变量
                for (const stmt of cfg.getStmts()) {
                    if (stmt.getExprs().length === 0) continue;
                    for (const expr of stmt.getExprs()) {
                        if (expr instanceof ArkInstanceInvokeExpr) {
                            const callName = expr.getMethodSignature()
                                .getMethodSubSignature().getMethodName();
                            if (callName === 'querySql' || callName === 'executeSql') {
                                if (expr.getArgs().length > 0) {
                                    const firstArg = expr.getArg(0);
                                    // 情况A：参数直接是拼接表达式 querySql("SELECT ..." + name)
                                    if (firstArg instanceof ArkNormalBinopExpr) {
                                        const op = firstArg.getOperator();
                                        if (op === '+') {
                                            this.reportIssue(targetFile, stmt, methodName);
                                        }
                                    }
                                    // 情况B：参数是变量，且该变量由拼接得到
                                    // let sql = "SELECT ..." + name;  querySql(sql);
                                    else if (firstArg instanceof Local && concatVars.has(firstArg.getName())) {
                                        this.reportIssue(targetFile, stmt, methodName);
                                    }
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