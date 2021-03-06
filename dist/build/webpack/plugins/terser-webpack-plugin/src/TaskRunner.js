"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cacache_1 = __importDefault(require("cacache"));
const find_cache_dir_1 = __importDefault(require("find-cache-dir"));
const worker_farm_1 = __importDefault(require("worker-farm"));
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const minify_1 = __importDefault(require("./minify"));
const worker = require.resolve('./worker');
class TaskRunner {
    constructor(cpus) {
        this.cacheDir = find_cache_dir_1.default({ name: 'next-minifier' });
        // In some cases cpus() returns undefined
        // https://github.com/nodejs/node/issues/19022
        this.maxConcurrentWorkers = cpus;
    }
    run(tasks, callback) {
        /* istanbul ignore if */
        if (!tasks.length) {
            callback(null, []);
            return;
        }
        if (this.maxConcurrentWorkers > 1) {
            const workerOptions = process.platform === 'win32'
                ? {
                    maxConcurrentWorkers: this.maxConcurrentWorkers,
                    maxConcurrentCallsPerWorker: 1,
                }
                : { maxConcurrentWorkers: this.maxConcurrentWorkers };
            this.workers = worker_farm_1.default(workerOptions, worker);
            this.boundWorkers = (options, cb) => {
                try {
                    this.workers(serialize_javascript_1.default(options), cb);
                }
                catch (error) {
                    // worker-farm can fail with ENOMEM or something else
                    cb(error);
                }
            };
        }
        else {
            this.boundWorkers = (options, cb) => {
                try {
                    cb(null, minify_1.default(options));
                }
                catch (error) {
                    cb(error);
                }
            };
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
            const enqueue = () => {
                this.boundWorkers(task, (error, data) => {
                    const result = error ? { error } : data;
                    const done = () => step(index, result);
                    if (this.cacheDir && !result.error) {
                        cacache_1.default
                            .put(this.cacheDir, serialize_javascript_1.default(task.cacheKeys), JSON.stringify(data))
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
        if (this.workers) {
            worker_farm_1.default.end(this.workers);
        }
    }
}
exports.default = TaskRunner;
