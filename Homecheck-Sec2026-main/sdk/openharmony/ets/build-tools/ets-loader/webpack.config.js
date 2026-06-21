/*
 * Copyright (c) 2020 Huawei Device Co., Ltd.
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
const fs = require('fs');
const CopyPlugin = require('copy-webpack-plugin');
const Webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { GenAbcPlugin } = require('./lib/gen_abc_plugin');
const buildPipeServer = require('./server/build_pipe_server');

const {
  projectConfig,
  loadEntryObj,
  loadWorker,
  abilityConfig,
  readWorkerFile,
  loadModuleInfo,
  checkAppResourcePath,
  addSDKBuildDependencies,
  readPatchConfig,
  getCleanConfig,
  globalModulePaths
} = require('./main');
const { ResultStates } = require('./lib/compile_info');
const { processUISyntax } = require('./lib/process_ui_syntax');
const {
  IGNORE_ERROR_CODE,
  removeDir,
  mkdirsSync,
  getResolveModules
} = require('./lib/utils');
const { BUILD_SHARE_PATH, PREBUILDINFO_JSON } = require('./lib/pre_define');
process.env.watchMode = (process.env.watchMode && process.env.watchMode === 'true') || 'false';

function initConfig(config) {
  const projectPath = path.resolve(projectConfig.projectPath);
  Object.assign(config, {
    entry: projectConfig.entryObj,
    watch: process.env.watchMode === 'true',
    watchOptions: {
      aggregateTimeout: 10,
      poll: false,
      ignored: /node_modules/
    },
    output: {
      path: path.resolve(__dirname, projectConfig.buildPath),
      filename: '[name].js',
      devtoolModuleFilenameTemplate: 'webpack:///[absolute-resource-path]',
      globalObject: 'globalThis'
    },
    devtool: 'nosources-source-map',
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.d\.ts/,
          use: [{ loader: path.resolve(__dirname, 'lib/process_dts_file.js') }]
        },
        {
          test: /(?<!\.d)\.(ets|ts)$/,
          use: [
            { loader: path.resolve(__dirname, 'lib/result_process.js') },
            {
              loader: 'ts-loader',
              options: {
                reportFiles: ['*.js'],
                onlyCompileBundledFiles: true,
                transpileOnly: true,
                configFile: path.resolve(__dirname,
                  projectConfig.compileMode === 'esmodule' ? 'tsconfig.esm.json' : 'tsconfig.json'),
                getCustomTransformers(program) {
                  let transformerOperation = {
                    before: [processUISyntax(program)],
                    after: []
                  };

                  return transformerOperation;
                },
                ignoreDiagnostics: IGNORE_ERROR_CODE
              }
            },
            { loader: path.resolve(__dirname, 'lib/pre_process.js') }
          ]
        },
        setJsConfigRule()
      ]
    },
    node: {
      global: false
    },
    resolve: {
      symlinks: projectConfig.compileMode === 'esmodule' ? false : true,
      extensions: ['.js', '.ets', '.ts', '.d.ts', '.d.ets'],
      modules: [
        projectPath,
        './node_modules',
        path.join(__dirname, 'node_modules'),
        ...globalModulePaths
      ]
    },
    stats: { preset: 'none' },
    plugins: [
      new Webpack.WatchIgnorePlugin({
        paths: [
          /\.d\.ts$/
        ]
      }),
      new ResultStates()
    ]
  });
  setModuleJsonConfigRule(config);
  if (!projectConfig.xtsMode) {
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.resolve(projectConfig.cachePath, '.ets_cache',
        path.basename(projectConfig.projectPath))
    };
  }
  if (!projectConfig.aceModuleJsonPath) {
    config.resolve.modules.push(...getResolveModules(projectPath, true));
    existsPackageJson(config, path.resolve(projectPath, '../../../../../package.json'),
      path.resolve(projectPath, '../../../../package.json'));
  } else {
    config.resolve.modules.push(...getResolveModules(projectPath, false));
    existsPackageJson(config, path.resolve(projectPath, '../../../../package.json'),
      path.resolve(projectPath, '../../../package.json'));
  }
}

function setJsConfigRule() {
  const jsRule = {
    test: /\.js$/,
    use: [
      { loader: path.resolve(__dirname, 'lib/process_source_file.js') },
      {
        loader: 'babel-loader',
        options: {
          plugins: ['@babel/plugin-proposal-class-properties'],
          compact: false
        }
      },
      { loader: path.resolve(__dirname, 'lib/process_system_module.js') }
    ]
  };
  if (projectConfig.compileMode !== 'esmodule') {
    jsRule.type = 'javascript/auto';
    jsRule.use[1].options.plugins.unshift([
      '@babel/plugin-transform-modules-commonjs',
      {
        'allowTopLevelThis': true
      }
    ]);
  } else {
    jsRule.resolve = { fullySpecified: false };
  }
  if (projectConfig.compileHar) {
    jsRule.use.unshift({ loader: path.resolve(__dirname, 'lib/process_har_writejs.js')});
  }
  return jsRule;
}

function setModuleJsonConfigRule(config) {
  if (projectConfig.compileMode !== 'esmodule') {
    return;
  }
  const jsonRule = {
    test: /\.json$/,
    use: [
      { loader: path.resolve(__dirname, 'lib/process_source_file.js') }
    ]
  };
  config.module.rules.push(jsonRule);
}

function existsPackageJson(config, rootPackageJsonPath, modulePackageJsonPath) {
  if (config.cache) {
    config.cache.buildDependencies = {
      config: []
    };
    if (fs.existsSync(rootPackageJsonPath)) {
      config.cache.buildDependencies.config.push(rootPackageJsonPath);
    }
    if (fs.existsSync(modulePackageJsonPath)) {
      config.cache.buildDependencies.config.push(modulePackageJsonPath);
    }
  }
}

function setProjectConfig(envArgs) {
  const args = Object.keys(envArgs);
  if (args.indexOf('projectName') === args.length - 2) {
    projectConfig.projectPath = path.join(process.cwd(), args[args.length - 1]);
  }
  if (envArgs.aceModuleRoot) {
    projectConfig.projectPath = envArgs.aceModuleRoot;
  }
  if (envArgs.aceModuleBuild) {
    projectConfig.buildPath = envArgs.aceModuleBuild;
  }
  if (envArgs.aceManifestPath) {
    projectConfig.manifestFilePath = envArgs.aceManifestPath;
  }
  if (envArgs.aceProfilePath) {
    projectConfig.aceProfilePath = envArgs.aceProfilePath;
  }
  if (envArgs.aceModuleJsonPath) {
    projectConfig.aceModuleJsonPath = envArgs.aceModuleJsonPath;
  }
  if (envArgs.cachePath) {
    projectConfig.cachePath = envArgs.cachePath;
  }
  if (envArgs.isPreview === 'true') {
    projectConfig.isPreview = true;
  }
}

function setReleaseConfig(config) {
  const TerserPlugin = require('terser-webpack-plugin');
  config.mode = 'production';
  if ((process.env.compileMode !== 'moduleJson' || projectConfig.splitCommon) &&
    abilityConfig.abilityType === 'page') {
    config.optimization = config.optimization;
  } else {
    config.optimization = {};
  }
  Object.assign(config.optimization, {
    emitOnErrors: true,
    usedExports: false,
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: {
          defaults: false,
          dead_code: true,
          collapse_vars: true,
          unused: true,
          drop_debugger: true,
          if_return: true,
          reduce_vars: true,
          join_vars: false,
          sequences: 0
        },
        format: {
          semicolons: false,
          beautify: true,
          braces: true,
          indent_level: 2
        }
      }
    })]
  });
  config.output.devtoolModuleFilenameTemplate = (info) => {
    return `webpack:///${info.absoluteResourcePath.replace(projectConfig.projectRootPath, '')}`;
  };
  config.output.sourceMapFilename = '_releaseMap/[name].js.map';
  config.performance = {
    hints: false
  };
}

function setCopyPluginConfig(config, appResource, isPreview) {
  const copyPluginPattrens = [];
  copyPluginPattrens.push({
    from: '**/*',
    context: path.resolve(__dirname, projectConfig.projectPath),
    globOptions: {
      ignore: [
        '**/*.ets',
        '**/*.ts',
        '**/*.js',
        path.resolve(__dirname, projectConfig.buildPath, '**').replace(/\\/g, '/')
      ]
    },
    to: path.resolve(__dirname, projectConfig.buildPath),
    noErrorOnMissing: true
  });
  const sharePath = path.resolve(__dirname, projectConfig.projectPath, BUILD_SHARE_PATH);
  if (fs.existsSync(sharePath)) {
    copyPluginPattrens.push({
      from: '**/*',
      context: path.resolve(__dirname, projectConfig.projectPath, BUILD_SHARE_PATH),
      to: path.resolve(__dirname, projectConfig.buildPath, BUILD_SHARE_PATH),
      globOptions: {
        ignore: [
          '**/*.ets',
          '**/*.ts',
          '**/*.js',
        ]
      },
      noErrorOnMissing: true
    });
  }
  if (abilityConfig.abilityType === 'page') {
    if (fs.existsSync(projectConfig.manifestFilePath)) {
      copyPluginPattrens.push({
        from: projectConfig.manifestFilePath,
        to: path.resolve(__dirname, projectConfig.buildPath)
      });
    } else if (fs.existsSync(projectConfig.aceConfigPath)) {
      copyPluginPattrens.push({
        from: projectConfig.aceConfigPath,
        to: path.resolve(__dirname, projectConfig.buildPath)
      });
    }
  }
  if (appResource && fs.existsSync(appResource) && !projectConfig.xtsMode &&
    isPreview === 'true') {
    copyPluginPattrens.push({
      from: path.resolve(__dirname, appResource),
      to: path.resolve(__dirname, projectConfig.cachePath)
    });
  }
  config.plugins.push(new CopyPlugin({ patterns: copyPluginPattrens }));
}

