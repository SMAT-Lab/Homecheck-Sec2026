import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class NoUnnecessaryTypeArgumentsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkGenericTypes;
    private checkInterfaceDeclaration;
    private checkTypeAliasDeclaration;
    private checkFunctionDeclaration;
    private checkClassDeclaration;
    private checkClassDeclarationClause;
    private checkCallExpression;
    private checkNewExpression;
    private checkTypeReference;
    private findLastCommaStartPosition;
    private findLastCommaEndPosition;
    private ruleFix;
    private addIssueReportNodeFix;
}
