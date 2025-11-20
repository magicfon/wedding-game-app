import fs from 'fs';
import path from 'path';

const SOUND_FILES = [
    'game-start.mp3',
    'countdown.mp3',
    'time-up.mp3',
    'correct-answer.mp3',
    'leaderboard.mp3',
    'vote.mp3',
];

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'sounds');

console.log('🔍 Checking sound files in:', PUBLIC_DIR);

let allExist = true;

SOUND_FILES.forEach((file) => {
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ Found: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
        console.error(`❌ Missing: ${file}`);
        allExist = false;
    }
});

if (allExist) {
    console.log('🎉 All sound files are present!');
    process.exit(0);
} else {
    console.error('⚠️ Some sound files are missing.');
    process.exit(1);
}
