const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function test() {
    console.log('Testing specific email risk check...');
    try {
        const data = JSON.stringify({
            entity: '241cb016@srcw.ac.in'
        });
        const res = await post('http://localhost:5000/api/check-risk', data);
        console.log('✅ Risk check result:', res.status, res.body);
        const body = JSON.parse(res.body);
        if (body.data.score === 90) {
            console.log('🎯 Success! Score is exactly 90.');
        } else {
            console.log('❌ Failure! Score is', body.data.score);
        }
    } catch (err) {
        console.error('❌ Risk check failed:', err.message);
    }
}

test();
