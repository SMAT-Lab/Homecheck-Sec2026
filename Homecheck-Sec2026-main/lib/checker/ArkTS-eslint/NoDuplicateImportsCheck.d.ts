import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Rule, MatcherCallback } from '../../Index';
import { IssueReport } from "../../model/Defects";
export declare class NoDuplicateImportsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    issues: IssueReport[];
    private modules;
    private includeExports;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkImportExportDeclaration;
    private handleImportExports;
    private checkAndReport;
    private collectErrorMessages;
    private collectImportErrorMessages;
    private collectExportErrorMessages;
    private formatImportDuplicateMessage;
    private formatImportExportDuplicateMessage;
    private reportErrors;
    private addIssueReport;
    private getLineAndColumn;
}
