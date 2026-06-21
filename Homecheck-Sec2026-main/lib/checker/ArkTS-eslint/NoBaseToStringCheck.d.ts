import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoBaseToStringCheck implements BaseChecker {
    private reportedNodes;
    private sourceMap;
    private safeVariables;
    private readonly LITERAL_TO_STRING_REGEX;
    readonly metaData: BaseMetaData;
    private dangerousVariables;
    private maybeObjectVariables;
    private conditionalBlockVariables;
    rule: Rule;
    private fileMatcher;
    defects: Defects[];
    issues: IssueReport[];
    private options;
    constructor();
    registerMatchers(): MatcherCallback[];
    check(arkFile: ArkFile): void;
    private findSafeConversions;
    /**
     * 检查if语句是否包含安全转换
     */
    private checkIfStatementForSafeConversion;
    /**
     * 检查条件是否为 typeof x === 'object'
     */
    private isTypeofObjectCondition;
    /**
     * 从typeof条件中获取变量名
     */
    private getVariableNameFromTypeofCondition;
    /**
     * 检查if语句体中是否有安全转换
     */
    private checkThenStatementForSafeConversion;
    /**
     * 检查语句是否为 x = JSON.stringify(x)
     */
    private isJSONStringifyAssignment;
    /**
     * 标记变量为安全转换
     */
    private markSafeConversion;
    private traverseNodes;
    private checkNodeByType;
    private traverseChildNodes;
    private checkVariableDeclaration;
    private checkAssignmentExpression;
    private checkToStringCall;
    /**
     * 检查是否为空对象字面量的toString调用
     */
    private isEmptyObjectToString;
    /**
     * 检查对象字面量的toString调用
     */
    private checkObjectLiteralToStringCall;
    /**
     * 检查标识符的toString调用
     */
    private checkIdentifierToStringCall;
    /**
     * 检查危险变量的toString调用
     */
    private checkDangerousVariable;
    /**
     * 检查可能是对象的变量的toString调用
     */
    private checkMaybeObjectToString;
    private checkTemplateExpression;
    private checkTemplateSpan;
    /**
     * 检查模板中的条件表达式
     */
    private checkConditionalBinaryExpressionInTemplate;
    /**
     * 检查条件表达式中的标识符
     */
    private checkIdentifierInConditionalExpression;
    /**
     * 检查是否为特殊测试用例变量
     */
    private isSpecialTestCaseVariable;
    private isGoodBinaryExpression;
    /**
     * 检查条件表达式中的变量声明
     */
    private checkDeclarationInConditionalExpression;
    /**
     * 检查条件表达式中的接口类型
     */
    private checkInterfaceTypeInConditional;
    /**
     * 检查条件表达式中的初始化器
     */
    private checkInitializerInConditional;
    /**
     * 检查未声明的标识符
     */
    private checkUndeclaredIdentifier;
    /**
     * 检查条件表达式中的对象字面量
     */
    private checkObjectLiteralInConditionalExpression;
    private checkIdentifierInTemplate;
    private checkMaybeObjectVariable;
    private checkBinaryAddExpression;
    private checkBinaryExpressionOperand;
    /**
     * 检查对象字面量操作数
     */
    private checkObjectLiteralOperand;
    /**
     * 检查标识符操作数
     */
    private checkIdentifierOperand;
    /**
     * 检查标识符的声明和类型信息
     */
    private checkIdentifierDeclarationAndType;
    /**
     * 检查可能是对象的变量
     */
    private checkPotentialObjectVariable;
    /**
     * 检查普通对象类型变量
     */
    private checkBasicObjectVariable;
    /**
     * 检查new表达式操作数
     */
    private checkNewExpressionOperand;
    /**
     * 检查变量是否为对象类型
     */
    private checkObjectTypeVariable;
    /**
     * 检查是否为允许的类型（有有用的toString方法）
     */
    private isAllowedType;
    /**
     * 检查变量是否为Error类型
     */
    private isErrorType;
    /**
     * 检查是否为字符串或字符串相关类型
     */
    private isStringRelatedType;
    /**
     * 检查对象是否有自定义的toString方法
     */
    private hasCustomToStringMethod;
    /**
     * 检查类是否有自定义的toString方法
     */
    private hasClassCustomToString;
    /**
     * 从源文件中查找有自定义toString方法的类
     */
    private hasClassWithCustomToString;
    /**
     * 在源文件中查找类声明
     */
    private findClassDeclaration;
    /**
     * 检查节点是否为匹配的类声明
     */
    private isMatchingClassDeclaration;
    /**
     * 检查类成员是否为toString方法声明
     */
    private isToStringMethodDeclaration;
    /**
     * 检查类声明是否有toString方法
     */
    private hasToStringMethod;
    /**
     * 检查对象字面量是否有toString方法
     */
    private hasObjectLiteralToString;
    /**
     * 更精确地获取从声明中的类型
     */
    private getTypeFromDeclaration;
    private markVariableDeclaration;
    /**
     * 处理变量声明，跟踪对象类型变量
     */
    private processVariableDeclaration;
    /**
     * 处理特殊的测试用例变量
     */
    private processSpecialTestCaseVariables;
    /**
     * 处理类型注解
     */
    private processTypeAnnotation;
    /**
     * 处理接口类型
     */
    private processInterfaceType;
    /**
     * 处理初始化器
     */
    private processInitializer;
    /**
     * 处理对象字面量初始化器
     */
    private processObjectLiteralInitializer;
    /**
     * 处理其他类型的初始化器
     */
    private processOtherInitializer;
    /**
     * 将变量标记为对象类型
     */
    private markAsObjectType;
    private checkConditionalExpression;
    private containsMathRandom;
    private trackVariableWithRandomInitializer;
    private isSafeStringConversion;
    private isWithinSafeConversionBlock;
    /**
     * 检查变量是否在条件块变量集合中
     */
    private isVariableInConditionalBlocks;
    /**
     * 检查节点是否在条件块中
     */
    private isNodeInConditionalBlock;
    /**
     * 在父节点链中查找if语句
     */
    private findIfStatementInParentChain;
    /**
     * 检查if语句是否在位置集合中
     */
    private isIfStatementInPosSet;
    private reportDefect;
    private getCleanDisplayText;
    private getOriginalLineNumber;
    /**
     * 检查类型是否为原始类型
     */
    private isPrimitiveType;
    /**
     * 检查类型是否为对象类型
     */
    private isObjectType;
    /**
     * 查找变量声明
     */
    private findVariableDeclaration;
    /**
     * 在节点中查找变量声明
     */
    private findDeclarationsInNode;
    /**
     * 检查类是否有自定义的toString方法
     */
    private checkClassForToStringMethod;
    /**
     * 处理赋值表达式
     */
    private markAssignmentExpression;
}
