import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { MatcherCallback } from '../../matcher/Matchers';
export type Option = {
    onlyInlineLambdas?: boolean;
};
export declare class PreferReadonlyCheck implements BaseChecker {
    private defaultOption;
    private option;
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private visitFunctionDeclaration;
    private processClassAst;
    private checkUnmodifiedMembers;
    private processViolatingNode;
    /**判断节点是否是构造函数参数*/
    private isConstructorParameter;
    /** 获取成员名称和类型信息*/
    private getMemberInfo;
    private generateFixCode;
    /*** 处理class 中嵌套Method的语句*/
    private visitMethodDeclaration;
    private processMethodBody;
    private checkCallbackDepth;
    private isInConstructorScope;
    /**检查节点是否在 setter 上下文中*/
    private isInSetterContext;
    private checkNode;
    /**
     * 处理 setter 中的赋值表达式
     */
    private handleSetterAssignment;
    /** 检查是否是非修改性的一元表达式*/
    private isNonModifyingUnaryExpression;
    /**
     * 处理赋值表达式
     */
    private handleAssignmentExpression;
    /**
     * 处理属性访问赋值
     */
    private handlePropertyAccessAssignment;
    /**
     * 处理删除表达式
     */
    private handleDeleteExpression;
    /**
     * 处理前置或后置递增/递减操作
     */
    private handleUnaryIncrementExpression;
    private processObjectLiteralProperties;
    private handleSpreadAssignment;
    private handlePropertyAssignment;
    private processArrayDestructuring;
    private isObjectPropertyAccess;
    private findConstructorParent;
    private visitStatement;
    private getEsNodesFromViolatingNode;
    private processPropertyDeclaration;
    private processConstructorDeclaration;
    private processConstructorStatements;
    private processConstructorBody;
    /**判断是不是有修改语句符号 */
    private isAssignmentExpression;
    private checkModifiers;
    private isStaticMemberAccess;
    private createDefect;
    private createFix;
    private getLineAndColumn;
    /** 处理 setter 中的修改情况*/
    private visitSetAccessor;
}
