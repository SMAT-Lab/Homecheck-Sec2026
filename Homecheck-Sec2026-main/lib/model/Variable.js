"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variable = void 0;
class Variable {
    defStmt;
    redefInfo;
    leftUsedInfo;
    constructor(defStmt) {
        this.defStmt = defStmt;
        this.redefInfo = new Set();
        this.leftUsedInfo = new Set();
    }
    getName() {
        return this.defStmt.getDef().getName();
    }
}
exports.Variable = Variable;
