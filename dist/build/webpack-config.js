"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const webpack_1 = __importDefault(require("webpack"));
const resolve_1 = __importDefault(require("resolve"));
const nextjs_ssr_import_1 = __importDefault(require("./webpack/plugins/nextjs-ssr-import"));
const nextjs_ssr_module_cache_1 = __importDefault(require("./webpack/plugins/nextjs-ssr-module-cache"));
const pages_manifest_plugin_1 = __importDefault(require("./webpack/plugins/pages-manifest-plugin"));
const build_manifest_plugin_1 = __importDefault(require("./webpack/plugins/build-manifest-plugin"));
const chunk_names_plugin_1 = __importDefault(require("./webpack/plugins/chunk-names-plugin"));
const react_loadable_plugin_1 = require("./webpack/plugins/react-loadable-plugin");
const constants_1 = require("next-server/constants");
const constants_2 = require("../lib/constants");
const index_1 = require("./webpack/plugins/terser-webpack-plugin/src/index");
const serverless_plugin_1 = require("./webpack/plugins/serverless-plugin");
function getBaseWebpackConfig(dir, { dev = false, isServer = false, buildId, config, target = 'server', entrypoints }) {
    const defaultLoaders = {
        babel: {
            loader: 'next-babel-loader',
            options: { dev, isServer, cwd: dir }
        },
        // Backwards compat
        hotSelfAccept: {
            loader: 'noop-loader'
        }
    };
    // Support for NODE_PATH
    const nodePathList = (process.env.NODE_PATH || '')
        .split(process.platform === 'win32' ? ';' : ':')
        .filter((p) => !!p);
    const distDir = path_1.default.join(dir, config.distDir);
    const outputDir = target === 'serverless' ? 'serverless' : constants_1.SERVER_DIRECTORY;
    const outputPath = path_1.default.join(distDir, isServer ? outputDir : '');
    const totalPages = Object.keys(entrypoints).length;
    const clientEntries = !isServer ? {
        // Backwards compatibility
        'main.js': [],
        [constants_1.CLIENT_STATIC_FILES_RUNTIME_MAIN]: [
            path_1.default.join(constants_2.NEXT_PROJECT_ROOT_DIST_CLIENT, (dev ? `next-dev` : 'next'))
        ].filter(Boolean)
    } : undefined;
    const resolveConfig = {
        // Disable .mjs for node_modules bundling
        extensions: isServer ? ['.wasm', '.js', '.mjs', '.jsx', '.json'] : ['.wasm', '.mjs', '.js', '.jsx', '.json'],
        modules: [
            'node_modules',
            ...nodePathList // Support for NODE_PATH environment variable
        ],
        alias: {
            next: constants_2.NEXT_PROJECT_ROOT,
            [constants_2.PAGES_DIR_ALIAS]: path_1.default.join(dir, 'pages'),
            [constants_2.DOT_NEXT_ALIAS]: distDir
        },
        mainFields: isServer ? ['main', 'module'] : ['browser', 'module', 'main']
    };
    const webpackMode = dev ? 'development' : 'production';
    const terserPluginConfig = {
        parallel: true,
        sourceMap: false,
        cache: true,
        cpus: config.experimental.cpus,
    };
    let webpackConfig = {
        mode: webpackMode,
        devtool: dev ? 'cheap-module-source-map' : false,
        name: isServer ? 'server' : 'client',
        target: isServer ? 'node' : 'web',
        externals: isServer && target !== 'serverless' ? [
            (context, request, callback) => {
                const notExternalModules = [
                    'next/app', 'next/document', 'next/link', 'next/router', 'next/error',
                    'string-hash', 'hoist-non-react-statics', 'htmlescape', 'next/dynamic',
                    'next/constants', 'next/config', 'next/head'
                ];
                if (notExternalModules.indexOf(request) !== -1) {
                    return callback();
                }
                resolve_1.default(request, { basedir: dir, preserveSymlinks: true }, (err, res) => {
                    if (err) {
                        return callback();
                    }
                    if (!res) {
                        return callback();
                    }
                    // Default pages have to be transpiled
                    if (res.match(/next[/\\]dist[/\\]/) || res.match(/node_modules[/\\]@babel[/\\]runtime[/\\]/) || res.match(/node_modules[/\\]@babel[/\\]runtime-corejs2[/\\]/)) {
                        return callback();
                    }
                    // Webpack itself has to be compiled because it doesn't always use module relative paths
                    if (res.match(/node_modules[/\\]webpack/) || res.match(/node_modules[/\\]css-loader/)) {
                        return callback();
                    }
                    // styled-jsx has to be transpiled
                    if (res.match(/node_modules[/\\]styled-jsx/)) {
                        return callback();
                    }
                    if (res.match(/node_modules[/\\].*\.js$/)) {
                        return callback(undefined, `commonjs ${request}`);
                    }
                    callback();
                });
            }
        ] : [
        // When the serverless target is used all node_modules will be compiled into the output bundles
        // So that the serverless bundles have 0 runtime dependencies
        ],
        optimization: isServer ? {
            splitChunks: false,
            minimize: target === 'serverless',
            minimizer: target === 'serverless' ? [
                new index_1.TerserPlugin(Object.assign({}, terserPluginConfig, { terserOptions: {
                        compress: false,
                        mangle: false,
                        module: false,
                        keep_classnames: true,
                        keep_fnames: true
                    } }))
            ] : undefined
        } : {
            runtimeChunk: {
                name: constants_1.CLIENT_STATIC_FILES_RUNTIME_WEBPACK
            },
            splitChunks: dev ? {
                cacheGroups: {
                    default: false,
                    vendors: false
                }
            } : {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    commons: {
                        name: 'commons',
                        chunks: 'all',
                        minChunks: totalPages > 2 ? totalPages * 0.5 : 2
                    },
                    react: {
                        name: 'commons',
                        chunks: 'all',
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/
                    }
                }
            },
            minimize: !dev,
            minimizer: !dev ? [
                new index_1.TerserPlugin(Object.assign({}, terserPluginConfig, { terserOptions: {
                        safari10: true
                    } }))
            ] : undefined,
        },
        recordsPath: path_1.default.join(outputPath, 'records.json'),
        context: dir,
        // Kept as function to be backwards compatible
        entry: async () => {
            return Object.assign({}, clientEntries ? clientEntries : {}, entrypoints);
        },
        output: {
            path: outputPath,
            filename: ({ chunk }) => {
                // Use `[name]-[contenthash].js` in production
                if (!dev && (chunk.name === constants_1.CLIENT_STATIC_FILES_RUNTIME_MAIN || chunk.name === constants_1.CLIENT_STATIC_FILES_RUNTIME_WEBPACK)) {
                    return chunk.name.replace(/\.js$/, '-[contenthash].js');
                }
                return '[name]';
            },
            libraryTarget: isServer ? 'commonjs2' : 'jsonp',
            hotUpdateChunkFilename: 'static/webpack/[id].[hash].hot-update.js',
            hotUpdateMainFilename: 'static/webpack/[hash].hot-update.json',
            // This saves chunks with the name given via `import()`
            chunkFilename: isServer ? `${dev ? '[name]' : '[name].[contenthash]'}.js` : `static/chunks/${dev ? '[name]' : '[name].[contenthash]'}.js`,
            strictModuleExceptionHandling: true,
            crossOriginLoading: config.crossOrigin,
            futureEmitAssets: !dev,
            webassemblyModuleFilename: 'static/wasm/[modulehash].wasm'
        },
        performance: { hints: false },
        resolve: resolveConfig,
        resolveLoader: {
            modules: [
                constants_2.NEXT_PROJECT_ROOT_NODE_MODULES,
                'node_modules',
                path_1.default.join(__dirname, 'webpack', 'loaders'),
                ...nodePathList // Support for NODE_PATH environment variable
            ]
        },
        module: {
            rules: [
                {
                    test: /\.(js|mjs|jsx)$/,
                    include: [dir, /next-server[\\/]dist[\\/]lib/],
                    exclude: (path) => {
                        if (/next-server[\\/]dist[\\/]lib/.test(path)) {
                            return false;
                        }
                        return /node_modules/.test(path);
                    },
                    use: defaultLoaders.babel
                }
            ].filter(Boolean)
        },
        plugins: [
            // This plugin makes sure `output.filename` is used for entry chunks
            new chunk_names_plugin_1.default(),
            new webpack_1.default.DefinePlugin(Object.assign({}, (Object.keys(config.env).reduce((acc, key) => {
                if (/^(?:NODE_.+)|(?:__.+)$/i.test(key)) {
                    throw new Error(`The key "${key}" under "env" in next.config.js is not allowed. https://err.sh/zeit/next.js/env-key-not-allowed`);
                }
                return Object.assign({}, acc, { [`process.env.${key}`]: JSON.stringify(config.env[key]) });
            }, {})), { 'process.crossOrigin': JSON.stringify(config.crossOrigin), 'process.browser': JSON.stringify(!isServer) }, (dev && !isServer ? {
                'process.env.__NEXT_DIST_DIR': JSON.stringify(distDir)
            } : {}))),
            !isServer && new react_loadable_plugin_1.ReactLoadablePlugin({
                filename: constants_1.REACT_LOADABLE_MANIFEST
            }),
            ...(dev ? (() => {
                // Even though require.cache is server only we have to clear assets from both compilations
                // This is because the client compilation generates the build manifest that's used on the server side
                const { NextJsRequireCacheHotReloader } = require('./webpack/plugins/nextjs-require-cache-hot-reloader');
                const { UnlinkRemovedPagesPlugin } = require('./webpack/plugins/unlink-removed-pages-plugin');
                const devPlugins = [
                    new UnlinkRemovedPagesPlugin(),
                    new webpack_1.default.NoEmitOnErrorsPlugin(),
                    new NextJsRequireCacheHotReloader(),
                ];
                if (!isServer) {
                    const AutoDllPlugin = require('autodll-webpack-plugin');
                    devPlugins.push(new AutoDllPlugin({
                        filename: '[name]_[hash].js',
                        path: './static/development/dll',
                        context: dir,
                        entry: {
                            dll: [
                                'react',
                                'react-dom'
                            ]
                        },
                        config: {
                            mode: webpackMode,
                            resolve: resolveConfig
                        }
                    }));
                    devPlugins.push(new webpack_1.default.HotModuleReplacementPlugin());
                }
                return devPlugins;
            })() : []),
            !dev && new webpack_1.default.HashedModuleIdsPlugin(),
            !dev && new webpack_1.default.IgnorePlugin({
                checkResource: (resource) => {
                    return /react-is/.test(resource);
                },
                checkContext: (context) => {
                    return /next-server[\\/]dist[\\/]/.test(context) || /next[\\/]dist[\\/]/.test(context);
                }
            }),
            target === 'serverless' && isServer && new serverless_plugin_1.ServerlessPlugin(),
            target !== 'serverless' && isServer && new pages_manifest_plugin_1.default(),
            target !== 'serverless' && isServer && new nextjs_ssr_module_cache_1.default({ outputPath }),
            isServer && new nextjs_ssr_import_1.default(),
            !isServer && new build_manifest_plugin_1.default(),
        ].filter(Boolean)
    };
    if (typeof config.webpack === 'function') {
        webpackConfig = config.webpack(webpackConfig, { dir, dev, isServer, buildId, config, defaultLoaders, totalPages, webpack: webpack_1.default });
        // @ts-ignore: Property 'then' does not exist on type 'Configuration'
        if (typeof webpackConfig.then === 'function') {
            console.warn('> Promise returned in next config. https://err.sh/zeit/next.js/promise-in-next-config.md');
        }
    }
    // Backwards compat for `main.js` entry key
    const originalEntry = webpackConfig.entry;
    if (typeof originalEntry !== 'undefined') {
        webpackConfig.entry = async () => {
            const entry = typeof originalEntry === 'function' ? await originalEntry() : originalEntry;
            if (entry && typeof entry !== 'string' && !Array.isArray(entry)) {
                // Server compilation doesn't have main.js
                if (typeof entry['main.js'] !== 'undefined') {
                    entry[constants_1.CLIENT_STATIC_FILES_RUNTIME_MAIN] = [
                        ...entry['main.js'],
                        ...entry[constants_1.CLIENT_STATIC_FILES_RUNTIME_MAIN]
                    ];
                    delete entry['main.js'];
                }
            }
            return entry;
        };
    }
    return webpackConfig;
}
exports.default = getBaseWebpackConfig;
