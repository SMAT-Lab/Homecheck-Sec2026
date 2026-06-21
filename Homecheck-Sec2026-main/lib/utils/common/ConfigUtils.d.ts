import { ExtRuleSet, Rule } from '../../model/Rule';
import { OptionValues } from 'commander';
import { CheckEntry } from './CheckEntry';
import { RuleConfig } from '../../model/RuleConfig';
import { ProjectConfig } from '../../model/ProjectConfig';
import { Message } from '../../model/Message';
export declare class ConfigUtils {
    /**
     * 获取配置文件
     * @param configPath 配置文件路径
     * @param rootDir 根目录，可选参数
     * @returns 返回解析后的配置对象，如果解析失败则返回null
     */
    static getConfig(configPath: string, rootDir?: string): any | null;
    /**
     * 解析配置文件并设置检查入口
     * @param argvObj 命令行参数对象
     * @param checkEntry 检查入口对象
     * @returns 是否成功解析配置文件
     */
    static parseConfig(argvObj: OptionValues, checkEntry: CheckEntry): boolean;
    static setLogConfig(projectConfig: ProjectConfig): void;
    /**
     * 从配置文件中获取规则
     * @param ruleConfig 规则配置
     * @param projectConfig 项目配置
     * @param message 消息通知实例
     * @returns Map, ruleId -- Rule
     */
    static getRuleMap(ruleConfig: RuleConfig, projectConfig: ProjectConfig, message: Message): Map<string, Rule>;
    /**
     * 解析自定义规则配置
     * @param ruleConfig 规则配置
     * @param projectConfig 项目配置
     * @param message 消息对象
     * @param allRules 所有规则集合
     * @param ruleMap 规则映射
     */
    private static parseExtRuleConfig;
    private static processExternalRules;
    /**
     * 通过单个规则配置生成Rule对象，eg: "@ruleSet/ruleName": "error" | ["error", []...]
     * @param ruleCfg - 规则配置，格式为 [string, any]
     * @returns Rule | null - 生成的规则对象或 null
     */
    private static genRuleByOneRuleCfg;
    /**
     * 读取RuleSet.json中配置的规则集
     */
    static getRuleSetMap(rootDir: string): Map<string, object>;
    /**
     * 检查指定的规则是否存在
     * @param ruleId - 要检查的规则ID
     * @param allRules - 包含所有规则的Map对象
     * @returns 如果规则存在则返回true，否则返回false
     */
    static isOnlineRule(ruleId: string, allRules: Map<string, object>): boolean;
    /**
     * 检查自定义规则集配置的有效性
     * @param ruleSet - 自定义规则集
     * @param allRules - 所有规则集合
     * @param extRuleSetSet - 自定义规则集集合
     * @param message - 消息对象
     * @returns {boolean} - 是否通过检查
     */
    static checkExtRuleSetConfig(ruleSet: ExtRuleSet, allRules: Map<string, object>, extRuleSetSet: Set<string>, message: Message): boolean;
}