function excludeWorker(workerFile, name) {
  if (workerFile) {
    return Object.keys(workerFile).includes(name);
  }
  return /^\.\/workers\//.test(name);
}

function setOptimizationConfig(config, workerFile) {
  if ((process.env.compileMode !== 'moduleJson' || projectConfig.splitCommon) &&
    abilityConfig.abilityType === 'page') {
    config.optimization = {
      splitChunks: {
        chunks(chunk) {
          return !excludeWorker(workerFile, chunk.name) && !/^\.\/TestAbility/.test(chunk.name);
        },
        minSize: 0,
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            name: 'vendors',
          },
          commons: {
            name: 'commons',
            priority: -20,
            minChunks: 2,
            reuseExistingChunk: true
          }
        }
      }
    };
  }
}

function setGenAbcPlugin(env, config) {
  process.env.compilerType = 'ark';
  process.env.panda = projectConfig.pandaMode;
  let arkDir = path.join(__dirname, 'bin', 'ark');
  if (env.arkFrontendDir) {
    arkDir = env.arkFrontendDir;
  }
  let nodeJs = 'node';
  if (env.nodeJs) {
    nodeJs = env.nodeJs;
  }
  config.plugins.push(new GenAbcPlugin(projectConfig.buildPath, arkDir, nodeJs,
    env.buildMode === 'debug'));
  if (env.buildMode === 'release') {
    config.output.path = path.join(projectConfig.cachePath, 'releaseAssets',
      path.basename(projectConfig.buildPath));
  }
}

