import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class NoInvalidVoidTypeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private globleStmt;
    private globleArkFile;
    private line;
    private column;
    private useMethods;
    private useCls;
    registerMatchers(): MatcherCallback[];
    private getOption;
    /**
     * 在AST中查找类型节点的位置
     */
    private typeCheck;
    /**
     * 检查各种类型节点
     */
    private checkTypeNode;
    /**
     * 获取AST节点位置
     */
    private getASTNodePosition;
    private checkTypeParameter;
    private checkFunctionLike;
    private checkVariableDeclaration;
    /**
     * 遍历AST节点
     */
    private traverseNode;
    /**
     * 判断是否为函数相关节点
     */
    private isFunctionLikeNode;
    /**
     * 添加错误报告
     */
    private report;
    /**
     * 检查泛型类型参数
     */
    private checkGenericTypeArgument;
    /**
     * 检查联合类型是否有效
     */
    private isValidUnionType;
    /**
     * 获取消息ID
     */
    private getNotReturnOrGenericMessageId;
    /**
     * 处理类和别名类型
     */
    private handleClassOrAliasType;
    /**
     * 处理数组类型
     */
    private handleArrayType;
    /**
     * 处理联合类型
     */
    private handleUnionType;
    /**
     * 处理Void或Unknown类型
     */
    private handleVoidOrUnknownType;
    /**
     * 检查Void类型
     */
    private checkVoidType;
    /**
     * 分析类中的方法
     */
    private analyzeMethod;
    /**
     * 分析方法参数
     */
    private analyzeMethodParameters;
    /**
     * 分析语句
     */
    private analyzeStatement;
    /**
     * 分析赋值语句
     */
    private analyzeAssignStatement;
    /**
     * 分析类的字段
     */
    private analyzeFields;
    /**
     * 获取错误位置
     */
    private getMessage;
    /**
     * 检查文件
     */
    check: (target: ArkFile) => void;
    /**
     * 添加问题报告
     */
    private addIssueReport;
}
