import { LOG_LEVEL } from 'arkanalyzer/lib/utils/logger';
import { Command, OptionValues } from 'commander';
export declare class Utils {
    /**
     * 解析命令行选项
     * @param args 命令行参数数组
     * @returns 解析后的选项值
     */
    static parseCliOptions(args: string[]): OptionValues;
    /**
     * 获取命令行选项
     * @param program Command 对象
     * @param args 命令行参数数组
     * @returns 选项值对象
     */
    static getCliOptions(program: Command, args: string[]): OptionValues;
    /**
     * 设置日志路径
     * @param logPath 日志路径
     */
    static setLogPath(logPath: string, arkLogLevel?: LOG_LEVEL, hcLogLevel?: LOG_LEVEL): void;
    /**
     * 获取枚举类型的值
     * @param value - 枚举值，可以是字符串或数字
     * @param enumType - 枚举类型
     * @returns 枚举值对应的枚举类型值
     */
    static getEnumValues(value: string | number, enumType: any): any;
    /**
     * 按行号和列号对键值对进行排序
     * @param keyA 格式为 "行号%列号%规则ID" 的字符串
     * @param keyB 格式为 "行号%列号%规则ID" 的字符串
     * @returns 排序比较结果
     */
    static sortByLineAndColumn(keyA: string, keyB: string): number;
}
