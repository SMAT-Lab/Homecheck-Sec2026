import { ArkFile, ts } from 'arkanalyzer';
import { Rule } from '../../Index';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { IssueReport } from "../../model/Defects";
export declare class NoInferrableTypesCheck implements BaseChecker {
    issues: IssueReport[];
    rule: Rule;
    defects: Defects[];
    sourceFile: ts.SourceFile;
    private defaultOptions;
    metaData: BaseMetaData;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetField: ArkFile) => void;
    private getFileExtension;
    private sortMyInvalidPositions;
    private checkNoInferrableTypes;
    private isPropertyDeclarationFun;
    private isParameterTypeFun;
    private isVariableDeclarationFun;
    private getInferredType;
    private getInferredFirstType;
    private getInferredOtherType;
    private getInferredFinalType;
    private ruleFix;
    private addIssueReport;
}
