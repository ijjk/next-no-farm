"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const unistore_1 = __importDefault(require("next/dist/compiled/unistore"));
const readline_1 = __importDefault(require("readline"));
const exit_1 = require("./exit");
exports.store = unistore_1.default({ appUrl: null, bootstrap: true });
process.stdout.write('\n'.repeat(process.stdout.rows || 1));
process.stdout.write('\u001b[?25l');
exit_1.onExit(() => {
    process.stdout.write('\u001b[?25h');
});
exports.store.subscribe(state => {
    readline_1.default.cursorTo(process.stdout, 0, 0);
    readline_1.default.clearScreenDown(process.stdout);
    if (state.bootstrap) {
        console.log(chalk_1.default.cyan('Starting the development server ...'));
        if (state.appUrl) {
            console.log();
            console.log(`  > Waiting on ${state.appUrl}`);
        }
        return;
    }
    if (state.loading) {
        console.log('Compiling ...');
        return;
    }
    if (state.errors) {
        console.log(chalk_1.default.red('Failed to compile.'));
        console.log();
        console.log(state.errors[0]);
        return;
    }
    if (state.warnings) {
        console.log(chalk_1.default.yellow('Compiled with warnings.'));
        console.log();
        console.log(state.warnings.join('\n\n'));
        return;
    }
    console.log(chalk_1.default.green('Compiled successfully!'));
    if (state.appUrl) {
        console.log();
        console.log(`  > Ready on ${state.appUrl}`);
    }
    console.log();
    console.log('Note that pages will be compiled when you first load them.');
});