function setCleanWebpackPlugin(workerFile, config) {
  config.plugins.push(
    new CleanWebpackPlugin({
      dry: false,
      dangerouslyAllowCleanPatternsOutsideProject: true,
      cleanOnceBeforeBuildPatterns: getCleanConfig(workerFile)
    })
  );
}

function clearWebpackCacheByBuildInfo() {
  if (!projectConfig.cachePath || projectConfig.xtsMode) {
    return;
  }

  // clear&update cache dir when build info is different from last time
  const cachePrebuildInfoPath = path.join(projectConfig.cachePath, PREBUILDINFO_JSON);
  if (fs.existsSync(cachePrebuildInfoPath)) {
    let cachedJson = undefined;
    try {
      cachedJson = JSON.parse(fs.readFileSync(cachePrebuildInfoPath).toString());
    } catch {
      removeDir(projectConfig.cachePath);
      mkdirsSync(projectConfig.cachePath);
    }
    if (projectConfig.compileMode === 'esmodule' && cachedJson &&
      (cachedJson.buildMode && cachedJson.buildMode !== projectConfig.buildArkMode ||
      cachedJson.bundleName && cachedJson.bundleName !== projectConfig.bundleName ||
      cachedJson.moduleName && cachedJson.moduleName !== projectConfig.moduleName)) {
      removeDir(projectConfig.cachePath);
      mkdirsSync(projectConfig.cachePath);
    }
    // api version is 8 or 9
    if (projectConfig.compileMode === 'jsbundle' && cachedJson &&
      cachedJson.minAPIVersion && cachedJson.minAPIVersion.toString() !== process.env.minPlatformVersion) {
      removeDir(projectConfig.cachePath);
      mkdirsSync(projectConfig.cachePath);
    }
  }
}

module.exports = (env, argv) => {
  const config = {};
  setProjectConfig(env);
  loadEntryObj(projectConfig);
  loadModuleInfo(projectConfig, env);
  clearWebpackCacheByBuildInfo();
  initConfig(config);
  readPatchConfig();
  const workerFile = readWorkerFile();
  setOptimizationConfig(config, workerFile);
  setCleanWebpackPlugin(workerFile, config);

  if (env.isPreview !== 'true') {
    loadWorker(projectConfig, workerFile);
    if (env.compilerType && env.compilerType === 'ark' && !projectConfig.compileHar) {
      setGenAbcPlugin(env, config);
    }
  } else {
    projectConfig.isPreview = true;
    projectConfig.checkEntry = env.checkEntry;
    setGenAbcPlugin(env, config);
    let port;
    process.argv.forEach((val, index) => {
      if (val.startsWith('port=')) {
        port = val.split('=')[1];
      }
    });
    if (port) {
      buildPipeServer.init(port);
    }
  }

  if (projectConfig.compileHar && env.obfuscate === 'uglify') {
    projectConfig.obfuscateHarType = 'uglify';
  }

  if (env.sourceMap === 'none') {
    config.devtool = false;
  }

  if (env.buildMode === 'release' && projectConfig.compileMode !== 'esmodule') {
    setReleaseConfig(config);
  }

  if (projectConfig.compileMode === 'esmodule' && projectConfig.harNameOhmMap) {
    config.externals = [];
    for (const harName in projectConfig.harNameOhmMap) {
      config.externals.push(RegExp('^(' + harName + ')($|\\/\\S+)'));
    }
  }

  const appResourcePath = env.appResource || process.env.appResource;
  checkAppResourcePath(appResourcePath, config);
  setCopyPluginConfig(config, appResourcePath, env.isPreview);
  addSDKBuildDependencies(config);
  config.output.library = projectConfig.hashProjectPath;
  return config;
};
