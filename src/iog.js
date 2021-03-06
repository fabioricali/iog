const mkdirp = require('mkdirp');
const dateFormat = require('dateformat');
const fs = require('fs');
const isError = require('is-error');
const stringify = require('stringme');
const path = require('path');
const findRemoveSync = require('find-remove');

/**
 * @typedef SEPARATOR
 * @type {string}
 * @ignore
 */
const SEPARATOR = '\n\n---------------------------------------------------------------------------------------\n\n';
const DAY_SECONDS = 86400;

/**
 * @class
 */
class Iog {

    /**
     * Iog instance
     * @param {string} contextName es. your-module-name
     * @param {object} [opts] options
     * @param {string} [opts.path=] log path
     * @param {string} [opts.logExt=.log] log file extension
     * @param {string} [opts.separator=---] log separator
     * @param {boolean} [opts.console=true] show log in console
     * @param {boolean} [opts.rotation=false] actives rotation log by date
     * @param {number} [opts.deleteAge=0] delete old log in days, works only if `rotation` is true
     * @param {boolean} [opts.slim=false] slim log
     * @param {function} [opts.onLog=null] a callback function fired when a log is written
     */
    constructor(contextName, opts = {}) {

        if (typeof contextName === 'undefined')
            throw new TypeError('context name is required');

        this.contextName = contextName;
        this.opts = Object.assign({
            path: 'logs',
            logExt: '.log',
            separator: SEPARATOR,
            console: true,
            rotation: false,
            deleteAge: 0,
            slim: false,
            onLog: null
        }, opts);

        this._paused = false;

        if (this.opts.rotation) {
            this.opts.path = path.resolve(this.opts.path, this.contextName);
            if (this.opts.deleteAge) {
                this._clear();
            }
        }

        if (this.opts.path) {
            mkdirp.sync(this.opts.path);
        }

    }

    /**
     * Delete old log file, checks every day
     * @ignore
     * @private
     */
    _clear() {
        findRemoveSync(this.opts.path, {
            age: {seconds: this.opts.deleteAge * DAY_SECONDS},
            extensions: [this.opts.logExt]
        });

        setTimeout(()=>{
            this._clear()
        }, DAY_SECONDS);
    }

    /**
     * Get right file path
     * @ignore
     * @private
     * @returns {string}
     */
    _filePath() {
        const fileName = this.opts.rotation
            ? dateFormat(new Date(), 'yyyy-mm-dd')
            : this.contextName;

        return `${this.opts.path}/${fileName}${this.opts.logExt}`
    }

    /**
     * Pause log writing
     * @returns {Iog}
     */
    pause() {
        this._paused = true;
        return this;
    }

    /**
     * Resume log writing
     * @returns {Iog}
     */
    resume() {
        this._paused = false;
        return this;
    }

    /**
     * Write log
     * @param {string|object} msg message log, you can pass also an object with custom params, in this case remember that Error must be get in this way error.message
     * @param {string} [type=log] any type that you want like: log, info, error, trace, warn also custom
     * @param {boolean} [show=true] disable console for single write
     */
    write(msg = '', type = 'log', show = true) {

        if (this._paused) return;
        let body = '';
        const now = new Date();
        let date = dateFormat(now, 'yyyy-mm-dd HH:MM:ss:l');

        if (this.opts.slim) {
            body = {
              CONTEXT: this.contextName,
              DATE: date,
              TYPE: type,
              BODY: ''
            };
            body.BODY = msg;
            body = stringify(body)+'\n';
        } else {
            if (typeof msg === 'object' && !isError(msg))
                msg = stringify(msg, {replace: null, space: 2});
            body = `CONTEXT: ${this.contextName}\nDATE: ${date}\nTYPE: ${type}\nBODY:\n\n${msg}${this.opts.separator}`;
        }

        if (this.opts.console && show) {
            console[type in console ? type : 'log'](body);
        }

        fs.appendFile(this._filePath(), body, (err) => {
            if (err) throw err;

            if (typeof this.opts.onLog === 'function') {
                this.opts.onLog(body, type);
            }
        });
    }

    /**
     * A wrapper of write that set type to "error"
     * @param {string|object} msg message log, you can pass also an object with custom params, in this case remember that Error must be get in this way error.message
     */
    error(msg = '') {
        this.write(msg, 'error');
    }

    /**
     * A wrapper of write that set type to "warn"
     * @param {string|object} msg message log, you can pass also an object with custom params, in this case remember that Error must be get in this way error.message
     */
    warn(msg = '') {
        this.write(msg, 'warn');
    }

    /**
     * A wrapper of write that set type to "info"
     * @param {string|object} msg message log, you can pass also an object with custom params, in this case remember that Error must be get in this way error.message
     */
    info(msg = '') {
        this.write(msg, 'info');
    }

    /**
     * A wrapper of write that set type to "trace"
     * @param {string|object} msg message log, you can pass also an object with custom params, in this case remember that Error must be get in this way error.message
     */
    trace(msg = '') {
        this.write(msg, 'trace');
    }
}

module.exports = Iog;