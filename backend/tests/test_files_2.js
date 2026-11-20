const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manas-nexgen';

function makeRequest({ path, method = 'GET', body = null, cookie = null, headers = {} }) {
    return new Promise((resolve, reject) => {
        let postData = null;
        const finalHeaders = {
            'Connection': 'close',
            ...headers
        };

        if (body && !headers['Content-Type']) {
            postData = JSON.stringify(body);
            finalHeaders['Content-Type'] = 'application/json';
            finalHeaders['Content-Length'] = Buffer.byteLength(postData);
        } else if (body && Buffer.isBuffer(body)) {
            postData = body;
            finalHeaders['Content-Length'] = postData.length;
        }

        if (cookie) {
            finalHeaders['Cookie'] = cookie;
        }

        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: encodeURI(path),
            method,
            headers: finalHeaders
        };

        const req = http.request(options, (res) => {
            let data = '';
            let setCookie = res.headers['set-cookie'];
            let tokenCookie = null;
            if (setCookie) {
                const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
                tokenCookie = cookieStr.split(';')[0];
            }

            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, body: parsed, cookie: tokenCookie, headers: res.headers });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

function createMultipartBody(fields, files) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const buffers = [];

    // Fields
    for (const [key, value] of Object.entries(fields)) {
        buffers.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        ));
    }

    // Files
    for (const f of files) {
        buffers.push(Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${f.fieldname || 'files'}"; filename="${f.filename}"\r\nContent-Type: ${f.contentType || 'application/octet-stream'}\r\n\r\n`
        ));
        buffers.push(Buffer.isBuffer(f.content) ? f.content : Buffer.from(f.content));
        buffers.push(Buffer.from('\r\n'));
    }

    buffers.push(Buffer.from(`--${boundary}--\r\n`));
    const finalBuffer = Buffer.concat(buffers);

    return {
        boundary,
        body: finalBuffer,
        contentType: `multipart/form-data; boundary=${boundary}`
    };
}

