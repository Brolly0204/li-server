const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const mime = require('mime');
const zlib = require('zlib');
const handlebars = require('handlebars');
const {promisify, inspect, inherits} = require('util');
const chalk = require('chalk'); // 颜色插件
const debug = require('debug')('static:app');
const config = require('./config');

let stat = promisify(fs.stat);
let readdir = promisify(fs.readdir);

function template() {
    let tmpl = fs.readFileSync(path.resolve(__dirname, 'template', 'list.html'), 'utf8');
    return handlebars.compile(tmpl);
}

function getIpv4(enth = 'en0', ipType = 'IPv4') {
    let ips = os.networkInterfaces()[enth];
    let ipv4 = ips.find(ip => ip.family === ipType);
    return ipv4.address;
}

class Server {
    constructor(argv) {
        this.list = template();
        this.config = Object.assign({}, config, argv);
    }
    start() {
        let server = http.createServer();
        server.on('request', this.request.bind(this));
        server.listen(this.config.port, this.config.host, () => {
            let ipv4 = getIpv4();
            let url = `http://localhost:${this.config.port}`;
            let url2 = `http://${ipv4}:${this.config.port}`;
            console.log(`The server listening to ${chalk.green(url)}`);
            console.log(`The server listening to ${chalk.green(url2)}`);
            debug(`The server listening to ${chalk.green(url)}`);
        })
    }

    async request(req, res) {
        let {pathname} = url.parse(req.url);
        if (pathname === '/favicon.ico') {
            return this.sendError('not found', req, res);
        }
        let filePath = decodeURI(path.join(this.config.root, pathname));
        try {
            let stats = await stat(filePath);
            if (stats.isDirectory()) { // 如果是目录 显示目录下文件列表
                let files = await readdir(filePath);
                files = files.map(file => ({
                    name: file, // 文件名
                    url: path.join(pathname, file) // path: /当前目录/文件名
                }));
                let html = this.list({ // 模板中传入挂载数据template/list.html
                    title: pathname,
                    files
                });
                res.setHeader('Content-Type', 'text/html');
                res.end(html); // 返回文件列表模板
            } else {
                this.sendFile(req, res, filePath, stats);
            }
        } catch(e) {
            debug(inspect(e)); // 将错误信息对象转换为字符串
            this.sendError(e, req, res);
        }
    }
    sendFile(req, res, filePath, stats) {
        if (this.handleCache(req, res, filePath, stats)) return;
        res.setHeader('Content-Type', `${mime.getType(filePath)};charset=utf-8`);
        let encoding = this.getEncoding(req, res);
        let rs = this.getStream(req, res, filePath, stats);
        if (encoding) {
            rs.pipe(encoding).pipe(res);
        } else {
            rs.pipe(res);
        }
    }
    sendError(err, req, res) {
        res.statusCode = 404;
        res.end(`${err.toString()}`);
    }
    getStream(req, res, filePath, stats) {
        let start = 0;
        let end = stats.size - 1;
        let range = req.headers['range'];
        if (range) { // 断点续传
            res.setHeader('Accept-Range', 'bytes');
            res.statusCode = 206;
            let result = range.match(/bytes=(\d*)-(\d*)/);
            if (result) {
                start = isNaN(result[1]) ? start : parseInt(result[1]);
                end = isNaN(result[2]) ? end : parseInt(result[2]) - 1;
            }
        }
        // console.log(start, end);
        return fs.createReadStream(filePath, {
            start,
            end
        })
    }
    handleCache(req, res, filepath, stats) {
        let ifModifiedSince = req.headers['if-modified-since']; 
        let ifNoneMatch = req.headers['if-none-match'];
        // 强制缓存 F5刷新或手动刷新没有效果 打开新窗口输入连接/前进后退  可以看到效果（Status Code:200 OK (from disk cache)） 
        res.setHeader('Cache-Control', 'private,max-age=30');
        res.setHeader('Expires', new Date(Date.now() + 30 * 1000).toGMTString());
        let lastModified = stats.ctime.toGMTString();
        let etag = crypto.createHash('sha1').update(stats.size.toString()).digest('hex');
        // 协商缓存
        res.setHeader('Etag', etag);
        res.setHeader('Last-Modified', lastModified);
        if (ifNoneMatch && ifNoneMatch !== etag) {
            return false;
        }
        if (ifModifiedSince && ifModifiedSince !== lastModified) {
            return false
        }
        
        if (ifNoneMatch || ifModifiedSince) {
            res.writeHead(304);
            res.end();
            return true;
        } else {
            return false;
        }
    }
    getEncoding(req, res){
        let acceptEncoding = req.headers['accept-encoding'];
        if (/\bgzip\b/.test(acceptEncoding)) {
            res.setHeader('Content-Encoding', 'gzip');
            return zlib.createGzip();
        } else if (/\bdeflate\b/.test(acceptEncoding)) {
            res.setHeader('Content-Encoding', 'deflate');
            return zlib.createDeflate();
        } else {
            return null;
        }
    }
}

// let server = new Server();
// server.start();

module.exports = Server;
