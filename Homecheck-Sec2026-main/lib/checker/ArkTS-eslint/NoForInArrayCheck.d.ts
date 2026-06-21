import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from "../../model/Defects";
export declare class NoForInArrayCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private isForInCheck;
    private handleForInStatement;
    private addIssueReport;
    private getLineAndColumn;
    private isTsFile;
}
