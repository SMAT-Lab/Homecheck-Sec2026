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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerStorage = void 0;
class CheckerStorage {
    static instance;
    scopeMap = new Map();
    apiVersion = 16;
    product = '';
    /**
     * 获取 CheckerStorage 的单例实例
     * @returns {CheckerStorage} CheckerStorage 的单例实例
     */
    static getInstance() {
        if (!CheckerStorage.instance) {
            CheckerStorage.instance = new CheckerStorage();
        }
        return CheckerStorage.instance;
    }
    /**
     * 根据文件路径获取Scope
     * @param filePath - 文件路径
     * @returns Scope | undefined - 返回Scope对象或undefined
     */
    getScope(filePath) {
        return this.scopeMap.get(filePath);
    }
    /**
     * 设置Scope映射
     * @param scopeMap - Scope映射，类型为 Map<string, Scope>
     */
    setScopeMap(scopeMap) {
        this.scopeMap = scopeMap;
    }
    /**
     * 设置API版本
     * @param api API版本号
     */
    setApiVersion(api) {
        this.apiVersion = api;
    }
    /**
     * 获取API版本号
     * @returns {number} 返回API版本号
     */
    getApiVersion() {
        return this.apiVersion;
    }
    /**
     * 设置product
     * @param product
     */
    setProduct(pro) {
        this.product = pro;
    }
    /**
     * 获取product
     * @returns {string} 返回product
     */
    getProduct() {
        return this.product;
    }
}
exports.CheckerStorage = CheckerStorage;
