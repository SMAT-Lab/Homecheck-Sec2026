import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoExtraneousClassCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private defaultOptions;
    private options;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    /** 递归遍历AST节点，查找所有类声明和类表达式*/
    private visitNode;
    private parseOptions;
    /** 检查类是否符合规则*/
    private checkClass;
    private analyzeMembers;
    /**检查节点是否有继承关系*/
    private hasSuperClass;
    /***检查节点是否有装饰器*/
    private hasDecorators;
    /** 检查构造函数是否有参数属性*/
    private hasParameterProperties;
    /** 检查成员是否是静态成员*/
    private isStaticMember;
    /** 检查节点是否是静态代码块*/
    private isStaticBlock;
    private isStaticRegular;
    private isStatusClass;
    /** 检查类成员是否为空（只有分号或注释）对比codelinter空class里面有一个分号可以检测出来*/
    private isEmptyMember;
    /**检查类是否实际上是空的（只包含分号或注释）对比codelinter空class里面有一个分号可以检测出来 */
    private isEffectivelyEmpty;
    private report;
    /** 检查类是否是export default class*/
    private isExportClassRegular;
    private isExportDefaultClass;
    private isValidVariableStatement;
    /** 找到class关键字在节点中的位置*/
    private findClassKeywordPosition;
    private getNodeLocationWithCustomPosition;
    private getNodeLocation;
    private areAllMembersConstructors;
}
