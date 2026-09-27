const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const appJsContent = fs.readFileSync('app.js', 'utf-8');
const parserCode = appJsContent.substring(0, appJsContent.indexOf('// --- App State ---'));
eval(parserCode);

test('Parser Tests - Real World Data', async (t) => {
    await t.test('Unbracketed Timestamp + Level + Node', () => {
        const log = parseLogLine('2026-09-21 05:40:01.000 [INFO] [robot_controller] Robot system initialized successfully');
        assert.strictEqual(log.timestamp, '2026-09-21 05:40:01.000');
        assert.strictEqual(log.level, 'INFO');
        assert.strictEqual(log.node, 'robot_controller');
        assert.strictEqual(log.message, 'Robot system initialized successfully');
        assert.strictEqual(log.unparsed, false);
    });

    await t.test('Unbracketed Timestamp + WARN + Node', () => {
        const log = parseLogLine('2026-09-21 05:40:04.996 [WARN] [network] Telemetry packet delay detected: 52 ms');
        assert.strictEqual(log.timestamp, '2026-09-21 05:40:04.996');
        assert.strictEqual(log.level, 'WARN');
        assert.strictEqual(log.node, 'network');
        assert.strictEqual(log.message, 'Telemetry packet delay detected: 52 ms');
        assert.strictEqual(log.unparsed, false);
    });

    await t.test('Unbracketed Timestamp + ERROR + Node', () => {
        const log = parseLogLine('2026-09-21 05:40:05.414 [ERROR] [network] Telemetry connection lost: retrying connection');
        assert.strictEqual(log.timestamp, '2026-09-21 05:40:05.414');
        assert.strictEqual(log.level, 'ERROR');
        assert.strictEqual(log.node, 'network');
        assert.strictEqual(log.message, 'Telemetry connection lost: retrying connection');
        assert.strictEqual(log.unparsed, false);
    });

    await t.test('Backward Compatibility: Bracketed timestamp', () => {
        const log = parseLogLine('[2026-09-20T13:34:09] [INFO] [lidar_node] Sensor initialized');
        assert.strictEqual(log.timestamp, '2026-09-20T13:34:09');
        assert.strictEqual(log.level, 'INFO');
        assert.strictEqual(log.node, 'lidar_node');
        assert.strictEqual(log.message, 'Sensor initialized');
    });

    await t.test('Backward Compatibility: Missing node', () => {
        const log = parseLogLine('2026-09-21 05:40:01.000 [INFO] Something went wrong');
        assert.strictEqual(log.timestamp, '2026-09-21 05:40:01.000');
        assert.strictEqual(log.level, 'INFO');
        assert.strictEqual(log.node, '—');
        assert.strictEqual(log.message, 'Something went wrong');
    });

    await t.test('Backward Compatibility: Only message', () => {
        const log = parseLogLine('This is just a random line');
        assert.strictEqual(log.timestamp, '—');
        assert.strictEqual(log.level, '—');
        assert.strictEqual(log.node, '—');
        assert.strictEqual(log.message, 'This is just a random line');
        assert.strictEqual(log.unparsed, true);
    });
});
