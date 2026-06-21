import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
export declare class StrictBooleanExpressionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private line;
    private col;
    private locationInfos;
    private globalStmt;
    private rootNode;
    private globalMethod;
    private option;
    private traversedNodes;
    private globalStmtCode;
    private checkLocalIsReplace;
    private useMethod;
    private types;
    private typeCache;
    private defaultOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private isConditionNode;
    /**
     * 处理逻辑非表达式(!)
     * @param stmt
     * @param node
     * @param results
     */
    private traverseUnaryLogicalExpression;
    private traverseNode;
    /**
     * 处理逻辑与表达式(&&、||)
     */
    private traverseLogicalExpression;
    /**
     * 处理if语句的测试表达式
     * @param Ifstmt
     * @param node
     * @param results
     * @returns
     */
    private traverseTestExpression;
    private checkArkCondition;
    private checkClass;
    private checkMethod;
    private checkStmt;
    private checkNodePre;
    private checkNominalType;
    private getTypeWithCondition;
    private getTypeWithNew;
    private getClassInstanceType;
    private getTypeWithInvoke;
    private getClassTypeWithClsName;
    private getTypeWithLocal;
    private getTypesByUnionType;
    private getTypeWithOtherValue;
    private getConstrainedType;
    private getLiteralType;
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    private getTypeByName;
    private getVariableType;
    private getTypeByAst;
    private inAssignStmt;
    private checktsNodeType;
    private checkAssignStmtType;
    private getFindVariableStmt;
    private getVariableStmtTraversal;
    private is;
    private checkNothing;
    private checkNullish;
    private checkString;
    private checkNumber;
    private checkObject;
    private checkAny;
    private checkreportedNode;
    private checkNode;
    private isTypeFlagSet;
    private isTrueLiteralType;
    private inspectVariantConstTypes;
    private inspectVariantTypes;
    private getReportedNode;
    private sortAndReportErrors;
    private checkStmtIf;
    private checkCondition;
    private visitCheck;
    private matchNormalBinopExpr;
    private getStmtStr;
    private checkLocalBinaryExpression;
    private checkLocalPrefixUnaryExpression;
    private checkLocal;
    private checkStmtStrAndNode;
    private getNormalBinopExprText;
    private replacePlaceholder;
    private unionTypeParts;
    private reportIssue;
    private addIssueReportNodeFix;
    private getRuleFix;
    private isNoNeedFix;
    private getFixRange;
    private getLineStartPosition;
    private shouldAddParentheses;
    private checkLeftConditions;
    private checkRightConditions;
    private createNullishOrAnyFix;
    private createNullableBooleanFix;
    private createNullableStringOrNullableNumberFix;
}
