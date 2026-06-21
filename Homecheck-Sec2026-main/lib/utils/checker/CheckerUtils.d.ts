import { Stmt } from 'arkanalyzer/lib/core/base/Stmt';
import { AbstractInvokeExpr } from 'arkanalyzer/lib/core/base/Expr';
import { ArkClass, ArkFile, Scene, Value } from 'arkanalyzer';
import { ScopeType, TempLocation } from '../../model/Scope';
export declare class CheckerUtils {
    /**
     * 从给定的语句中获取调用表达式
     * @param stmt - 要处理的语句
     * @returns 如果找到调用表达式，则返回 AbstractInvokeExpr，否则返回 null
     */
    static getInvokeExprFromStmt(stmt: Stmt): AbstractInvokeExpr | null;
    /**
     * 从给定的语句中获取调用表达式（Await）
     * @param stmt - 要处理的语句
     * @returns 如果找到调用表达式，则返回 AbstractInvokeExpr，否则返回 null
     */
    static getInvokeExprFromAwaitStmt(stmt: Stmt): AbstractInvokeExpr | null;
    /**
     * 获取语句的Scope类型
     * @param stmt 语句对象
     * @returns Scope类型
     */
    static getScopeType(stmt: Stmt): ScopeType;
    /**
     * 判断给定的语句是否是声明语句
     * @param defName - 要检查的变量名
     * @param stmt - 要检查的语句
     * @returns 如果语句是声明语句，则返回true，否则返回false
     */
    static isDeclaringStmt(defName: string, stmt: Stmt): boolean;
    /**
     * 获取语句中临时变量的位置
     * @param stmt 语句
     * @returns 临时变量的位置
     */
    static wherIsTemp(stmt: Stmt): TempLocation;
    /**
     * 根据文件路径获取ArkFile对象
     * @param scene Scene
     * @param absolutePath 文件的绝对路径
     * @returns 返回对应的ArkFile对象，如果未找到则返回null
     */
    static getArkFileByFilePath(scene: Scene, absolutePath: string): ArkFile | null;
    /**
     * 获取参数的右值
     * @param arg - 参数
     * @param arkClass - ArkClass对象
     * @returns Value | null - 返回参数的右值，如果不存在则返回null
     */
    static getArgRight(arg: Value, arkClass: ArkClass): Value | null;
}
