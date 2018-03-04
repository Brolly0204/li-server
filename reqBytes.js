const http = require('http');
const fs = require('fs');
const path = require('path');

const options = {
    url: 'localhost',
    port: 9090,
    path: '/public/bytes.txt',
    method: 'GET'
}

let ws = fs.createWriteStream(path.join(__dirname, 'download.txt'));
let start = 0;
let pause = false;

function download() {
    options.headers = {
        Range: `bytes=${start}-${start + 10}`
    }
    console.log(options.headers['Range']);
    start += 10;
    let req = http.get(options, function(res) {
        let result = [];
        res.on('data', function(data) {
            result.push(data);
        });
        res.on('end', function() {
            let r = Buffer.concat(result);
            ws.write(r);
            if (start < 100 && pause === false) {
                setTimeout(function() {
                    download(); 
                }, 1000);
            }
        })
    });
    req.end();
}
download();
