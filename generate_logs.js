const fs = require('fs');

const stream = fs.createWriteStream('test_large.log');

// Edge cases
stream.write('[2026-09-20T13:34:09] [INFO] [system] Valid log entry with node\n');
stream.write('[2026-09-20T13:34:09] [ERROR] Something went wrong\n');
stream.write('   \n'); // Empty line
stream.write('[WARN] [lidar_node] Missing timestamp\n');
stream.write('[2026-09-20T13:34:10] Missing level\n');
stream.write('Completely malformed entry that should just be displayed as-is\n');
stream.write('[2026-09-20T13:34:11] [FATAL] [camera] A very fatal error\n');
stream.write('[2026-09-20T13:34:12] [DEBUG] [planner] Just debugging\n');
stream.write('[2026-09-20T13:34:13] [UNKNOWN] Unknown level should be preserved\n');
stream.write('[2026-09-20T13:34:14] [INFO] ' + 'A'.repeat(5000) + '\n'); // Long message

// Add 50,000 normal lines to test performance
for (let i = 0; i < 50000; i++) {
    const node = i % 2 === 0 ? '[controller]' : '[lidar_node]';
    stream.write(`[2026-09-20T14:00:00] [INFO] ${node} Bulk message number ${i}\n`);
}

stream.end(() => {
    console.log('test_large.log generated successfully with ' + (10 + 50000) + ' lines.');
});
