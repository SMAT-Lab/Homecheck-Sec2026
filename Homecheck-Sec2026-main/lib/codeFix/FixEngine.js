"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixEngine = void 0;
const Fix_1 = require("../model/Fix");
const AIFixEngine_1 = require("./engines/AIFixEngine");
const EsLintFixEngine_1 = require("./engines/EsLintFixEngine");
const HomeCheckFixEngine_1 = require("./engines/HomeCheckFixEngine");
class FixEngine {
    getEngine(mode) {
        if (mode === Fix_1.FixMode.AST) {
            return new EsLintFixEngine_1.EsLintFixEngine();
        }
        else if (mode === Fix_1.FixMode.ARKFILE) {
            return new HomeCheckFixEngine_1.HomeCheckFixEngine();
        }
        else if (mode === Fix_1.FixMode.AI) {
            return new AIFixEngine_1.AIFixEngine();
        }
        throw TypeError(`${mode} does not support!`);
    }
}
exports.FixEngine = FixEngine;
