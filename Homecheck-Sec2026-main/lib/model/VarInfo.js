"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VarInfo = void 0;
class VarInfo {
    stmt;
    scope;
    constructor(stmt, scope) {
        this.stmt = stmt;
        this.scope = scope;
    }
}
exports.VarInfo = VarInfo;
