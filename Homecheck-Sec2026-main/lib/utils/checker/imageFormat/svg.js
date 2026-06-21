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
exports.SVG = void 0;
const BytesUtils_1 = require("../BytesUtils");
const svgReg = /<svg\s([^>"']|"[^"]*"|'[^']*')*>/;
const extractorRegExps = {
    root: svgReg,
    height: /\sheight=(['"])([^%]+?)\1/,
    width: /\swidth=(['"])([^%]+?)\1/,
    viewbox: /\sviewbox=(['"])(.+?)\1/i,
};
function parseViewbox(viewbox) {
    const bounds = viewbox.split(' ');
    let tmpWeight = (0, BytesUtils_1.getLength)(bounds[3]);
    let tmpWidth = (0, BytesUtils_1.getLength)(bounds[2]);
    if (tmpWidth && tmpWeight) {
        return { height: tmpWeight, width: tmpWidth };
    }
    return undefined;
}
function getAttirbutes(root) {
    const widths = root.match(extractorRegExps.width);
    const heights = root.match(extractorRegExps.height);
    const viewbox = root.match(extractorRegExps.viewbox);
    if (widths && heights && viewbox) {
        let tempHeight = (0, BytesUtils_1.getLength)(heights[2]);
        let tmpWidth = (0, BytesUtils_1.getLength)(widths[2]);
        if (tmpWidth && tempHeight) {
            return {
                height: heights && tempHeight,
                viewbox: viewbox && parseViewbox(viewbox[2]),
                width: widths && tmpWidth,
            };
        }
    }
    return undefined;
}
function calculateByDimensions(attrs) {
    return {
        height: attrs.height,
        width: attrs.width,
    };
}
function calculateByViewbox(attrs, viewbox) {
    const ratio = viewbox.width / viewbox.height;
    if (attrs.height) {
        return {
            height: attrs.height,
            width: Math.floor(attrs.height * ratio)
        };
    }
    else if (attrs.width) {
        return {
            height: Math.floor(attrs.width * ratio),
            width: attrs.width,
        };
    }
    else {
        return {
            height: viewbox.height,
            width: viewbox.width,
        };
    }
}
exports.SVG = {
    validate: (input) => svgReg.test((0, BytesUtils_1.toUTF8String)(input, 0, 1000)),
    calculate(input) {
        const root = (0, BytesUtils_1.toUTF8String)(input).match(extractorRegExps.root);
        if (root) {
            const attrs = getAttirbutes(root[0]);
            if (attrs) {
                if (attrs.width && attrs.height) {
                    return calculateByDimensions(attrs);
                }
                if (attrs.viewbox) {
                    return calculateByViewbox(attrs, attrs.viewbox);
                }
            }
        }
        throw new TypeError('Invalid SVG');
    },
};
