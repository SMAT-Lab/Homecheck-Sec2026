/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
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

const { initConfig } = require('./lib/fast_build/common/init_config');
const { getCleanConfig } = require('./main');
const { etsTransform, createProgramPlugin } = require('./lib/fast_build/ets_ui/rollup-plugin-ets-typescript');
const { etsChecker } = require('./lib/fast_build/ets_ui/rollup-plugin-ets-checker');
const { apiTransform } = require('./lib/fast_build/system_api/rollup-plugin-system-api');
const { genAbc } = require('./lib/fast_build/ark_compiler/rollup-plugin-gen-abc');
const { watchChangeFiles } = require('./lib/fast_build/common/rollup-plugin-watch-change');
const { visualTransform } = require('./lib/fast_build/visual/rollup-plugin-visual');
const { terserPlugin } = require('./lib/fast_build/ark_compiler/terser-plugin');
const { babelPlugin } = require('./lib/fast_build/ark_compiler/babel-plugin');
const { JSBUNDLE, RELEASE } = require('./lib/fast_build/ark_compiler/common/ark_define');
const { generateConsumerObConfigFile } = require('./lib/fast_build/ark_compiler/common/ob_config_resolver');
const { etsStandaloneChecker } = require('./lib/ets_checker');

exports.initConfig = initConfig;
exports.getCleanConfig = getCleanConfig;
exports.generateConsumerObConfigFile = generateConsumerObConfigFile;
exports.etsStandaloneChecker = etsStandaloneChecker;

// list of functional plugins
exports.sdkPlugins = (projectConfig) => {
    return [
        watchChangeFiles(),
        etsChecker(),
        visualTransform(),
        etsTransform(),
        apiTransform(),
        genAbc(),
        projectConfig.buildMode?.toLowerCase() === RELEASE && terserPlugin(),
        projectConfig.compileMode === JSBUNDLE && babelPlugin(projectConfig),
        createProgramPlugin()
    ];
};
exports.sdkPluginsMap = {
    'watchChangeFiles': 0,
    'etsChecker': 1,
    'visualTransform': 2,
    'etsTransform': 3,
    'apiTransform': 4,
    'genAbc': 5,
    'terserPlugin': 6,
    'babelPlugin': 7,
    'createProgramPlugin': 8
};

exports.resolveFileExtensions = [];
