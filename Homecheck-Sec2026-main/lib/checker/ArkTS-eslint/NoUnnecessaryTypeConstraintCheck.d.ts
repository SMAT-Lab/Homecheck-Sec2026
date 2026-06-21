import { ArkClass } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { MatcherCallback } from "../../matcher/Matchers";
export declare class NoUnnecessaryTypeConstraintCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetClass: ArkClass) => void;
    private processArkMethod;
    private processAliasTypes;
    private processGenericArray;
    private checkGenericType;
    private processStatements;
    private getFileExtension;
    private getGenericDeclaration;
    private reportIssue;
}
