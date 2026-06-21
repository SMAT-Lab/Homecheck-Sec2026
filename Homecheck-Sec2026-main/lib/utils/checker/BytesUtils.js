"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLength = exports.readUInt = exports.readUInt64 = exports.readUInt32LE = exports.readUInt32BE = exports.readInt32LE = exports.readUInt24LE = exports.readUInt16LE = exports.readUInt16BE = exports.readInt16LE = exports.toHexString = exports.toUTF8String = void 0;
const decoder = new TextDecoder();
const toUTF8String = (input, start = 0, end = input.length) => decoder.decode(input.slice(start, end));
exports.toUTF8String = toUTF8String;
const toHexString = (input, start = 0, end = input.length) => input.slice(start, end).reduce((memo, i) => memo + `0${i.toString(16)}`.slice(-2), '');
exports.toHexString = toHexString;
const getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
const readInt16LE = (input, offset = 0) => getView(input, offset).getInt16(0, true);
exports.readInt16LE = readInt16LE;
const readUInt16BE = (input, offset = 0) => getView(input, offset).getUint16(0, false);
exports.readUInt16BE = readUInt16BE;
const readUInt16LE = (input, offset = 0) => getView(input, offset).getUint16(0, true);
exports.readUInt16LE = readUInt16LE;
const readUInt24LE = (input, offset = 0) => {
    const view = getView(input, offset);
    return view.getUint16(0, true) + (view.getUint8(2) << 16);
};
exports.readUInt24LE = readUInt24LE;
const readInt32LE = (input, offset = 0) => getView(input, offset).getInt32(0, true);
exports.readInt32LE = readInt32LE;
const readUInt32BE = (input, offset = 0) => getView(input, offset).getUint32(0, false);
exports.readUInt32BE = readUInt32BE;
const readUInt32LE = (input, offset = 0) => getView(input, offset).getUint32(0, true);
exports.readUInt32LE = readUInt32LE;
const readUInt64 = (input, offset, isBigEndian) => getView(input, offset).getBigUint64(0, !isBigEndian);
exports.readUInt64 = readUInt64;
const methods = {
    readUInt16BE: exports.readUInt16BE,
    readUInt16LE: exports.readUInt16LE,
    readUInt32BE: exports.readUInt32BE,
    readUInt32LE: exports.readUInt32LE
};
function readUInt(input, bits, offset = 0, isBigEndian = false) {
    const endian = isBigEndian ? 'BE' : 'LE';
    const methodName = `readUInt${bits}${endian}`;
    return methods[methodName](input, offset);
}
exports.readUInt = readUInt;
const INCH_CM = 2.54;
const units = {
    in: 96,
    cm: 96 / INCH_CM,
    em: 16,
    ex: 8,
    m: (96 / INCH_CM) * 100,
    mm: 96 / INCH_CM / 10,
    pc: 96 / 72 / 12,
    pt: 96 / 72,
    px: 1,
};
const unitsReg = new RegExp(`^([0-9.]+(?:e\\d+)?)(${Object.keys(units).join('|')})?$`);
function getLength(len) {
    const m = unitsReg.exec(len);
    if (!m) {
        return undefined;
    }
    return Math.round(Number(m[1]) * (units[m[2]] || 1));
}
exports.getLength = getLength;
