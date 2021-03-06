"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const nanoid_1 = __importDefault(require("nanoid"));
const next_config_1 = __importDefault(require("next-server/next-config"));
const constants_1 = require("next-server/constants");
const webpack_config_1 = __importDefault(require("./webpack-config"));
const generate_build_id_1 = require("./generate-build-id");
const write_build_id_1 = require("./write-build-id");
const is_writeable_1 = require("./is-writeable");
const compiler_1 = require("./compiler");
const recursive_readdir_1 = require("../lib/recursive-readdir");
const entries_1 = require("./entries");
const format_webpack_messages_1 = __importDefault(require("../client/dev-error-overlay/format-webpack-messages"));
const chalk_1 = __importDefault(require("chalk"));
function collectPages(directory, pageExtensions) {
    return recursive_readdir_1.recursiveReadDir(directory, new RegExp(`\\.(?:${pageExtensions.join('|')})$`));
}
function printTreeView(list) {
    list
        .sort((a, b) => (a > b ? 1 : -1))
        .forEach((item, i) => {
        const corner = i === 0
            ? list.length === 1
                ? '─'
                : '┌'
            : i === list.length - 1
                ? '└'
                : '├';
        console.log(` \x1b[90m${corner}\x1b[39m ${item}`);
    });
    console.log();
}
async function build(dir, conf = null) {
    if (!(await is_writeable_1.isWriteable(dir))) {
        throw new Error('> Build directory is not writeable. https://err.sh/zeit/next.js/build-dir-not-writeable');
    }
    console.log('Creating an optimized production build ...');
    console.log();
    const config = next_config_1.default(constants_1.PHASE_PRODUCTION_BUILD, dir, conf);
    const buildId = await generate_build_id_1.generateBuildId(config.generateBuildId, nanoid_1.default);
    const distDir = path_1.join(dir, config.distDir);
    const pagesDir = path_1.join(dir, 'pages');
    const pagePaths = await collectPages(pagesDir, config.pageExtensions);
    const pages = entries_1.createPagesMapping(pagePaths, config.pageExtensions);
    const entrypoints = entries_1.createEntrypoints(pages, config.target, buildId, config);
    const configs = await Promise.all([
        webpack_config_1.default(dir, {
            buildId,
            isServer: false,
            config,
            target: config.target,
            entrypoints: entrypoints.client,
        }),
        webpack_config_1.default(dir, {
            buildId,
            isServer: true,
            config,
            target: config.target,
            entrypoints: entrypoints.server,
        }),
    ]);
    let result = { warnings: [], errors: [] };
    if (config.target === 'serverless') {
        if (config.publicRuntimeConfig)
            throw new Error('Cannot use publicRuntimeConfig with target=serverless https://err.sh/zeit/next.js/serverless-publicRuntimeConfig');
        const clientResult = await compiler_1.runCompiler(configs[0]);
        // Fail build if clientResult contains errors
        if (clientResult.errors.length > 0) {
            result = {
                warnings: [...clientResult.warnings],
                errors: [...clientResult.errors],
            };
        }
        else {
            const serverResult = await compiler_1.runCompiler(configs[1]);
            result = {
                warnings: [...clientResult.warnings, ...serverResult.warnings],
                errors: [...clientResult.errors, ...serverResult.errors],
            };
        }
    }
    else {
        result = await compiler_1.runCompiler(configs);
    }
    result = format_webpack_messages_1.default(result);
    if (result.errors.length > 0) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (result.errors.length > 1) {
            result.errors.length = 1;
        }
        console.error(chalk_1.default.red('Failed to compile.\n'));
        console.error(result.errors.join('\n\n'));
        console.error();
        throw new Error('> Build failed because of webpack errors');
    }
    else if (result.warnings.length > 0) {
        console.warn(chalk_1.default.yellow('Compiled with warnings.\n'));
        console.warn(result.warnings.join('\n\n'));
        console.warn();
    }
    else {
        console.log(chalk_1.default.green('Compiled successfully.\n'));
    }
    printTreeView(Object.keys(pages));
    await write_build_id_1.writeBuildId(distDir, buildId);
}
exports.default = build;
