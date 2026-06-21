"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Json5parser = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Json5parser');
class Json5parser {
    /**
     * 获取JSON5文件的根对象字面量表达式
     * @param file - JSON5文件的源文件对象
     * @returns 如果找到根对象字面量表达式，则返回该表达式；否则返回undefined
     */
    static getRootObjectLiteral(file) {
        // 检查文件语句是否为空
        if (!file.statements || !file.statements.length) {
            logger.error('The JSON5 file format is incorrect, the root node statements is empty.');
            return undefined;
        }
        const expressionStatement = file.statements[0];
        if (expressionStatement.kind !== arkanalyzer_1.ts.SyntaxKind.ExpressionStatement) {
            logger.error(`The JSON5 file format is incorrect, the first child node is not ExpressionStatement. kind: ${expressionStatement.kind}`);
            return undefined;
        }
        // JSON5顶层对象仅识别一个
        const rootObjectLiteralExpression = expressionStatement.expression;
        if (!rootObjectLiteralExpression) {
            logger.error('The JSON5 file format is incorrect, the first child node expression is empty.');
            return undefined;
        }
        // 检查表达式是否为对象字面量表达式
        if (rootObjectLiteralExpression.kind === arkanalyzer_1.ts.SyntaxKind.ObjectLiteralExpression) {
            return rootObjectLiteralExpression;
        }
        // 检查表达式是否为数组字面量表达式
        if (rootObjectLiteralExpression.kind === arkanalyzer_1.ts.SyntaxKind.ArrayLiteralExpression) {
            const elements = rootObjectLiteralExpression.elements;
            // 检查数组是否为空或第一个元素是否为对象字面量表达式
            if (elements && elements.length && elements[0].kind === arkanalyzer_1.ts.SyntaxKind.ObjectLiteralExpression) {
                return elements[0];
            }
            logger.error('The JSON5 file format is incorrect, the node ArrayLiteralExpression first element is not ObjectLiteralExpression.');
        }
        logger.error('The JSON5 file format is incorrect.');
        return undefined;
    }
    /**
     * 解析对象字面量表达式
     * @param objectLiteralExpression - 对象字面量表达式
     * @param file - JSON源文件
     * @returns 解析后的对象字面量表达式
     */
    static parseObjectLiteralExpression(objectLiteralExpression, file) {
        const res = {};
        objectLiteralExpression.properties.forEach(node => {
            const propNode = node;
            const key = propNode.name.text;
            const value = this.parsePropertyInitializer(propNode.initializer, file);
            res[key] = value;
        });
        return res;
    }
    /**
     * 解析语法树中的表达式节点
     * @param node - 表达式节点
     * @param file - JSON源文件
     * @returns 解析后的值
     */
    static parsePropertyInitializer(node, file) {
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.StringLiteral) {
            return node.text;
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.NumericLiteral) {
            return parseInt(node.text);
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.PrefixUnaryExpression) {
            return Number(node.getText(file));
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.ArrayLiteralExpression) {
            return this.parseArrayLiteral(node, file);
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.ObjectLiteralExpression) {
            return this.parseObjectLiteralExpression(node, file);
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword) {
            return true;
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
            return false;
        }
        return undefined;
    }
    /**
     * 解析数组字面量表达式
     * @param node - 要解析的表达式节点
     * @param file - 所属的 JSON 源文件
     * @returns 解析后的数组
     */
    static parseArrayLiteral(node, file) {
        const res = [];
        node.elements.forEach(n => {
            res.push(this.parsePropertyInitializer(n, file));
        });
        return res;
    }
    /**
     * 解析JSON文本
     * @param text - 要解析的JSON文本
     * @returns 解析后的对象
     */
    static parseJsonText(text) {
        const file = arkanalyzer_1.ts.parseJsonText('', text);
        const rootObjectLiteralExpression = this.getRootObjectLiteral(file);
        if (!rootObjectLiteralExpression) {
            return {};
        }
        return this.parseObjectLiteralExpression(rootObjectLiteralExpression, file);
    }
}
exports.Json5parser = Json5parser;
