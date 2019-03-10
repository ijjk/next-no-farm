"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = __importDefault(require("os"));
const async_sema_1 = __importDefault(require("async-sema"));
const cacache_1 = __importDefault(require("cacache"));
const minify_1 = __importDefault(require("./minify"));
const child_process_1 = require("child_process");
const find_cache_dir_1 = __importDefault(require("find-cache-dir"));
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const workerPath = require.resolve('./worker');
class TaskRunner {
    constructor() {
        this.cacheDir = find_cache_dir_1.default({ name: 'next-minifier' });
        // In some cases cpus() returns undefined
        // https://github.com/nodejs/node/issues/19022
        const cpus = os_1.default.cpus() || { length: 1 };
        this.concurrency = cpus.length - 1 || 1;
        this.workers = [];
        this.sema = new async_sema_1.default(this.concurrency);
    }
    async createWorker() {
        const newWorker = child_process_1.fork(workerPath, [], { stdio: 'inherit' });
        newWorker.on('error', err => {
            console.error('Error creating terser worker', err);
        });
        await new Promise(resolve => {
            const waitReady = msg => {
                if (msg.type === 'ready') {
                    newWorker.removeListener('message', waitReady);
                    resolve();
                }
            };
            newWorker.on('message', waitReady);
        });
        this.workers.push(newWorker);
    }
    async runTask(options) {
        if (this.concurrency > 1) {
            // Create worker since one isn't available
            if (!this.workers.length)
                await this.createWorker();
            let worker = this.workers.shift();
            if (!worker || !worker.connected || worker.killed) {
                await this.createWorker();
                worker = this.workers.shift();
            }
            const result = await new Promise(resolve => {
                const cleanup = () => {
                    worker.removeListener('message', waitResult);
                    worker.removeListener('close', handleClose);
                    this.workers.push(worker);
                };
                const handleClose = (code, signal) => {
                    cleanup();
                    resolve({ error: 'Terser worker exited unexpectedly' });
                };
                const waitResult = msg => {
                    if (msg.type === 'result') {
                        cleanup();
                        resolve(msg.result);
                    }
                };
                worker.on('message', waitResult);
                worker.on('close', handleClose);
                worker.send({ type: 'run', options: serialize_javascript_1.default(options) });
            });
            return result;
        }
        else {
            // Just run in current process
            return minify_1.default(options);
        }
    }
    run(tasks, callback) {
        /* istanbul ignore if */
        if (!tasks.length) {
            callback(null, []);
            return;
        }
        let toRun = tasks.length;
        const results = [];
        const step = (index, data) => {
            toRun -= 1;
            results[index] = data;
            if (!toRun) {
                callback(null, results);
            }
        };
        tasks.forEach((task, index) => {
            const enqueue = async () => {
                await this.sema.acquire();
                this.runTask(task).then(result => {
                    const done = () => {
                        this.sema.release();
                        step(index, result);
                    };
                    if (this.cacheDir && !result.error) {
                        cacache_1.default
                            .put(this.cacheDir, serialize_javascript_1.default(task.cacheKeys), JSON.stringify(result))
                            .then(done, done);
                    }
                    else {
                        done();
                    }
                });
            };
            if (this.cacheDir) {
                cacache_1.default
                    .get(this.cacheDir, serialize_javascript_1.default(task.cacheKeys))
                    .then(({ data }) => step(index, JSON.parse(data)), enqueue);
            }
            else {
                enqueue();
            }
        });
    }
    exit() {
        this.workers.forEach(worker => worker.kill());
        this.sema.drain();
    }
}
exports.default = TaskRunner;
