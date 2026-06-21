import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { ArkFile } from "arkanalyzer";
import { Defects, MatcherCallback } from "../../Index";
import { IssueReport } from "../../model/Defects";
export declare class PreferAsConstCheck implements BaseChecker {
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private getFileExtension;
    private checkAsConstAssertions;
    private shouldReportAssertion;
    private shouldReportVariableDeclaration;
    private addDefect;
    private createFix;
    private getInitializerText;
    private findNodeAtPosition;
}
