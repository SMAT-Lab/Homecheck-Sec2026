"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerFactory = void 0;
const CheckerIndex_1 = require("./CheckerIndex");
class CheckerFactory {
    static getChecker(rule) {
        const checkerInstance = CheckerIndex_1.ProxyChecker.getClass(rule.ruleId);
        if (!checkerInstance) {
            return null;
        }
        checkerInstance.rule = rule;
        return checkerInstance;
    }
}
exports.CheckerFactory = CheckerFactory;
