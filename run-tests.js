#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, 'test.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'file://' + __dirname + '/',
});

// jsdom loads scripts asynchronously with resources: 'usable'
// Wait for the external game.js script to load and execute
setTimeout(() => {
    const doc = dom.window.document;

    const summary = doc.getElementById('summary');
    if (!summary || !summary.textContent) {
        console.error('ERROR: Tests did not run. Summary element is empty.');
        process.exit(1);
    }

    console.log('=== Test Summary ===');
    console.log(summary.textContent);
    console.log('');

    const sections = doc.querySelectorAll('.section');
    sections.forEach(sec => {
        const title = sec.querySelector('h2');
        if (!title) return;
        console.log('--- ' + title.textContent + ' ---');
        const rows = sec.querySelectorAll('.test-row');
        rows.forEach(row => {
            const badge = row.querySelector('.badge');
            const detail = row.querySelector('.detail');
            if (badge) {
                const status = badge.textContent.trim();
                const name = row.textContent.replace(status, '').replace(detail ? detail.textContent : '', '').trim();
                const line = '  [' + status + '] ' + name;
                if (detail && detail.textContent) {
                    console.log(line + ' -- ' + detail.textContent);
                } else {
                    console.log(line);
                }
            } else {
                console.log('  ' + row.textContent.trim());
            }
        });
        console.log('');
    });

    // Check for failures
    const text = summary.textContent;
    const failMatch = text.match(/(\d+) failed/);
    const failCount = failMatch ? parseInt(failMatch[1]) : 0;

    if (failCount > 0) {
        console.log('RESULT: SOME TESTS FAILED');
        process.exit(1);
    } else {
        console.log('RESULT: ALL TESTS PASSED');
        process.exit(0);
    }
}, 3000);
