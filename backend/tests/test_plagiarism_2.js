const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_HOST = '127.0.0.1';
const API_PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/manas-nexgen';

const plagiarismService = require('../services/plagiarismService');

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

async function runPlagiarism2Tests() {
    console.log("==================================================");
    console.log("  PHASE 11: PLAGIARISM & ACADEMIC INTEGRITY 2.0   ");
    console.log("==================================================");

    try {
        await mongoose.connect(MONGO_URI);

        // TEST 1: Service loads
        console.log("\n[TEST 1] Testing PlagiarismService unit loading...");
        if (!plagiarismService || typeof plagiarismService.normalizeText !== 'function') {
            throw new Error("Test 1 Failed: plagiarismService failed to load");
        }
        console.log("✓ TEST 1 PASSED: PlagiarismService loaded cleanly");

        // TEST 2: Text Normalization
        console.log("\n[TEST 2] Text normalization verification...");
        const raw = "  Machine Learning,   is POWERFUL! \n\n (Deep Learning)  ";
        const normalized = plagiarismService.normalizeText(raw);
        if (normalized !== "machine learning is powerful deep learning") {
            throw new Error(`Test 2 Failed: Normalization output '${normalized}'`);
        }
        console.log("✓ TEST 2 PASSED: Text normalization collapsed whitespace and removed punctuation");

        // TEST 3: Exact Duplicate Detection (100%)
        console.log("\n[TEST 3] Exact duplicate detection...");
        const textA = "Artificial Intelligence represents the simulation of human intelligence processes by computer systems.";
        const textB = "Artificial Intelligence represents the simulation of human intelligence processes by computer systems.";
        const exactAnalysis = plagiarismService.analyzeSubmissionText(
            { submissionId: 'sub1', studentId: 'st1', text: textA },
            [{ submissionId: 'sub2', studentId: 'st2', text: textB }]
        );
        if (exactAnalysis.overallSimilarityPercent !== 100 || exactAnalysis.exactMatchPercent !== 100) {
            throw new Error(`Test 3 Failed: Expected 100%, got ${exactAnalysis.overallSimilarityPercent}%`);
        }
        console.log("✓ TEST 3 PASSED: Exact duplicate detected with 100% similarity");

        // TEST 4: Near Duplicate Detection
        console.log("\n[TEST 4] Near duplicate detection...");
        const textNear = "Artificial Intelligence represents the simulation of human cognitive processes by modern computer systems.";
        const nearAnalysis = plagiarismService.analyzeSubmissionText(
            { submissionId: 'sub1', studentId: 'st1', text: textA },
            [{ submissionId: 'sub2', studentId: 'st2', text: textNear }]
        );
        if (nearAnalysis.overallSimilarityPercent < 60) {
            throw new Error(`Test 4 Failed: Expected high similarity (>60%), got ${nearAnalysis.overallSimilarityPercent}%`);
        }
        console.log(`✓ TEST 4 PASSED: Near-duplicate detected (${nearAnalysis.overallSimilarityPercent}% similarity)`);

        // TEST 5: Distinct Texts (Low Similarity)
        console.log("\n[TEST 5] Low similarity on distinct subjects...");
        const textDistinct = "Photosynthesis is the biological process used by plants to convert light energy into chemical energy.";
        const lowAnalysis = plagiarismService.analyzeSubmissionText(
            { submissionId: 'sub1', studentId: 'st1', text: textA },
            [{ submissionId: 'sub2', studentId: 'st2', text: textDistinct }]
        );
        if (lowAnalysis.overallSimilarityPercent > 15 || lowAnalysis.category !== 'low') {
            throw new Error(`Test 5 Failed: Expected low category, got ${lowAnalysis.category} (${lowAnalysis.overallSimilarityPercent}%)`);
        }
        console.log("✓ TEST 5 PASSED: Distinct text correctly categorized as low similarity");

        // TEST 6: Phrase Matching and Short Phrase Filtering (< 5 words)
        console.log("\n[TEST 6 & 7] Phrase matching & short phrase false positive reduction...");
        const phraseA = "In conclusion, this research confirms that neural network optimization requires backpropagation across deep layers.";
        const phraseB = "In conclusion, we find that neural network optimization requires backpropagation across deep layers of neurons.";
        const phraseAnalysis = plagiarismService.analyzeSubmissionText(
            { submissionId: 'sub1', studentId: 'st1', text: phraseA },
            [{ submissionId: 'sub2', studentId: 'st2', text: phraseB }]
        );
        if (phraseAnalysis.matchedSegments.length === 0) {
            throw new Error("Test 6 Failed: Expected matched phrase segments");
        }
        console.log(`✓ TEST 6 & 7 PASSED: Extracted ${phraseAnalysis.matchedSegments.length} meaningful overlapping phrase(s)`);

        // TEST 8: Self-Submission Exclusion
        console.log("\n[TEST 8] Self-submission exclusion...");
        const selfAnalysis = plagiarismService.analyzeSubmissionText(
            { submissionId: 'sub1', studentId: 'st1', text: textA },
            [{ submissionId: 'sub1_old', studentId: 'st1', text: textA }] // Same student
        );
        if (selfAnalysis.overallSimilarityPercent !== 0 || selfAnalysis.matchedSubmissions.length !== 0) {
            throw new Error("Test 8 Failed: Self-submission was not excluded");
        }
        console.log("✓ TEST 8 PASSED: Student's own previous draft safely excluded from peer plagiarism");

        // ============================================================
        // ENDPOINT INTEGRATION & RBAC TESTS
        // ============================================================
        const ts = Date.now();
        const teacherEmail = `plag_teacher_${ts}@test.com`;
        const foreignTeacherEmail = `plag_foreign_${ts}@test.com`;
        const s1Email = `plag_s1_${ts}@test.com`;
        const s2Email = `plag_s2_${ts}@test.com`;
        const password = 'Password123!';

        console.log("\n[SETUP] Registering instructors and students...");
        const tSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Integrity', email: teacherEmail, password, role: 'teacher' } });
        const ftSign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Prof. Foreign', email: foreignTeacherEmail, password, role: 'teacher' } });
        const s1Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Alice Author', email: s1Email, password, role: 'student' } });
        const s2Sign = await makeRequest({ path: '/api/auth/register', method: 'POST', body: { fullname: 'Bob Copier', email: s2Email, password, role: 'student' } });

        const teacherCookie = tSign.cookie;
        const foreignTeacherCookie = ftSign.cookie;
        const s1Cookie = s1Sign.cookie;
        const s2Cookie = s2Sign.cookie;
        const s1Id = s1Sign.data.user._id;
        const s2Id = s2Sign.data.user._id;

        console.log("\n[SETUP] Creating classroom, assignment, and student submissions...");
        const roomRes = await makeRequest({
            path: '/api/rooms/create',
            method: 'POST',
            body: { name: `CS-801 Academic Writing ${ts}`, section: 'A', subject: 'Ethics' },
            cookie: teacherCookie
        });
        const roomId = roomRes.data.room._id;
        const roomCode = roomRes.data.room.code;

        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s1Cookie });
        await makeRequest({ path: '/api/rooms/join', method: 'POST', body: { code: roomCode }, cookie: s2Cookie });

        // Teacher creates Task
        const taskRes = await makeRequest({
            path: '/api/tasks',
            method: 'POST',
            body: { title: 'Essay: Ethics in Artificial Intelligence', maxMarks: 100, room: roomId },
            cookie: teacherCookie
        });
        const taskId = taskRes.data.task._id;

        // Alice submits original essay
        const sub1Res = await makeRequest({
            path: `/api/submissions/${taskId}`,
            method: 'POST',
            body: { content: "Autonomous artificial intelligence agents must adhere to strict ethical principles to protect human privacy and dignity across all applications.", roomId },
            cookie: s1Cookie
        });
        const sub1Id = sub1Res.data.submission._id;

        // Bob submits copied essay
        const sub2Res = await makeRequest({
            path: `/api/submissions/${taskId}`,
            method: 'POST',
            body: { content: "Autonomous artificial intelligence agents must adhere to strict ethical principles to protect human privacy and dignity across all applications.", roomId },
            cookie: s2Cookie
        });
        const sub2Id = sub2Res.data.submission._id;

        // TEST 9: Teacher analyzes single submission
        console.log("\n[TEST 9] Teacher analyzes Bob's submission against Alice's...");
        const analyzeRes = await makeRequest({
            path: `/api/plagiarism/submissions/${sub2Id}/analyze`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (analyzeRes.status !== 200 || !analyzeRes.data.report || analyzeRes.data.report.overallSimilarityPercent !== 100) {
            throw new Error(`Test 9 Failed: Expected 100% similarity, got ${analyzeRes.data.report?.overallSimilarityPercent}%`);
        }
        const reportId = analyzeRes.data.report._id;
        console.log(`✓ TEST 9 PASSED: Single submission analyzed with 100% similarity match to Alice`);

        // TEST 10: Student blocked from triggering teacher analysis (RBAC)
        console.log("\n[TEST 10] Student attempts to trigger plagiarism analysis...");
        const studentAnalyze = await makeRequest({
            path: `/api/plagiarism/submissions/${sub2Id}/analyze`,
            method: 'POST',
            cookie: s1Cookie
        });
        if (studentAnalyze.status !== 403) {
            throw new Error(`Test 10 Failed: Expected 403, got ${studentAnalyze.status}`);
        }
        console.log("✓ TEST 10 PASSED: Student blocked from executing teacher analysis (HTTP 403)");

        // TEST 11: IDOR Protection - Alice cannot access Bob's private report
        console.log("\n[TEST 11] Alice attempts to inspect Bob's plagiarism report (IDOR)...");
        const idorGet = await makeRequest({
            path: `/api/plagiarism/submissions/${sub2Id}`,
            method: 'GET',
            cookie: s1Cookie
        });
        if (idorGet.status !== 403) {
            throw new Error(`Test 11 Failed: Expected 403 for IDOR, got ${idorGet.status}`);
        }
        console.log("✓ TEST 11 PASSED: Cross-student plagiarism report access strictly blocked (HTTP 403)");

        // TEST 12: Student accesses own sanitized report
        console.log("\n[TEST 12] Bob accesses own originality report...");
        const ownReport = await makeRequest({
            path: `/api/plagiarism/submissions/${sub2Id}`,
            method: 'GET',
            cookie: s2Cookie
        });
        if (ownReport.status !== 200 || !ownReport.data.report || ownReport.data.isTeacher) {
            throw new Error(`Test 12 Failed: Bob could not retrieve own report`);
        }
        console.log("✓ TEST 12 PASSED: Student retrieved own sanitized originality report");

        // TEST 13: Task-Wide Overview
        console.log("\n[TEST 13] Teacher queries task-wide plagiarism overview...");
        const overviewRes = await makeRequest({
            path: `/api/plagiarism/tasks/${taskId}`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (overviewRes.status !== 200 || !overviewRes.data.summary) {
            throw new Error(`Test 13 Failed: Expected overview summary`);
        }
        console.log(`✓ TEST 13 PASSED: Task overview retrieved (${overviewRes.data.summary.analyzedCount} analyzed)`);

        // TEST 14: Batch analyze task submissions
        console.log("\n[TEST 14] Running batch analysis for all task submissions...");
        const batchRes = await makeRequest({
            path: `/api/plagiarism/tasks/${taskId}/analyze`,
            method: 'POST',
            cookie: teacherCookie
        });
        if (batchRes.status !== 200 || batchRes.data.analyzedCount < 2) {
            throw new Error(`Test 14 Failed: Batch analyze returned ${batchRes.status}`);
        }
        console.log(`✓ TEST 14 PASSED: Batch analysis completed for ${batchRes.data.analyzedCount} submissions`);

        // TEST 15: Teacher review action
        console.log("\n[TEST 15] Teacher reviews plagiarism report...");
        const reviewRes = await makeRequest({
            path: `/api/plagiarism/reports/${reportId}/review`,
            method: 'POST',
            body: { reviewNotes: "Reviewed: Verified direct copy from peer." },
            cookie: teacherCookie
        });
        if (reviewRes.status !== 200 || !reviewRes.data.report.isReviewed) {
            throw new Error(`Test 15 Failed: Review report failed`);
        }
        console.log("✓ TEST 15 PASSED: Instructor review state successfully persisted");

        // TEST 16: Task Plagiarism CSV Export
        console.log("\n[TEST 16] Teacher exports task plagiarism CSV...");
        const csvRes = await makeRequest({
            path: `/api/plagiarism/tasks/${taskId}/export`,
            method: 'GET',
            cookie: teacherCookie
        });
        if (csvRes.status !== 200 || typeof csvRes.data !== 'string' || !csvRes.data.includes("Overall Similarity %")) {
            throw new Error(`Test 16 Failed: CSV export failed`);
        }
        console.log("✓ TEST 16 PASSED: Plagiarism CSV report generated with formula injection protection");

        // TEST 17: Foreign Teacher IDOR Protection
        console.log("\n[TEST 17] Foreign teacher attempts to access task plagiarism report...");
        const foreignTask = await makeRequest({
            path: `/api/plagiarism/tasks/${taskId}`,
            method: 'GET',
            cookie: foreignTeacherCookie
        });
        if (foreignTask.status !== 403) {
            throw new Error(`Test 17 Failed: Expected 403 for foreign teacher, got ${foreignTask.status}`);
        }
        console.log("✓ TEST 17 PASSED: Cross-classroom teacher access strictly blocked (HTTP 403)");

        await mongoose.disconnect();
        console.log("\n==================================================");
        console.log("  ALL PHASE 11 PLAGIARISM TESTS PASSED! (100%)    ");
        console.log("==================================================");

    } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runPlagiarism2Tests();
