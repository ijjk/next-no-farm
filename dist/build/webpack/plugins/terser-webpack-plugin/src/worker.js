"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const minify_1 = __importDefault(require("./minify"));
const send = msg => {
    if (!process.connected)
        return console.log('process not connected, not sending');
    process.send(msg);
};
process.addListener('message', msg => {
    if (msg.type === 'run') {
        try {
            // 'use strict' => this === undefined (Clean Scope)
            // Safer for possible security issues, albeit not critical at all here
            // eslint-disable-next-line no-new-func, no-param-reassign
            const options = new Function('exports', 'require', 'module', '__filename', '__dirname', `'use strict'\nreturn ${msg.options}`)(exports, require, module, __filename, __dirname);
            const result = minify_1.default(options);
            send({ type: 'result', result });
        }
        catch (error) {
            console.error(error);
            send({ type: 'result', result: { error: error.message } });
        }
    }
});
send({ type: 'ready' });
// keep process alive
setInterval(() => { }, 30 * 1000);
