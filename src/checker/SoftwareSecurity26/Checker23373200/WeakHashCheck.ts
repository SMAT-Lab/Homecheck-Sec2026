import { ArkFile, ArkInstanceInvokeExpr, ArkStaticInvokeExpr, Constant, Stmt } from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'WeakHashCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects weak hash.'
};

export class WeakHashCheck implements BaseChecker {
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

                    let reported = false;

                    // 方法1: AST方式 — namespace上调用createMd是 ArkInstanceInvokeExpr
                    for (const expr of stmt.getExprs()) {
                        if (expr instanceof ArkStaticInvokeExpr || expr instanceof ArkInstanceInvokeExpr) {
                            const callName = expr.getMethodSignature()
                                .getMethodSubSignature().getMethodName();
                            if (callName === 'createMd' && expr.getArgs().length > 0) {
                                const algArg = expr.getArg(0);
                                if (algArg instanceof Constant) {
                                    const alg = String(algArg.getValue());
                                    if (['MD5', 'SHA1', 'MD2'].includes(alg)) {
                                        this.reportIssue(targetFile, stmt, methodName);
                                        reported = true;
                                    }
                                }
                            }
                        }
                    }

                    // 方法2: 文本回退 — 扫描原始代码
                    if (!reported) {
                        const text = stmt.getOriginalText();
                        if (text && /createMd\s*\(\s*["'](MD5|SHA1|MD2)["']/.test(text)) {
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