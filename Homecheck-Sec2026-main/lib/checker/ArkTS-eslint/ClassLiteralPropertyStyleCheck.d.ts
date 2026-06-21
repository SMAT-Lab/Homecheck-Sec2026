import { ArkFile, ts } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects } from "../../model/Defects";
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
import { IssueReport } from "../../model/Defects";
export declare class ClassLiteralPropertyStyleCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    private defaultOptions;
    rule: Rule;
    defects: Defects[];
    filePath: string;
    private fileMatcher;
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    checkClassLiterals(sourceFile: ts.SourceFile, style: string): void;
    private checkGetterMethodForFieldStyle;
    private checkReadonlyPropertyForGetterStyle;
    private getPosition;
    private isSupportedLiteral;
    private addIssueReport;
}
