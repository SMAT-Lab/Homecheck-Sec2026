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

const path = require('path');
const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve');
const copyPlugin = require('rollup-plugin-copy');
const deletePlugin = require('rollup-plugin-delete');
const { getBabelOutputPlugin } = require('@rollup/plugin-babel');

const {
  projectConfig,
  readAppResource,
  getCleanConfig,
  globalModulePaths
} = require('./main');
const {
  getEntryObj,
  workerFile,
  setCopyPluginConfig
} = require('./lib/fast_build/common/process_project_config');
const {
  getResolveModules
} = require('./lib/utils');
const { etsTransform } = require('./lib/fast_build/ets_ui/rollup-plugin-ets-typescript');
const { etsChecker } = require('./lib/fast_build/ets_ui/rollup-plugin-ets-checker');
const { apiTransform } = require('./lib/fast_build/system_api/rollup-plugin-system-api');
const { watchChangeFiles } = require('./lib/fast_build/common/rollup-plugin-watch-change');
const { initArkConfig } = require('./lib/fast_build/ark_compiler/common/process_ark_config');
const { genAbc } = require('./lib/fast_build/ark_compiler/rollup-plugin-gen-abc');
const { visualTransform } = require('./lib/fast_build/visual/rollup-plugin-visual');

process.env.watchMode = (process.env.watchMode && process.env.watchMode === 'true') || 'false';
process.env.compileTool = 'rollup';

getEntryObj();
if (process.env.appResource) {
  readAppResource(process.env.appResource);
}
initArkConfig(process.env, projectConfig);

const external = [];
if (projectConfig.compileMode === 'esmodule' && projectConfig.harNameOhmMap) {
  for (const harName in projectConfig.harNameOhmMap) {
    external.push(RegExp('^(' + harName + ')($|\/\S+)'));
  }
}

const config = {
  input: projectConfig.entryObj,
  watch: {
    buildDelay: 10
  },
  output: {
    dir: path.resolve(__dirname, projectConfig.buildPath),
    chunkFileNames: '[name].js',
    format: 'cjs',
    sourcemap: true
  },
  external: external,
  plugins: [
    // copyPlugin({targets: setCopyPluginConfig(projectConfig, process.env.appResource)}),
    resolve({
      extensions: ['.js', '.ets', '.ts', '.d.ts', '.d.ets'],
      modulePaths: [
        path.resolve(projectConfig.projectPath),
        path.resolve('node_modules'),
        path.resolve(__dirname, 'node_modules'),
        ...globalModulePaths,
        projectConfig.aceModuleJsonPath ?
          ...getResolveModules(path.resolve(projectConfig.projectPath), false) :
          ...getResolveModules(path.resolve(projectConfig.projectPath), true)
      ]
    }),
    commonjs(),
    getBabelOutputPlugin({
      plugins: [
        '@babel/plugin-proposal-class-properties'
      ],
      compact: false
    }),
    watchChangeFiles(),
    etsChecker(),
    visualTransform(),
    apiTransform(),
    etsTransform(),
    genAbc(),
    deletePlugin({
      targets: getCleanConfig(workerFile),
      runOnce: true
    })
  ]
};

module.exports = config;
