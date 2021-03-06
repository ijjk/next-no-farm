"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mkdirp_1 = __importDefault(require("mkdirp"));
const util_1 = require("util");
const path_1 = require("path");
const render_1 = require("next-server/dist/server/render");
const fs_1 = require("fs");
const async_sema_1 = __importDefault(require("async-sema"));
const load_components_1 = require("next-server/dist/server/load-components");
const envConfig = require('next-server/config');
const mkdirp = util_1.promisify(mkdirp_1.default);
global.__NEXT_DATA__ = {
    nextExport: true
};
process.on('message', async ({ distDir, buildId, exportPaths, exportPathMap, outDir, renderOpts, serverRuntimeConfig, concurrency }) => {
    const sema = new async_sema_1.default(concurrency, { capacity: exportPaths.length });
    try {
        const work = async (path) => {
            await sema.acquire();
            const { page, query = {} } = exportPathMap[path];
            const req = { url: path };
            const res = {};
            envConfig.setConfig({
                serverRuntimeConfig,
                publicRuntimeConfig: renderOpts.runtimeConfig
            });
            let htmlFilename = `${path}${path_1.sep}index.html`;
            if (path_1.extname(path) !== '') {
                // If the path has an extension, use that as the filename instead
                htmlFilename = path;
            }
            else if (path === '/') {
                // If the path is the root, just use index.html
                htmlFilename = 'index.html';
            }
            const baseDir = path_1.join(outDir, path_1.dirname(htmlFilename));
            const htmlFilepath = path_1.join(outDir, htmlFilename);
            await mkdirp(baseDir);
            const components = await load_components_1.loadComponents(distDir, buildId, page);
            const html = await render_1.renderToHTML(req, res, page, query, Object.assign({}, components, renderOpts));
            await new Promise((resolve, reject) => fs_1.writeFile(htmlFilepath, html, 'utf8', err => (err ? reject(err) : resolve())));
            process.send({ type: 'progress' });
            sema.release();
        };
        await Promise.all(exportPaths.map(work));
        process.send({ type: 'done' });
    }
    catch (err) {
        console.error(err);
        process.send({ type: 'error', payload: err });
    }
});
