import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class CombineSameArgAnimatetoCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private classProcess;
    private valueProcess;
    private findSymbolInMethod;
    private animateToCheck;
    private findSymbolInInvokeStmt;
    private findSymbolInArgs;
    private getIssueReports;
    private reportIssue;
}
