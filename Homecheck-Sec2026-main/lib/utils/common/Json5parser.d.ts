import { ts } from 'arkanalyzer';
export declare class Json5parser {
    /**
     * 获取JSON5文件的根对象字面量表达式
     * @param file - JSON5文件的源文件对象
     * @returns 如果找到根对象字面量表达式，则返回该表达式；否则返回undefined
     */
    static getRootObjectLiteral(file: ts.JsonSourceFile): ts.ObjectLiteralExpression | undefined;
    /**
     * 解析对象字面量表达式
     * @param objectLiteralExpression - 对象字面量表达式
     * @param file - JSON源文件
     * @returns 解析后的对象字面量表达式
     */
    private static parseObjectLiteralExpression;
    /**
     * 解析语法树中的表达式节点
     * @param node - 表达式节点
     * @param file - JSON源文件
     * @returns 解析后的值
     */
    private static parsePropertyInitializer;
    /**
     * 解析数组字面量表达式
     * @param node - 要解析的表达式节点
     * @param file - 所属的 JSON 源文件
     * @returns 解析后的数组
     */
    private static parseArrayLiteral;
    /**
     * 解析JSON文本
     * @param text - 要解析的JSON文本
     * @returns 解析后的对象
     */
    static parseJsonText(text: string): {
        [k: string]: unknown;
    };
}
