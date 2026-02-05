const http = require('http');

function test() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/health',
        method: 'GET',
        headers: {
            'Origin': 'http://localhost:3000'
        }
    };

    const req = http.request(options, (res) => {
        console.log('Headers:', res.headers);
        res.on('data', () => { });
    });
    req.end();
}

test();
