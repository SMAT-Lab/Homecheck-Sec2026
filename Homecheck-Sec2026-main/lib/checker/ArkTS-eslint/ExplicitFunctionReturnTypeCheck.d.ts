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
export declare class ExplicitFunctionReturnTypeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private options;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    checkExplicitReturnType(sourceFile: ts.SourceFile): LocationInfo[];
    private checkGetAccessorDeclaration;
    private specialTreatmentFunctionExpression;
    private specialTreatment;
    private specialTreatmentExpression;
    private getFileExtension;
    /**
     * 检查节点是否在函数调用的对象参数中
     */
    private isInObjectArgument;
    private isInObjectLiteralExpression;
    /**
     * 检查类方法是否应该有返回类型
     */
    private shouldMethodHaveReturnType;
    /**
     * 检查变量声明中的箭头函数是否应该有返回类型
     */
    private shouldVariableArrowFunctionHaveType;
    /**
     * 获取箭头函数的起始位置
     * 这个函数用于确保问题点定位在箭头函数的正确位置
     */
    private getArrowFunctionStartPosition;
    /**
     * 获取函数声明的起始位置
     * 对于异步函数，返回async关键字的位置而不是function关键字
     */
    private getFunctionKeywordPosition;
    /**
     * 获取方法名的位置
     * 这个函数用于确保问题点定位在方法名位置，而不是整个方法声明的起始位置
     */
    private getMethodNamePosition;
    private isInTypedObjectLiteral;
    private isInTypedObjectParent;
    private isInTypedObjectVariableDeclaration;
    private isInTypedObjectVariableStatement;
    private isInTypedObject;
    private isInTypedObjectGrandParent;
    /**
     * 检查对象属性中的箭头函数
     * 只有当箭头函数在有类型的对象中时，才不需要报错
     */
    private isObjectPropertyArrowFunction;
    /**
     * 检查方法是否为抽象方法
     */
    private isAbstractMethod;
    /**
       * 检查父类是否是declare abstract class
       */
    private isParentDeclarativeAbstractClass;
    /**
     * 检查函数声明是否只有声明而没有函数体
     */
    private isFunctionDeclarationWithoutBody;
    /**
     * 检查函数是否有泛型参数且应该忽略返回类型检查
     * 类方法的泛型参数不应该忽略返回类型检查
     */
    private hasFunctionTypeParameters;
    /**
     * 检查节点是否在 Promise 构造函数中
     */
    private isInPromiseContext;
    /**
     * 检查是否是立即执行的函数表达式 (IIFE)
     */
    private isImmediatelyInvokedFunctionExpression;
    private checkArrowFunctionCurrentNode;
    private checkArrowFunction;
    private checkMethodDeclaration;
    private checkNonAbstractMethod;
    private checkMethodDeclarationObjectLiteralExpression;
    private isPartOfTypeAssertion;
    /**
     * 添加问题报告。
     */
    private addIssue;
    private isHigherReturnsFunction;
    /**
     * 检查节点是否是高阶函数（立即返回另一个函数表达式的函数）
     */
    private isHigherOrderFunction;
    private returnsFunction;
    /**
     * 检查函数是否通过bind、call或apply绑定了this
     */
    private isThisBindingFunction;
    /**
     * 检查函数表达式是否有类型注解或是否在不需要类型注解的上下文中
     */
    private isTypedFunctionExpression;
    private checkProperty;
    private checkParenthesized;
    /**
     * 检查祖先节点是否有返回类型
     */
    private ancestorHasReturnType;
    private ancestorReturnStatement;
    /**
     * 获取 getter 方法名称的位置
     */
    private getGetAccessorNamePosition;
    /**
     * 检查节点是否使用了as const断言
     */
    private hasConstAssertion;
    private addIssueReportNode;
}
export {};
