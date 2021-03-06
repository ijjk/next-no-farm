"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable
  no-param-reassign
*/
const crypto_1 = __importDefault(require("crypto"));
const source_map_1 = require("source-map");
const webpack_sources_1 = require("webpack-sources");
const RequestShortener_1 = __importDefault(require("webpack/lib/RequestShortener"));
const TaskRunner_1 = __importDefault(require("./TaskRunner"));
const warningRegex = /\[.+:([0-9]+),([0-9]+)\]/;
const JS_REGEX = /\.m?js$/;
class TerserPlugin {
    constructor(options = {}) {
        const { terserOptions = {}, warningsFilter = () => true, sourceMap = false, cache = false, cpus, } = options;
        this.cpus = cpus;
        this.options = {
            warningsFilter,
            sourceMap,
            cache,
            terserOptions: Object.assign({ output: {
                    comments: /^\**!|@preserve|@license|@cc_on/i,
                } }, terserOptions),
        };
    }
    static isSourceMap(input) {
        // All required options for `new SourceMapConsumer(...options)`
        // https://github.com/mozilla/source-map#new-sourcemapconsumerrawsourcemap
        return Boolean(input &&
            input.version &&
            input.sources &&
            Array.isArray(input.sources) &&
            typeof input.mappings === 'string');
    }
    static buildSourceMap(inputSourceMap) {
        if (!inputSourceMap || !TerserPlugin.isSourceMap(inputSourceMap)) {
            return null;
        }
        return new source_map_1.SourceMapConsumer(inputSourceMap);
    }
    static buildError(err, file, sourceMap, requestShortener) {
        // Handling error which should have line, col, filename and message
        if (err.line) {
            const original = sourceMap &&
                sourceMap.originalPositionFor({
                    line: err.line,
                    column: err.col,
                });
            if (original && original.source && requestShortener) {
                return new Error(`${file} from Terser\n${err.message} [${requestShortener.shorten(original.source)}:${original.line},${original.column}][${file}:${err.line},${err.col}]`);
            }
            return new Error(`${file} from Terser\n${err.message} [${file}:${err.line},${err.col}]`);
        }
        else if (err.stack) {
            return new Error(`${file} from Terser\n${err.stack}`);
        }
        return new Error(`${file} from Terser\n${err.message}`);
    }
    static buildWarning(warning, file, sourceMap, requestShortener, warningsFilter) {
        let warningMessage = warning;
        let locationMessage = '';
        let source = null;
        if (sourceMap) {
            const match = warningRegex.exec(warning);
            if (match) {
                const line = +match[1];
                const column = +match[2];
                const original = sourceMap.originalPositionFor({
                    line,
                    column,
                });
                if (original &&
                    original.source &&
                    original.source !== file &&
                    requestShortener) {
                    ({ source } = original);
                    warningMessage = `${warningMessage.replace(warningRegex, '')}`;
                    locationMessage = `[${requestShortener.shorten(original.source)}:${original.line},${original.column}]`;
                }
            }
        }
        if (warningsFilter && !warningsFilter(warning, source)) {
            return null;
        }
        return `Terser Plugin: ${warningMessage}${locationMessage}`;
    }
    apply(compiler) {
        const optimizeFn = (compilation, chunks, callback) => {
            const taskRunner = new TaskRunner_1.default(this.cpus);
            const processedAssets = new WeakSet();
            const tasks = [];
            Array.from(chunks)
                .reduce((acc, chunk) => acc.concat(chunk.files || []), [])
                .concat(compilation.additionalChunkAssets || [])
                .filter((file) => JS_REGEX.test(file))
                .forEach((file) => {
                let inputSourceMap;
                const asset = compilation.assets[file];
                if (processedAssets.has(asset)) {
                    return;
                }
                try {
                    let input;
                    if (this.options.sourceMap && asset.sourceAndMap) {
                        const { source, map } = asset.sourceAndMap();
                        input = source;
                        if (TerserPlugin.isSourceMap(map)) {
                            inputSourceMap = map;
                        }
                        else {
                            inputSourceMap = map;
                            compilation.warnings.push(new Error(`${file} contains invalid source map`));
                        }
                    }
                    else {
                        input = asset.source();
                        inputSourceMap = null;
                    }
                    const task = {
                        file,
                        input,
                        inputSourceMap,
                        terserOptions: this.options.terserOptions
                    };
                    if (this.options.cache) {
                        task.cacheKeys = {
                            terser: '3.16.1',
                            // eslint-disable-next-line global-require
                            'next-minifier': '1.2.2',
                            'next-minifier-options': this.options,
                            hash: crypto_1.default
                                .createHash('md4')
                                .update(input)
                                .digest('hex'),
                        };
                    }
                    tasks.push(task);
                }
                catch (error) {
                    compilation.errors.push(TerserPlugin.buildError(error, file, TerserPlugin.buildSourceMap(inputSourceMap), new RequestShortener_1.default(compiler.context)));
                }
            });
            taskRunner.run(tasks, (tasksError, results) => {
                if (tasksError) {
                    compilation.errors.push(tasksError);
                    return;
                }
                results.forEach((data, index) => {
                    const { file, input, inputSourceMap } = tasks[index];
                    const { error, map, code, warnings } = data;
                    let sourceMap = null;
                    if (error || (warnings && warnings.length > 0)) {
                        sourceMap = TerserPlugin.buildSourceMap(inputSourceMap);
                    }
                    // Handling results
                    // Error case: add errors, and go to next file
                    if (error) {
                        compilation.errors.push(TerserPlugin.buildError(error, file, sourceMap, new RequestShortener_1.default(compiler.context)));
                        return;
                    }
                    let outputSource;
                    if (map) {
                        outputSource = new webpack_sources_1.SourceMapSource(code, file, JSON.parse(map), input, inputSourceMap);
                    }
                    else {
                        outputSource = new webpack_sources_1.RawSource(code);
                    }
                    // Updating assets
                    processedAssets.add((compilation.assets[file] = outputSource));
                    // Handling warnings
                    if (warnings && warnings.length > 0) {
                        warnings.forEach((warning) => {
                            const builtWarning = TerserPlugin.buildWarning(warning, file, sourceMap, new RequestShortener_1.default(compiler.context), this.options.warningsFilter);
                            if (builtWarning) {
                                compilation.warnings.push(builtWarning);
                            }
                        });
                    }
                });
                taskRunner.exit();
                callback();
            });
        };
        const plugin = { name: this.constructor.name };
        compiler.hooks.compilation.tap(plugin, (compilation) => {
            if (this.options.sourceMap) {
                compilation.hooks.buildModule.tap(plugin, (moduleArg) => {
                    // to get detailed location info about errors
                    moduleArg.useSourceMap = true;
                });
            }
            const { mainTemplate, chunkTemplate } = compilation;
            // Regenerate `contenthash` for minified assets
            for (const template of [mainTemplate, chunkTemplate]) {
                template.hooks.hashForChunk.tap(plugin, (hash) => {
                    // Terser version
                    // Has to be updated when options change too
                    hash.update('3.16.1');
                    return hash;
                });
            }
            compilation.hooks.optimizeChunkAssets.tapAsync(plugin, optimizeFn.bind(this, compilation));
        });
    }
}
exports.TerserPlugin = TerserPlugin;
