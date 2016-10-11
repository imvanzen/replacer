'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const BASE_PATH = '/home/imvanzen/Desktop/replacer/test';
const MAX_DEPTH = 1;

const EXCLUDED_NAMES = [
    '.git',
    '.idea',
    'dist',
    'node_modules',
    'dist',
    'bin',
    'lib'
];

const ALLOWED_EXTENSIONS = ['.js'];

const LOG_TYPES = ['log', 'info', 'error', 'debug'];

console.info('[replacer] Read directory. Path: %s, Max Depth: %s', BASE_PATH, MAX_DEPTH);

const getContent = (base_dir, content) => {
    const dirs = [];
    const files = [];

    _.each(content, (d) => {
        const stats = fs.lstatSync(path.join(base_dir, d));

        if (stats.isDirectory()) {
            dirs.push(d);
        }

        if (stats.isFile()) {
            files.push(d)
        }
    });

    return {
        dirs: dirs,
        files: files
    };
};

const byName = (f) => {
    return _.indexOf(EXCLUDED_NAMES, f) === -1
};

const byExtension = (f) => {
    return _.indexOf(ALLOWED_EXTENSIONS, path.extname(f)) > -1;
};

const replacer = (base_directory, depth) => {
    const content = getContent(base_directory, fs.readdirSync(base_directory));

    const filtered_files = _(content.files)
        .filter(byName)
        .filter(byExtension)
        .value();

    const filtered_dirs = _(content.dirs)
        .filter(byName)
        .value();

    _.each(filtered_files, (f) => {
        const fb = fs.readFileSync(path.join(base_directory, f)).toString();
        const l = fb.length;
        let nfb = fb;

        let i = 0;

        while (i <= l) {

            // Find `console` invocation
            if (fb[i] === 'c' &&
                fb[i+1] === 'o' &&
                fb[i+2] === 'n' &&
                fb[i+3] === 's' &&
                fb[i+4] === 'o' &&
                fb[i+5] === 'l' &&
                fb[i+6] === 'e' &&
                fb[i+7] === '.') {

                i += 8;

                let j = 0;
                let type = "";

                // get type
                while (LOG_TYPES.indexOf(type.toLowerCase()) === -1) {
                    if (fb[i+j] != '(') {
                        type += fb[i+j];
                        j++;
                    } else {
                        break;
                    }
                }

                let start = null;
                let end = null;
                let pc = 0;

                // get log message
                while (start === null || end === null) {
                    if (fb[i+j] === '(') {
                        pc++;
                        start = pc === 1 ? i+j : start;
                    } else if (fb[i+j] === ')') {
                        end = pc === 1 ? i+j+1 : end;
                        pc--;
                    }

                    j++;
                }

                const labelRegEx = /\[(.*?)]+/g;
                let logMsg = fb.slice(start, end);
                let newLogMsg = logMsg;
                let label;

                do {
                    label = labelRegEx.exec(logMsg);
                    if (label) {
                        newLogMsg = newLogMsg.replace(label[0], `[${_.kebabCase(label[1])}]`);
                    }
                } while (label);

                nfb = nfb.replace(logMsg, newLogMsg);
            } else {
                i++;
            }
        }

        fs.writeFileSync(path.join(base_directory, f), nfb);
    });

    // exit if max depth reached
    if (depth === 0) {
        return;
    }

    _.each(filtered_dirs, (d) => {
        replacer(path.join(base_directory, d), depth-1);
    });
};

// Run worker
replacer(BASE_PATH, MAX_DEPTH);
