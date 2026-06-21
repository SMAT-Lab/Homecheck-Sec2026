import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NumberInitCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private traverseScope;
    private parameteCheck;
    private checkValueType;
    private checkByDefValueInfo;
    private setIssueReports;
}
