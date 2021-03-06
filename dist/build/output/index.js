"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const unistore_1 = __importDefault(require("next/dist/compiled/unistore"));
const store_1 = require("./store");
const format_webpack_messages_1 = __importDefault(require("../../client/dev-error-overlay/format-webpack-messages"));
function startedDevelopmentServer(appUrl) {
    store_1.store.setState({ appUrl });
}
exports.startedDevelopmentServer = startedDevelopmentServer;
let previousClient = null;
let previousServer = null;
var WebpackStatusPhase;
(function (WebpackStatusPhase) {
    WebpackStatusPhase[WebpackStatusPhase["COMPILING"] = 1] = "COMPILING";
    WebpackStatusPhase[WebpackStatusPhase["COMPILED_WITH_ERRORS"] = 2] = "COMPILED_WITH_ERRORS";
    WebpackStatusPhase[WebpackStatusPhase["COMPILED_WITH_WARNINGS"] = 3] = "COMPILED_WITH_WARNINGS";
    WebpackStatusPhase[WebpackStatusPhase["COMPILED"] = 4] = "COMPILED";
})(WebpackStatusPhase || (WebpackStatusPhase = {}));
function getWebpackStatusPhase(status) {
    if (status.loading) {
        return WebpackStatusPhase.COMPILING;
    }
    if (status.errors) {
        return WebpackStatusPhase.COMPILED_WITH_ERRORS;
    }
    if (status.warnings) {
        return WebpackStatusPhase.COMPILED_WITH_WARNINGS;
    }
    return WebpackStatusPhase.COMPILED;
}
const webpackStore = unistore_1.default();
webpackStore.subscribe(state => {
    const { client, server } = state;
    const [{ status }] = [
        { status: client, phase: getWebpackStatusPhase(client) },
        { status: server, phase: getWebpackStatusPhase(server) },
    ].sort((a, b) => a.phase.valueOf() - b.phase.valueOf());
    const { bootstrap: bootstrapping, appUrl } = store_1.store.getState();
    if (bootstrapping && status.loading) {
        return;
    }
    let nextStoreState = Object.assign({ bootstrap: false, appUrl: appUrl }, status);
    store_1.store.setState(nextStoreState, true);
});
function watchCompiler(client, server) {
    if (previousClient === client && previousServer === server) {
        return;
    }
    webpackStore.setState({
        client: { loading: true },
        server: { loading: true },
    });
    function tapCompiler(key, compiler, onEvent) {
        compiler.hooks.invalid.tap(`NextJsInvalid-${key}`, () => {
            onEvent({ loading: true });
        });
        compiler.hooks.done.tap(`NextJsDone-${key}`, (stats) => {
            const { errors, warnings } = format_webpack_messages_1.default(stats.toJson({ all: false, warnings: true, errors: true }));
            onEvent({
                loading: false,
                errors: errors && errors.length ? errors : null,
                warnings: warnings && warnings.length ? warnings : null,
            });
        });
    }
    tapCompiler('client', client, status => webpackStore.setState({ client: status }));
    tapCompiler('server', server, status => webpackStore.setState({ server: status }));
    previousClient = client;
    previousServer = server;
}
exports.watchCompiler = watchCompiler;
