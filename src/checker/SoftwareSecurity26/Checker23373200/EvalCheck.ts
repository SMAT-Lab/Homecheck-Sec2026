import { ArkFile, ArkInstanceInvokeExpr, ArkStaticInvokeExpr, Constant, Stmt, ArkPtrInvokeExpr, ArkNewExpr } from 'arkanalyzer';
import Logger, {LOG_MODULE_TYPE} from 'arkanalyzer/lib/utils/logger';
import {BaseChecker, BaseMetaData} from '../../BaseChecker';
import {Defects} from '../../../Index';
import {FileMatcher, MatcherCallback, MatcherTypes} from '../../../Index';
import {Rule} from '../../../Index';
import {IssueReport} from '../../../model/Defects';

const logger = Logger.getLogger(LOG_MODULE_TYPE.HOMECHECK, 'EvalCheck');

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Detects eval.'
};

export class EvalCheck implements BaseChecker {
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
                        // eval(...) — 可能是 ArkPtrInvokeExpr 或 ArkStaticInvokeExpr
                        if (expr instanceof ArkPtrInvokeExpr || expr instanceof ArkStaticInvokeExpr) {
                            const name = expr.getMethodSignature()
                                .getMethodSubSignature().getMethodName();
                            if (name === 'eval') {
                                this.reportIssue(targetFile, stmt, methodName);
                            }
                        }

                        // new Function(...) — 对象构造
                        if (expr instanceof ArkNewExpr) {
                            const clsType = expr.getClassType();
                            if (clsType && clsType.getClassSignature().getClassName() === 'Function') {
                                this.reportIssue(targetFile, stmt, methodName);
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