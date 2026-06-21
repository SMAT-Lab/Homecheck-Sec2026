export type Range = [number, number];
export declare class FixInfo {
    fixed?: boolean;
}
export declare class RuleFix extends FixInfo {
    /**
     * 被修复字符串的起始位置
     */
    range: Range;
    /**
     * 要替换的文本
     */
    text: string;
}
export declare class FunctionFix extends FixInfo {
    /**
     * 修复方法,入参为ArkFile和fixkey
     */
    fix: Function;
}
export declare class AIFix extends FixInfo {
    /**
     * 提供给大模型的修复语义
     */
    text: string[];
}
export declare enum FixMode {
    AST = 0,
    ARKFILE = 1,
    AI = 2,
    UNKNOWN = 3
}
