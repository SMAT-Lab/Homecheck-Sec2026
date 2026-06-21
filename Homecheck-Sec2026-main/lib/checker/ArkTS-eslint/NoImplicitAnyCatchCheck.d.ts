import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
interface Options {
    allowExplicitAny: boolean;
}
export declare class NoImplicitAnyCatchCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private issueMap;
    check: (file: ArkFile) => void;
    private getFileExtension;
    checkCatchParameter(file: ArkFile, options: Options): {
        line: number;
        character: number;
    }[];
    private determineFixText;
    private handleCatchClause;
    private ruleFix;
    private reportSortedIssues;
    private addIssueReport;
    private getLineAndColumn;
}
export {};
