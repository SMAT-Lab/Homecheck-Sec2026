import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
/**
 * 限制模板表达式类型的检查器
 * 该规则强制要求模板字符串表达式为字符串类型
 */
export declare class RestrictTemplateExpressionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private globalStmt;
    private globalArkMethod;
    private rootNode;
    private errorPositions;
    private fileMatcher;
    private checkedTypes;
    /**
     * 注册匹配器回调
     * @returns 匹配器回调
     */
    registerMatchers(): MatcherCallback[];
    /**
     * 获取规则配置选项
     * @returns 规则配置选项
     */
    private getOptions;
    /**
     * 检查单个语句
     * @param stmt 语句
     */
    private checkStatement;
    /**
     * 判断是否应该跳过检查该节点
     * @param node 要检查的节点
     * @returns 如果应该跳过则返回true
     */
    private shouldSkipNode;
    /**
     * 检查赋值语句
     * @param astree 表达式
     */
    private checkAssignmentStatement;
    /**
     * 在表达式中查找并检查模板表达式
     * @param node 表达式
     */
    private checkExpressionForTemplates;
    /**
     * 获取实际类型的字符串表示
     * @param type 类型
     * @returns 实际类型的字符串表示
     */
    private getUnderlyingTypeString;
    /**
     * 报告错误
     * @param node 节点
     * @param type 类型
     */
    private report;
    /**
     * 获取表达式的实际类型
     * @param span 表达式
     * @returns 表达式的实际类型
     */
    private getUnderlyingType;
    private getUnderlyingTypeForExpression;
    private getUnderlyingTypeForPropertyAccessExpression;
    private getUnderlyingTypeForAsExpression;
    private getUnderlyingTypeForArray;
    /**
     * 获取数组元素的类型
     * @param types 类型数组
     * @returns 数组元素的类型
     */
    private getArrayElementType;
    /**
     * 获取二元表达式的类型
     * @param span 表达式
     * @returns 表达式的类型
     */
    private getUnderTypeBinaryExpression;
    private hasType;
    /**
     * 检查父节点
     * @param node 当前节点
     * @returns 父节点
     */
    private checkParentNode;
    /**
     * 检查条件表达式中的类型
     * @param span 当前节点
     * @param type 变量的实际类型
     * @returns 根据条件表达式判断后的类型
     */
    private checkConditionalExpressionType;
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    private getTypeByName;
    private getVariableType;
    private getAstTree;
    /**
     * 检查是否为内部联合或交集类型
     * @param type 类型
     * @returns 是否为内部联合或交集类型
     */
    private isInnerUnionOrIntersectionConformingTo;
    /**
     * 检查是否为字符串类型
     * @param type 类型
     * @returns 是否为字符串类型
     */
    private isStringType;
    /**
     * 检查是否为原始类型
     * @param type 类型
     * @returns 是否为原始类型
     */
    private isTypePrimitive;
    /**
     * 检查是否为Any类型
     */
    private isAnyType;
    /**
     * 检查是否为布尔类型
     */
    private isBooleanType;
    /**
     * 检查是否为数字类型
     */
    private isNumberType;
    /**
     * 检查是否为null或undefined类型
     */
    private isNullishType;
    /**
     * 检查是否为RegExp类型
     */
    private isRegExpType;
    /**
     * 检查是否为Never类型（在ArkTS中可能没有直接对应）
     */
    private isNeverType;
    /**
     * 判断文本中是否包含模板字符串
     */
    private containsTemplateString;
    /**
     * 检查Ark类
     * @param arkCls 类
     */
    private checkArkCls;
    /**
     * 检查Ark方法
     * @param method 方法
     */
    private checkArkMethod;
    /**
     * 检查方法入口点
     */
    check: (arkFile: ArkFile) => void;
    /**
     * 排序并报告错误
     * @param target 目标文件
     */
    private sortAndReportErrors;
    /**
     * 报告错误
     */
    private addIssueReport;
}
