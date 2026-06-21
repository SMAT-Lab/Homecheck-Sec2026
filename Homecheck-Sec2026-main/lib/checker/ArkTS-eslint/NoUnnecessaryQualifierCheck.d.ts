import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class NoUnnecessaryQualifierCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkUnnecessaryQualifiers;
    private isQualifiedNameAndPropertyAccess;
    private getSymbolsInCurrentScope;
    private getScopeStack;
    private collectSymbolsFromVariableStatement;
    private collectSymbolsFromEnumDeclaration;
    private collectSymbolsFromModuleBlock;
    private findNamespace;
    private collectSymbolsFromNamespace;
    private collectSymbolsFromNode;
    private filteredLocations;
    private filteredFound;
    private ruleFix;
    private getFixRange;
    private addIssueReportNodeFix;
}
