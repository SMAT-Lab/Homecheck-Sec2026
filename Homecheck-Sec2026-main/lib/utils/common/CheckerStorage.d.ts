import { Scope } from '../../model/Scope';
export declare class CheckerStorage {
    private static instance;
    private scopeMap;
    private apiVersion;
    private product;
    /**
     * 获取 CheckerStorage 的单例实例
     * @returns {CheckerStorage} CheckerStorage 的单例实例
     */
    static getInstance(): CheckerStorage;
    /**
     * 根据文件路径获取Scope
     * @param filePath - 文件路径
     * @returns Scope | undefined - 返回Scope对象或undefined
     */
    getScope(filePath: string): Scope | undefined;
    /**
     * 设置Scope映射
     * @param scopeMap - Scope映射，类型为 Map<string, Scope>
     */
    setScopeMap(scopeMap: Map<string, Scope>): void;
    /**
     * 设置API版本
     * @param api API版本号
     */
    setApiVersion(api: number): void;
    /**
     * 获取API版本号
     * @returns {number} 返回API版本号
     */
    getApiVersion(): number;
    /**
     * 设置product
     * @param product
     */
    setProduct(pro: string): void;
    /**
     * 获取product
     * @returns {string} 返回product
     */
    getProduct(): string;
}
