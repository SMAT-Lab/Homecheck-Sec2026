"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewTreeTool = void 0;
const arkanalyzer_1 = require("arkanalyzer");
class ViewTreeTool {
    recordMap;
    constructor() {
        this.recordMap = new Map();
    }
    hasTraverse(item) {
        let classSig = '';
        if (item instanceof arkanalyzer_1.ArkClass) {
            classSig = item.getSignature().toString();
        }
        else {
            if (item.signature) {
                classSig = item.signature.toString();
            }
            else {
                return false;
            }
        }
        let result = this.recordMap.get(classSig);
        this.recordMap.set(classSig, true);
        return result === true;
    }
}
exports.ViewTreeTool = ViewTreeTool;
