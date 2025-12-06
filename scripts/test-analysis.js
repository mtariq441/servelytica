const http = require('http');

const VIDEO_ID = 'test-video-id'; // Replace with a real video ID after upload test passes
const VIDEO_PATH = '/uploads/test-large-video.mp4'; // Path to the uploaded video

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
                    }
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('Triggering analysis...');
        const result = await request('POST', `/api/videos/${VIDEO_ID}/analyze`, {
            videoPath: VIDEO_PATH,
            sport: 'table-tennis'
        });
        console.log('Analysis result:', JSON.stringify(result, null, 2));
        console.log('Test PASSED!');
    } catch (error) {
        console.error('Test FAILED:', error);
    }
}

runTest();
