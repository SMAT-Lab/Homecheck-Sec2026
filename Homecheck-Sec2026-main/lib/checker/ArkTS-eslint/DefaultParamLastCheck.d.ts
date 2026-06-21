import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class DefaultParamLastCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkDefaultParamLast;
    private checkNode;
    private checkNodeTwo;
    private addIssueReportNode;
}
