/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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

"use strict";
const path = require("path");
const fs = require("fs");
const spawn = require('child_process').spawn;

let isWin = !1;
let isMac = !1;

let args = process.argv.splice(2);
let es2abc;
if (args[0].startsWith("es2abc=")) {
    es2abc = args[0].replace("es2abc=", "");
    args = args.splice(1);
} else {
    const arkDir = path.resolve(__dirname);
    if (fs.existsSync(path.join(arkDir, 'build-win'))) {
        isWin = !0;
    } else if (fs.existsSync(path.join(arkDir, 'build-mac'))) {
        isMac = !0;
    } else if (!fs.existsSync(path.join(arkDir, 'build'))) {
        throw Error('find build fail').message;
    }

    if (isWin) {
        es2abc = path.join(arkDir, 'build-win', 'bin', 'es2abc.exe');
    } else if (isMac) {
        es2abc = path.join(arkDir, 'build-mac', 'bin', 'es2abc');
    } else {
        es2abc = path.join(arkDir, 'build', 'bin', 'es2abc');
    }
}

function callEs2abc(args) {
    if (!fs.existsSync(es2abc)) {
        throw Error('find arkcompiler fail').message;
    }
    let proc = spawn(`${es2abc}`, args);

    proc.stderr.on('data', (data) => {
        throw Error(`${data}`).message;
    });

    proc.stdout.on('data', (data) => {
        process.stdout.write(`${data}`);
    });
}

// keep bc-version to be compatible with old IDE versions
if (args.length == 1 && args[0] == "--bc-version") {
    callEs2abc(args);
    return;
}

let es2abcArgs = [];
es2abcArgs.push("--target-bc-version")

for (let index = 0 ; index < args.length; index += 2) {
    if (args[index] == "--target-api-version") {
        if (args[index + 1] == "8") {
            process.stdout.write("0.0.0.2");
            return;
        } else {
            es2abcArgs.push("--target-api-version", args[index + 1]);
        }
    } else if (args[index] == "--target-api-sub-version") {
        es2abcArgs.push("--target-api-sub-version", args[index + 1]);
    }
}

callEs2abc(es2abcArgs);
