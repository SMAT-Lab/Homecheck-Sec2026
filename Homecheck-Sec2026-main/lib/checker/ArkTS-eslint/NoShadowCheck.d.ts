import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class NoShadowCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private ruleOptions;
    private fileMatcher;
    private static readonly SPECIAL_NODE_CHECKS;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFile: ArkFile, sourceFile: ts.SourceFileLike, aNode: ts.Node): void;
    private checkObject;
    private getCheckObject;
    private handleNamedNode;
    private handleEnumMember;
    private handleBlockStatements;
    private getTryStatementNodes;
    private handleTypeNode;
    private getVariableDeclarationListNodes;
    private getMember;
    private getPropertyNameNode;
    private getBindingNameNode;
    private isObjectGlobal;
    private checkShadow;
    private getNodeScopeNode;
    private isTopScope;
    private isSpecialNodeType;
    private checkShadowInParent;
    private getParentNodes;
    private getSourceFileChildren;
    private checkShadowInNodeChildren;
    /**
     * 检查当前节点是否与源节点同名
     * @param targetFile 目标文件
     * @param sourceFile 源文件
     * @param sourceNode 待上报的节点
     * @param aNode 遍历中的shadow节点
     * @returns 是否同名
     */
    private checkShadowWithNode;
    private checkCommon;
    private isOverloadImplementation;
    private checkForStatement;
    private memberReport;
    private variableReport;
    private isInNestedLoop;
    private getForStatementNodes;
    private checkParameter;
    private checkTypeParameterDeclaration;
    private isInInterfaceMethodOverload;
    private checkImportDeclaration;
    private checkVariableStatement;
    private getContainingFunction;
    private hasSameNameParameter;
    private isFunctionTypeParameter;
    private isInFunction;
    private checkWhileStatement;
    private getVariableStatementNodes;
    private handleImportDeclaration;
    private reportShadow;
    /**
     * 跳过报错
     * @param sourceNode 源节点
     * @param shadowNode 阴影节点
     * @param startLine 源节点开始行
     * @param startCol 源节点开始列
     * @param shadowLine 阴影节点开始行
     * @param shadowCol 阴影节点开始列
     * @returns 是否跳过报错
     */
    private skipReportShadow;
    private isStaticVarExist;
    private getNodesForNode;
    private isNodeInStatic;
    private isNodeInFunction;
    private isNodeInKind;
    private isNodeStartVar;
    private addIssueReport;
    private isInLoop;
    private getNearestScope;
    private isSameScope;
}
