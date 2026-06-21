import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class NoUnnecessaryConditionCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private ARRAY_PREDICATE_FUNCTIONS;
    private BOOL_OPERATORS;
    private line;
    private col;
    private locationInfos;
    private globalStmt;
    private rootNode;
    private globalMethod;
    private option;
    private useMethod;
    private stmtCache;
    private nullishType;
    private defaultOptions;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private isLiteralType;
    private isNullishType;
    private isPossiblyNullish;
    private isAlwaysNullish;
    private isTruthyLiteral;
    private isFalsyLiteral;
    /**
     * 检查是否存在至少一个类型是true类型
     * @param value
     * @returns
     */
    private isPossiblyTruthy;
    /**
     * 检查是否存在至少一个类型是false类型
     * @param value
     * @returns
     */
    private isPossiblyFalsy;
    private checkClass;
    private checkMethod;
    private checkStmt;
    private checkLogicalExpressionForUnnecessaryConditionals;
    private checkCallExpression;
    private checkArrayPredicateFunction;
    private isArrayPredicateFunction;
    private isArrayType;
    private checkIfLoopIsNecessaryConditional;
    private checkAssignmentExpression;
    private checkNodeForNullish;
    private checkNode;
    private checkExpressionNode;
    private checkNodeOther;
    private getReportedNode;
    private getConstrainedTypeOfArkConditionExpr;
    private getConstrainedTypeOfArkNewExpr;
    private getConstrainedType;
    private getConstrainedTypeOfConstant;
    private getConstrainedTypeOfArkAssignStmt;
    private getConstrainedTypeOther;
    private checkStmtIf;
    private checkCondition;
    private checkOptionalChain;
    private checkOptionalChainStmt;
    private checkChainStmtOfRightOp;
    private checkChainStmtOfLeftOp;
    private checkOptionalChainType;
    private getQuestionDotToken;
    private reportOptionalChainIssue;
    private isConditionNode;
    private visitCheck;
    private visitCheckOfArkIfStmt;
    private visitCheckOfArkIfStmtOther;
    private matchNormalBinopExpr;
    private checkLocal;
    private getNormalBinopExprText;
    private replacePlaceholder;
    private checkIfBinaryExpressionIsNecessaryConditional;
    private unionTypeParts;
    private getVariableType;
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    private getTypeByName;
    private getDeclarStmt;
    private getTypeByArkAssignStmt;
    private getTypeByArkAssignStmtOther;
    private reportIssue;
    private ruleFix;
    private getFixRange;
    private getLineStartPosition;
    private addIssueReportNodeFix;
}
