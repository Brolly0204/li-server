const debug = require('debug')('static:config');
const path = require('path');

const config = {
    host: 'localhost',
    port: '9090',
    root: process.cwd()
}

debug(config);
module.exports = config;