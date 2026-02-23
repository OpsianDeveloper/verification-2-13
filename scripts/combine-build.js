const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to run commands
const run = (cmd, cwd) => {
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: cwd });
};

// Paths
const currentDir = process.cwd();
const frontendDir = path.join(currentDir, 'Front_end');
const publicDir = path.join(currentDir, 'public');

// --- Step 1: Frontend Build ---
console.log('--- Building Frontend ---');

// Detect platform
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

// Install frontend dependencies
console.log('Installing frontend dependencies...');
run(`${npmCmd} install --production=false`, frontendDir);

// Build frontend
console.log('Building Vite app...');
run(`${npxCmd} vite build`, frontendDir);

// --- Step 2: Move Artifacts ---
console.log('--- Moving Frontend Artifacts ---');

const distDir = path.join(frontendDir, 'dist');

if (!fs.existsSync(distDir)) {
    console.error('Error: Frontend build directory not found!');
    process.exit(1);
}

// Create public dir if missing
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Recursive copy function
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Copy everything from dist to public
console.log(`Copying from ${distDir} to ${publicDir}`);
copyDir(distDir, publicDir);

console.log('--- Frontend Build Integration Complete ---');
