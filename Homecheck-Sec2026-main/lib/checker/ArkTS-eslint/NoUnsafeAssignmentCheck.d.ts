import { ArkFile } from "arkanalyzer";
import { MatcherCallback } from "../../matcher/Matchers";
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
export declare class NoUnsafeAssignmentCheck implements BaseChecker {
    defects: Defects[];
    issues: IssueReport[];
    readonly metaData: BaseMetaData;
    rule: Rule;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    private arkFile;
    check: (target: ArkFile) => void;
    private checkClass;
    private checkMethod;
    private checkStmts;
    private shouldSaveError;
    private isInvalidRightOp;
    private isInvalidTypeCombination;
    private isSafeInvokeExpression;
    /**
     * 判断代码中是否包含复合赋值运算符
     * 复合赋值运算符包括：+=, -=, *=, /=, %=, &=, |=, ^=, <<=, >>=, >>>=
     *
     * @param sourceCode
     * @returns
     */
    private isContainsCompoundAssignmentOperators;
    private checkFields;
    private getType;
    private checkClassTypeHasAnyOrUnknown;
    private getArkNormalBinopExprRealType;
    private isStringTypeOperation;
    private getAnyOrUnknownType;
    private getTypeFromLocal;
    private isArkInstanceInvokeExprSafe;
    private isArkStaticInvokeExprSafe;
    private saveError;
    private getLineAndColumnFromStmt;
    private isFieldRefAssignment;
    private addFieldRefPosition;
    private addOperandPosition;
    private getOperandIndex;
    private isAnyType;
    private isUnknowType;
    private addIssueReport;
    /**
     * 获取指定文本在 ArkMethod 或 Stmt 对象中的行号和起始列号信息
     * @param data ArkMethod 或 Stmt 对象，需要在其中查找指定文本
     * @param text 需要查找的文本内容
     * @returns 包含行号和起始列号信息的数组，每个元素是一个包含 line 和 start 属性的对象
     */
    private getLineAndColumnByAst;
    private processArkClass;
    /**
     * 处理 ArkField 对象，查找指定文本在方法代码中的位置，并将位置信息添加到数组中
     * @param data ArkField 对象，包含方法的相关信息
     * @param text 需要在方法代码中查找的文本
     * @param arr 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    private processArkField;
    /**
     * 处理 ArkMethod 对象，查找指定文本在方法代码中的位置，并将位置信息添加到数组中
     * @param data ArkMethod 对象，包含方法的相关信息
     * @param text 需要在方法代码中查找的文本
     * @param set 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    private processArkMethod;
    /**
     * 处理语句对象，查找指定文本在语句中的位置，并将位置信息添加到数组中
     * @param data 语句对象，包含语句的相关信息
     * @param text 需要在语句中查找的文本
     * @param arr 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    private processStmt;
    /**
     * 获取 ArkMethod 对象中第一个声明的行位置
     * @param data ArkMethod 对象，包含方法声明信息
     * @returns 第一个声明行的数值位置。如果无法获取行信息，返回默认值 0
     */
    private getFirstDeclareLine;
    /**
     * 获取 ArkMethod 对象中第一个声明的行位置
     * @param data ArkMethod 对象，包含方法声明信息
     * @returns 第一个声明行的数值位置。如果无法获取行信息，返回默认值 0
     */
    private getFirstDeclareColumns;
    /**
     * 获取目标字符在源字符串中所有出现位置的索引
     * @param source 源字符串，用于查找目标字符
     * @param targetChar 目标字符，需要在源字符串中查找的字符
     * @returns 包含所有匹配索引的数组，如果没有匹配则返回空数组
     */
    private getAllIndices;
    /**
     * 是否包含赋值运算
     * @param source 源字符串，用于查找目标字符
     * @returns
     */
    private isHasAssignment;
    /**
     * 获取赋值表达式左侧的文本内容
     * @param source 源字符串，用于查找目标字符
     * @returns 左侧内容
     */
    private getLeftTextByAst;
    /**
     * 获取表达式左侧是否有类型申明
     * @param source 源字符串，用于查找目标字符
     * @returns 包含所有匹配索引的数组，如果没有匹配则返回空数组
     */
    private isLeftHasDeclarationType;
    private isTsFile;
}
