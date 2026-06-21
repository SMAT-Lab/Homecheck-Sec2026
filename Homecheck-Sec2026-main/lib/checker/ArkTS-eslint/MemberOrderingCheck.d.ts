import { ArkFile, ts } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { IssueReport } from '../../model/Defects';
interface SortedOrderConfig {
    memberTypes?: BaseMemberType[] | 'never';
    optionalityOrder?: 'optional-first' | 'required-first';
    order: 'alphabetically' | 'alphabetically-case-insensitive' | 'as-written' | 'natural' | 'natural-case-insensitive';
}
type OrderConfig = BaseMemberType[] | SortedOrderConfig | 'never';
export type Options = [
    {
        default?: OrderConfig;
        classes?: OrderConfig;
        classExpressions?: OrderConfig;
        interfaces?: OrderConfig;
        typeLiterals?: OrderConfig;
    }
];
declare enum BaseMemberType {
    "signature" = "signature",
    "readonly-signature" = "readonly-signature",
    "call-signature" = "call-signature",
    "public-static-field" = "public-static-field",
    "public-static-readonly-field" = "public-static-readonly-field",
    "protected-static-field" = "protected-static-field",
    "protected-static-readonly-field" = "protected-static-readonly-field",
    "private-static-field" = "private-static-field",
    "private-static-readonly-field" = "private-static-readonly-field",
    "#private-static-field" = "#private-static-field",
    "#private-static-readonly-field" = "#private-static-readonly-field",
    "public-decorated-field" = "public-decorated-field",
    "public-decorated-readonly-field" = "public-decorated-readonly-field",
    "protected-decorated-field" = "protected-decorated-field",
    "protected-decorated-readonly-field" = "protected-decorated-readonly-field",
    "private-decorated-field" = "private-decorated-field",
    "private-decorated-readonly-field" = "private-decorated-readonly-field",
    "public-instance-field" = "public-instance-field",
    "public-instance-readonly-field" = "public-instance-readonly-field",
    "protected-instance-field" = "protected-instance-field",
    "protected-instance-readonly-field" = "protected-instance-readonly-field",
    "private-instance-field" = "private-instance-field",
    "private-instance-readonly-field" = "private-instance-readonly-field",
    "#private-instance-field" = "#private-instance-field",
    "#private-instance-readonly-field" = "#private-instance-readonly-field",
    "public-abstract-field" = "public-abstract-field",
    "public-abstract-readonly-field" = "public-abstract-readonly-field",
    "protected-abstract-field" = "protected-abstract-field",
    "protected-abstract-readonly-field" = "protected-abstract-readonly-field",
    "public-field" = "public-field",
    "public-readonly-field" = "public-readonly-field",
    "#private-field" = "#private-field",
    "#private-readonly-field" = "#private-readonly-field",
    "protected-field" = "protected-field",
    "protected-readonly-field" = "protected-readonly-field",
    "private-field" = "private-field",
    "private-readonly-field" = "private-readonly-field",
    "static-field" = "static-field",
    "static-readonly-field" = "static-readonly-field",
    "instance-field" = "instance-field",
    "instance-readonly-field" = "instance-readonly-field",
    "abstract-field" = "abstract-field",
    "abstract-readonly-field" = "abstract-readonly-field",
    "decorated-field" = "decorated-field",
    "decorated-readonly-field" = "decorated-readonly-field",
    "field" = "field",
    "readonly-field" = "readonly-field",
    "static-initialization" = "static-initialization",
    "public-constructor" = "public-constructor",
    "protected-constructor" = "protected-constructor",
    "private-constructor" = "private-constructor",
    "constructor" = "constructor",
    "public-static-accessor" = "public-static-accessor",
    "protected-static-accessor" = "protected-static-accessor",
    "private-static-accessor" = "private-static-accessor",
    "#private-static-accessor" = "#private-static-accessor",
    "public-decorated-accessor" = "public-decorated-accessor",
    "protected-decorated-accessor" = "protected-decorated-accessor",
    "private-decorated-accessor" = "private-decorated-accessor",
    "public-instance-accessor" = "public-instance-accessor",
    "protected-instance-accessor" = "protected-instance-accessor",
    "private-instance-accessor" = "private-instance-accessor",
    "#private-instance-accessor" = "#private-instance-accessor",
    "public-abstract-accessor" = "public-abstract-accessor",
    "protected-abstract-accessor" = "protected-abstract-accessor",
    "public-accessor" = "public-accessor",
    "protected-accessor" = "protected-accessor",
    "private-accessor" = "private-accessor",
    "#private-accessor" = "#private-accessor",
    "static-accessor" = "static-accessor",
    "instance-accessor" = "instance-accessor",
    "abstract-accessor" = "abstract-accessor",
    "decorated-accessor" = "decorated-accessor",
    "accessor" = "accessor",
    "public-static-get" = "public-static-get",
    "protected-static-get" = "protected-static-get",
    "private-static-get" = "private-static-get",
    "#private-static-get" = "#private-static-get",
    "public-decorated-get" = "public-decorated-get",
    "protected-decorated-get" = "protected-decorated-get",
    "private-decorated-get" = "private-decorated-get",
    "public-instance-get" = "public-instance-get",
    "protected-instance-get" = "protected-instance-get",
    "private-instance-get" = "private-instance-get",
    "#private-instance-get" = "#private-instance-get",
    "public-abstract-get" = "public-abstract-get",
    "protected-abstract-get" = "protected-abstract-get",
    "public-get" = "public-get",
    "protected-get" = "protected-get",
    "private-get" = "private-get",
    "#private-get" = "#private-get",
    "static-get" = "static-get",
    "instance-get" = "instance-get",
    "abstract-get" = "abstract-get",
    "decorated-get" = "decorated-get",
    "get" = "get",
    "public-static-set" = "public-static-set",
    "protected-static-set" = "protected-static-set",
    "private-static-set" = "private-static-set",
    "#private-static-set" = "#private-static-set",
    "public-decorated-set" = "public-decorated-set",
    "protected-decorated-set" = "protected-decorated-set",
    "private-decorated-set" = "private-decorated-set",
    "public-instance-set" = "public-instance-set",
    "protected-instance-set" = "protected-instance-set",
    "private-instance-set" = "private-instance-set",
    "#private-instance-set" = "#private-instance-set",
    "public-abstract-set" = "public-abstract-set",
    "protected-abstract-set" = "protected-abstract-set",
    "public-set" = "public-set",
    "protected-set" = "protected-set",
    "private-set" = "private-set",
    "#private-set" = "#private-set",
    "static-set" = "static-set",
    "instance-set" = "instance-set",
    "abstract-set" = "abstract-set",
    "decorated-set" = "decorated-set",
    "set" = "set",
    "public-static-method" = "public-static-method",
    "protected-static-method" = "protected-static-method",
    "private-static-method" = "private-static-method",
    "#private-static-method" = "#private-static-method",
    "public-decorated-method" = "public-decorated-method",
    "protected-decorated-method" = "protected-decorated-method",
    "private-decorated-method" = "private-decorated-method",
    "public-instance-method" = "public-instance-method",
    "protected-instance-method" = "protected-instance-method",
    "private-instance-method" = "private-instance-method",
    "#private-instance-method" = "#private-instance-method",
    "public-abstract-method" = "public-abstract-method",
    "protected-abstract-method" = "protected-abstract-method",
    "public-method" = "public-method",
    "protected-method" = "protected-method",
    "private-method" = "private-method",
    "#private-method" = "#private-method",
    "static-method" = "static-method",
    "instance-method" = "instance-method",
    "abstract-method" = "abstract-method",
    "decorated-method" = "decorated-method",
    "method" = "method"
}
export declare class MemberOrderingCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    asRoot: ts.SourceFile;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private checkMemberOrder;
    private getClassesOrderConfig;
    private getClassExpressionsOrderConfig;
    private getInterfacesOrderConfig;
    private getTypeLiteralsOrderConfig;
    private getDefaultOrderConfig;
    private getMemberName;
    private getComputedPropertyName;
    private isMemberOptional;
    private getRank;
    private extractKeyType;
    private extractTwoKeyType;
    private getNodeType;
    private getNodeTypeOther;
    private determineGetterMemberType;
    private determineGetterMemberTypeTwo;
    private determineSetterMemberType;
    private determineSetterMemberTypeTwo;
    private determineFieldMemberType;
    private determineFieldMemberTypeTwo;
    private determineMethodMemberType;
    private determineMethodMemberTypeTwo;
    private checkGroupSort;
    private modifiedFieldType;
    private checkAlphaSort;
    private checkAlphaByGroupSort;
    private compareValues;
    private naturalSort;
    private checkRequiredOrder;
    private addLocationInfo;
    private validateMembersOrder;
    private memberTypesChecks;
    private memberTypesNeverErrors;
    private orderByGroupErrors;
    private orderErrors;
    private optionalityOrderErrors;
    private collectErrors;
    private getLineAndCharacter;
    private addIssueReport;
}
export {};
