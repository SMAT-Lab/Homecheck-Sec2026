import { Type } from 'arkanalyzer';
/**
 * 检查类型是否为指定类型
 *
 * @param appointType 指定类型
 * @param type 被检查类型
 * @returns
 */
export declare function isAppointType(appointType: Type, type: Type): boolean;
/**
 * 递归替换类型中的指定类型
 *
 * @param appointType 指定类型
 * @param type 需要被替换的类型
 * @param newType 新的类型
 * @returns
 */
export declare function fixAppointType(appointType: Type, type: Type, newType: Type): Type;
/**
 * 检查类型中是否有不明确的引用类型
 *
 * @param type 被检查类型
 * @returns
 */
export declare function isUnclearReferenceType(type: Type): boolean;
