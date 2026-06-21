"use strict";
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
exports.Scope = exports.ScopeType = exports.TempLocation = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'Scope');
var TempLocation;
(function (TempLocation) {
    TempLocation[TempLocation["NOFOUND"] = 0] = "NOFOUND";
    TempLocation[TempLocation["LEFT"] = 1] = "LEFT";
    TempLocation[TempLocation["RIGHT"] = 2] = "RIGHT";
})(TempLocation = exports.TempLocation || (exports.TempLocation = {}));
var ScopeType;
(function (ScopeType) {
    ScopeType[ScopeType["IF_TYPE"] = 0] = "IF_TYPE";
    ScopeType[ScopeType["ELSE_TYPE"] = 1] = "ELSE_TYPE";
    ScopeType[ScopeType["FOR_CONDITION_TYPE"] = 2] = "FOR_CONDITION_TYPE";
    ScopeType[ScopeType["FOR_IN_TYPE"] = 3] = "FOR_IN_TYPE";
    ScopeType[ScopeType["WHILE_TYPE"] = 4] = "WHILE_TYPE";
    ScopeType[ScopeType["CASE_TYPE"] = 5] = "CASE_TYPE";
    ScopeType[ScopeType["UNKNOWN_TYPE"] = 10] = "UNKNOWN_TYPE";
})(ScopeType = exports.ScopeType || (exports.ScopeType = {}));
class Scope {
    parentScope;
    childScopeList;
    defList;
    blocks;
    scopeLevel;
    scopeType;
    constructor(parent, defList, level, type = ScopeType.UNKNOWN_TYPE) {
        this.parentScope = parent;
        this.childScopeList = new Array();
        this.defList = defList;
        this.blocks = new Set();
        this.scopeLevel = level;
        this.scopeType = type;
    }
    setChildScope(child) {
        this.childScopeList.push(child);
    }
    addVariable(variable) {
        this.defList.push(variable);
    }
}
exports.Scope = Scope;
