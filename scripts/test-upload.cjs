const fs = require('fs');
const path = require('path');
const http = require('http');

const FILE_SIZE = 100 * 1024 * 1024; // 100MB for testing (can be increased)
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const TEST_FILE_PATH = path.join(__dirname, 'test-large-file.tmp');
const SERVER_URL = 'http://localhost:5000';
const USER_ID = 'test-user-id-' + Date.now();

async function createDummyFile() {
    console.log(`Creating dummy file of size ${FILE_SIZE / (1024 * 1024)}MB...`);
    const writeStream = fs.createWriteStream(TEST_FILE_PATH);
    const chunk = Buffer.alloc(1024 * 1024, 'a'); // 1MB chunk
    const iterations = FILE_SIZE / (1024 * 1024);

    for (let i = 0; i < iterations; i++) {
        if (!writeStream.write(chunk)) {
            await new Promise(resolve => writeStream.once('drain', resolve));
        }
    }
    writeStream.end();
    await new Promise(resolve => writeStream.on('finish', resolve));
    console.log('Dummy file created.');
}

function request(method, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
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
            if (Buffer.isBuffer(body)) {
                req.write(body);
            } else if (typeof body === 'object') {
                req.write(JSON.stringify(body));
            } else {
                req.write(body);
            }
        }
        req.end();
    });
}

async function uploadChunk(uploadId, chunkIndex, buffer) {
    // We need to send FormData-like request or just raw binary if the server supports it.
    // The server implementation in chunkUpload.ts uses multer with field 'chunk'.

    // Construct a multipart/form-data request manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const header = `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="uploadId"\r\n\r\n` +
        `${uploadId}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="chunkIndex"\r\n\r\n` +
        `${chunkIndex}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="chunk"; filename="blob"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`;

    const footer = `\r\n--${boundary}--`;

    const payload = Buffer.concat([
        Buffer.from(header),
        buffer,
        Buffer.from(footer)
    ]);

    await request('POST', '/api/upload/chunk', payload, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length
    });
}

async function runTest() {
    try {
        await createDummyFile();

        console.log('Initializing upload...');
        const initData = await request('POST', '/api/upload/init', {
            userId: USER_ID,
            fileName: 'test-large-video.mp4',
            fileType: 'video/mp4',
            totalSize: FILE_SIZE
        });
        console.log('Upload initialized:', initData);
        const { uploadId } = initData;

        const buffer = fs.readFileSync(TEST_FILE_PATH);
        const totalChunks = Math.ceil(FILE_SIZE / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, FILE_SIZE);
            const chunkBuffer = buffer.slice(start, end);

            console.log(`Uploading chunk ${i + 1}/${totalChunks}...`);
            await uploadChunk(uploadId, i, chunkBuffer);
        }

        console.log('Completing upload...');
        const completeData = await request('POST', '/api/upload/complete', {
            uploadId,
            userId: USER_ID,
            fileName: 'test-large-video.mp4',
            title: 'Test Large Video',
            description: 'Automated test upload',
            focusArea: 'Test'
        });
        console.log('Upload completed:', completeData);

        console.log('Test PASSED!');
    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        if (fs.existsSync(TEST_FILE_PATH)) {
            fs.unlinkSync(TEST_FILE_PATH);
        }
    }
}

runTest();
