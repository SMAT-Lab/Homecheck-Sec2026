import { AbstractInvokeExpr, ArkFile, Stmt } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../../BaseChecker';
import { CheckerUtils, Defects, FileMatcher, MatcherCallback, MatcherTypes, Rule } from '../../../Index';
import { IssueReport } from '../../../model/Defects';

const gMetaData: BaseMetaData = {
    severity: 1,
    ruleDocPath: '',
    description: 'Avoid eval(): dynamic code execution enables injection and remote code execution.'
};

const EVAL_CALL = /\beval\s*\(/;

export class UnsafeEvalCheck implements BaseChecker {
    readonly metaData: BaseMetaData = gMetaData;
    public rule: Rule;
    public defects: Defects[] = [];
    public issues: IssueReport[] = [];

    private fileMatcher: FileMatcher = {
        matcherType: MatcherTypes.FILE
    };

    public registerMatchers(): MatcherCallback[] {
        return [{
            matcher: this.fileMatcher,
            callback: this.check
        }];
    }

    public check = (targetFile: ArkFile) => {
        for (const arkClass of targetFile.getClasses()) {
            for (const arkMethod of arkClass.getMethods()) {
                if (arkMethod.getName() === '_DEFAULT_ARK_METHOD') {
                    continue;
                }
                const cfg = arkMethod.getCfg();
                if (cfg === undefined) {
                    continue;
                }
                for (const stmt of cfg.getStmts()) {
                    if (this.isEvalInvoke(stmt) || this.textHasEvalCall(stmt)) {
                        this.reportIssue(targetFile, stmt);
                    }
                }
            }
        }
    };

    private isEvalInvoke(stmt: Stmt): boolean {
        const invokeExpr = CheckerUtils.getInvokeExprFromStmt(stmt);
        if (!invokeExpr) {
            return false;
        }
        const name = this.getCalleeName(invokeExpr);
        return name === 'eval';
    }

    private getCalleeName(invokeExpr: AbstractInvokeExpr): string | undefined {
        try {
            return invokeExpr.getMethodSignature()?.getMethodSubSignature()?.getMethodName();
        } catch (_e) {
            return undefined;
        }
    }

    private textHasEvalCall(stmt: Stmt): boolean {
        const text = stmt.getOriginalText();
        return !!text && EVAL_CALL.test(text);
    }

    public reportIssue(arkFile: ArkFile, stmt: Stmt): void {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const originPositionInfo = stmt.getOriginPositionInfo();
        const lineNum = originPositionInfo.getLineNo();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            return;
        }
        const highlight = 'eval';
        const idx = text.indexOf(highlight);
        const startColumn = originPositionInfo.getColNo() + (idx >= 0 ? idx : 0);
        const endColumn = startColumn + (idx >= 0 ? highlight.length : 1);
        const defects = new Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId,
            filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new IssueReport(defects, undefined));
    }
}
