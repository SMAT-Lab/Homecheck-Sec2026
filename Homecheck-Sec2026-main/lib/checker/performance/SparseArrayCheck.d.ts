import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class SparseArrayCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueColumnInTs;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private findSparseArrayInScope;
    private valueCalculate;
    private traverseScope;
    private reportIssue;
    private getRealStartColum;
    private hasReported;
    private getFullStmtValue;
}
