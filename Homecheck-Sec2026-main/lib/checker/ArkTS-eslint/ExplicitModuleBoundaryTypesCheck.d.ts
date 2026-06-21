import { ArkFile, ts } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
interface LocationInfo {
    fileName: string;
    line: number;
    character: number;
    description: string;
}
export declare class ExplicitModuleBoundaryTypesCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private symbolTable;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private getFileExtension;
    checkExplicitBoundaryType(sourceFile: ts.SourceFile): LocationInfo[];
    private checkExportAssignment;
    private isHigherOrderFunction;
    private isHigherOrderFunctionStatement;
    private checkMethodNameNode;
    private hasModifiers;
    private isExported;
    private isExportedOther;
    private getFunctionName;
    private isPrivateOrProtected;
    private isParentExported;
    private hasExplicitReturnType;
    private hasAsExpression;
    private checkConstructorDeclaration;
    /**
   * 检查类声明中的方法和属性是否符合显式类型要求。
   */
    private checkClassDeclaration;
    private buildSymbolTable;
    private buildSymbolTableExportClause;
    private buildSymbolTabletExportAssignment;
    private buildSymbolTabletObjectLiteralExpression;
    private buildSymbolTabletArrayLiteralExpression;
    private checkMethodName;
    private checkClassMethodDeclaration;
    private checkClassConstructorDeclaration;
    private checkClassPropertyDeclaration;
    private checkClassAccessorDeclaration;
    /**
 * 检查类声明中的方法和属性是否符合显式类型要求。
 */
    private checkClassVariableDeclaration;
    /**
   * 检查函数声明是否符合显式类型要求。
   */
    private checkFunctionDeclaration;
    private checkFunctionDeclarationNode;
    private checkFunctionDeclarationNodeBody;
    private checkVariableDeclaration;
    private checkObjectLiteralExpression;
    private checkObjectLiteralMethodDeclaration;
    private checkObjectLiteralExpressionProperty;
    private checkDotAnyArgument;
    private checkDotArgument;
    private checkNonAnyArgument;
    private checkArgument;
    /**
    * 添加问题报告。
    */
    private addIssue;
    private addIssueReportNode;
}
export {};