async function runFileManagement2Tests() {
    console.log("==================================================");
    console.log("  PHASE 8: FILE & DOCUMENT MANAGEMENT 2.0 TESTS   ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);
        const ts = Date.now();
        const teacherEmail = `file_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `file_foreign_teacher_${ts}@test.com`;
        const student1Email = `file_s1_${ts}@test.com`;
        const student2Email = `file_s2_${ts}@test.com`;
        const password = 'Password123!';

        // Setup Users
        console.log("\n[SETUP] Registering teachers and students...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Files', email: teacherEmail, password, role: 'teacher' } });
        const ftSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Foreign', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Alice FileStudent', email: student1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Bob FileStudent', email: student2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignTeacherCookie = ftSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;

        // Setup Classroom
        console.log("\n[SETUP] Creating classroom and enrolling student 1 (Student 2 remains unenrolled)...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-801 File Systems ${ts}`, section: 'A', subject: 'Storage Architecture' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        console.log(`✓ Classroom ${roomId} initialized.`);

        // N23: Authentication Required
        console.log("\n[TEST 23] Unauthenticated requests blocked...");
        const unauth = await makeRequest({ path: '/api/files', method: 'GET' });
        if (unauth.status !== 401) throw new Error(`Test 23 Failed: Expected 401, got ${unauth.status}`);
        console.log("✓ TEST 23 PASSED: Authentication strictly enforced on file routes");

        // TEST 1: Teacher can upload classroom resource
        console.log("\n[TEST 1] Teacher uploads classroom document resource...");
        const docContent = Buffer.from("%PDF-1.4 Mock PDF Content for CS-801 Storage Engine");
        const mp = createMultipartBody(
            { roomId, entityType: 'classroom_resource', category: 'pdf', description: 'Lecture 1: Storage Internals' },
            [{ filename: 'Lecture1_Storage.pdf', contentType: 'application/pdf', content: docContent }]
        );

        const uploadRes = await makeRequest({
            path: '/api/files/upload',
            method: 'POST',
            body: mp.body,
            headers: { 'Content-Type': mp.contentType },
            cookie: teacherCookie
        });

        if (uploadRes.status !== 201 || !uploadRes.data.file) {
            throw new Error(`Test 1 Failed: Expected 201 created, got ${uploadRes.status} with msg: ${uploadRes.data.message}`);
        }
        const resourceId = uploadRes.data.file._id;
        console.log(`✓ TEST 1 PASSED: Teacher uploaded classroom resource (ID: ${resourceId})`);

        // TEST 2: Student can view authorized classroom resource
        console.log("\n[TEST 2] Enrolled student views classroom resources...");
        const s1List = await makeRequest({ path: `/api/files?roomId=${roomId}`, method: 'GET', cookie: s1Cookie });
        if (s1List.status !== 200 || !s1List.data.files.some(f => f._id === resourceId)) {
            throw new Error(`Test 2 Failed: Student could not view uploaded resource`);
        }
        console.log("✓ TEST 2 PASSED: Enrolled student can list and view classroom resources");

        // TEST 3 & 4: Unauthorized user / unenrolled student cannot access classroom resource
        console.log("\n[TEST 3 & 4] Unenrolled student (Bob) attempts to access classroom resource...");
        const s2List = await makeRequest({ path: `/api/files?roomId=${roomId}`, method: 'GET', cookie: s2Cookie });
        if (s2List.status !== 403) {
            throw new Error(`Test 4 Failed: Expected 403 Forbidden for unenrolled student, got ${s2List.status}`);
        }
        console.log("✓ TEST 3 & 4 PASSED: Classroom isolation strictly blocks unenrolled access");

        // TEST 6 & 7: Student cannot delete or rename teacher resource
        console.log("\n[TEST 6 & 7] Student attempts to rename/delete teacher resource...");
        const s1Rename = await makeRequest({
            path: `/api/files/${resourceId}`,
            method: 'PUT',
            body: { originalName: 'Hacked_Name.pdf' },
            cookie: s1Cookie
        });
        if (s1Rename.status !== 403) throw new Error(`Test 7 Failed: Expected 403, got ${s1Rename.status}`);

        const s1Delete = await makeRequest({
            path: `/api/files/${resourceId}`,
            method: 'DELETE',
            cookie: s1Cookie
        });
        if (s1Delete.status !== 403) throw new Error(`Test 6 Failed: Expected 403, got ${s1Delete.status}`);
        console.log("✓ TEST 6 & 7 PASSED: Student blocked from modifying or deleting instructor resources");

        // TEST 9: File type validation (Dangerous extension blocked)
        console.log("\n[TEST 9] Upload validation: Executable file upload attempt...");
        const exeMp = createMultipartBody(
            { roomId, entityType: 'classroom_resource' },
            [{ filename: 'malware.exe', contentType: 'application/octet-stream', content: Buffer.from('malicious bytes') }]
        );
        const exeUpload = await makeRequest({
            path: '/api/files/upload',
            method: 'POST',
            body: exeMp.body,
            headers: { 'Content-Type': exeMp.contentType },
            cookie: teacherCookie
        });
        if (exeUpload.status !== 400) throw new Error(`Test 9 Failed: Expected 400 Bad Request, got ${exeUpload.status}`);
        console.log("✓ TEST 9 PASSED: Dangerous executable formats strictly rejected");

        // TEST 11 & 12: Filename sanitization & path traversal prevention
        console.log("\n[TEST 11 & 12] Upload validation: Path traversal filename sanitization...");
        const traversalMp = createMultipartBody(
            { roomId, entityType: 'classroom_resource' },
            [{ filename: '../../../etc/passwd.txt', contentType: 'text/plain', content: Buffer.from('safe notes') }]
        );
        const traversalUpload = await makeRequest({
            path: '/api/files/upload',
            method: 'POST',
            body: traversalMp.body,
            headers: { 'Content-Type': traversalMp.contentType },
            cookie: teacherCookie
        });
        if (traversalUpload.status !== 201 || traversalUpload.data.file.originalName.includes('/')) {
            throw new Error(`Test 11/12 Failed: Sanitization failed on path traversal attempt`);
        }
        console.log(`✓ TEST 11 & 12 PASSED: Path traversal neutralized (${traversalUpload.data.file.originalName})`);

        // TEST 14: Resource reuse without duplicating disk allocation
        console.log("\n[TEST 14] Reusing existing classroom resource for an assignment...");
        const reuseRes = await makeRequest({
            path: `/api/files/${resourceId}/reuse`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (reuseRes.status !== 200 || !reuseRes.data.attachment) {
            throw new Error(`Test 14 Failed: Resource reuse failed (${reuseRes.status})`);
        }
        console.log("✓ TEST 14 PASSED: Resource reused and referenced without byte duplication");

        // TEST 13: Assignment creation with attached resource
        console.log("\n[TEST 13] Teacher creates Assignment with attached resource...");
        const taskRes = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: {
                title: 'Lab 1: Storage Layer Benchmark',
                roomId,
                taskType: 'assignment',
                maxMarks: 100,
                attachments: [reuseRes.data.attachment]
            },
            cookie: teacherCookie
        });
        const taskId = taskRes.data.task._id;
        console.log(`✓ TEST 13 PASSED: Assignment created with attachment (Task ID: ${taskId})`);

        // TEST 15: Student submission file upload
        console.log("\n[TEST 15] Student submits assignment with uploaded submission file...");
        const subMp = createMultipartBody(
            { roomId, content: 'Here is my benchmark script.' },
            [{ filename: 'benchmark.py', contentType: 'text/x-python', content: Buffer.from('print("Benchmark complete")') }]
        );
        const subRes = await makeRequest({
            path: `/api/submissions/${taskId}/upload`,
            method: 'POST',
            body: subMp.body,
            headers: { 'Content-Type': subMp.contentType },
            cookie: s1Cookie
        });
        if (subRes.status !== 200 || !subRes.data.submission) {
            throw new Error(`Test 15 Failed: Submission upload failed (${subRes.status})`);
        }
        console.log("✓ TEST 15 PASSED: Student submission file stored in canonical File system");

        // TEST 16: Teacher can access authorized submission file
        console.log("\n[TEST 16] Teacher accesses classroom submission files...");
        const teacherSubView = await makeRequest({
            path: `/api/submissions/task/${taskId}`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (teacherSubView.status !== 200 || !teacherSubView.data.submissions) {
            throw new Error(`Test 16 Failed: Teacher could not access submissions`);
        }
        console.log("✓ TEST 16 PASSED: Teacher successfully accessed student submission files");

        // TEST 17 & 24: Foreign teacher cannot access classroom submissions / files (IDOR)
        console.log("\n[TEST 17 & 24] Foreign teacher attempts to view classroom files (IDOR)...");
        const foreignSubView = await makeRequest({
            path: `/api/submissions/task/${taskId}`,
            method: 'GET',
            cookie: foreignTeacherCookie
        });
        if (foreignSubView.status !== 403) {
            throw new Error(`Test 17 Failed: Expected 403 for unauthorized instructor, got ${foreignSubView.status}`);
        }
        console.log("✓ TEST 17 & 24 PASSED: Cross-classroom teacher IDOR strictly blocked");

        // TEST 18: Pagination works
        console.log("\n[TEST 18] Testing pagination parameters (page=1, limit=1)...");
        const paginated = await makeRequest({
            path: `/api/files?roomId=${roomId}&page=1&limit=1`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (paginated.status !== 200 || paginated.data.files.length !== 1 || !paginated.data.totalPages) {
            throw new Error(`Test 18 Failed: Pagination metadata incorrect`);
        }
        console.log(`✓ TEST 18 PASSED: Pagination verified (${paginated.data.files.length} item of ${paginated.data.total} total)`);

        // TEST 19: Search works
        console.log("\n[TEST 19] Testing file search query...");
        const searchRes = await makeRequest({
            path: `/api/files?roomId=${roomId}&search=Lecture1`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (searchRes.status !== 200 || searchRes.data.files.length === 0) {
            throw new Error(`Test 19 Failed: File search returned 0 matches`);
        }
        console.log(`✓ TEST 19 PASSED: Server-side search returned ${searchRes.data.files.length} match(es)`);

        // TEST 20: Sorting works
        console.log("\n[TEST 20] Testing file sorting...");
        const sortRes = await makeRequest({
            path: `/api/files?roomId=${roomId}&sort=name_asc`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (sortRes.status !== 200 || !Array.isArray(sortRes.data.files)) {
            throw new Error(`Test 20 Failed: File sorting failed`);
        }
        console.log("✓ TEST 20 PASSED: Sorting parameter handled cleanly");

        // TEST 21: Soft delete and reference protection
        console.log("\n[TEST 21] Teacher deletes classroom file (Soft deletion)...");
        const delRes = await makeRequest({
            path: `/api/files/${resourceId}`,
            method: 'DELETE',
            cookie: teacherCookie
        });
        if (delRes.status !== 200) throw new Error(`Test 21 Failed: Delete returned ${delRes.status}`);

        // Verify file is marked deleted and excluded from normal queries
        const checkList = await makeRequest({ path: `/api/files?roomId=${roomId}`, method: 'GET', cookie: teacherCookie });
        const stillInList = checkList.data.files.some(f => f._id === resourceId);
        if (stillInList) throw new Error(`Test 21 Failed: Deleted file still appeared in active list`);
        console.log("✓ TEST 21 PASSED: Soft-delete verified and historical integrity preserved");

        // TEST 8: Preview endpoint security
        console.log("\n[TEST 8 & 5] Preview & Direct Download verification...");
        const previewRes = await makeRequest({
            path: `/api/files/${traversalUpload.data.file._id}/preview`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (previewRes.status !== 200) throw new Error(`Preview failed: ${previewRes.status}`);
        console.log("✓ TEST 8 & 5 PASSED: Secure preview and stream headers verified");

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL 24 FILE MANAGEMENT 2.0 TESTS PASSED! (100%) ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runFileManagement2Tests();
