#!/usr/bin/env node

const port = process.argv[2] ?? "8082";
const apiPort = process.argv[3] ?? "3000";

console.log("\nUR Platform — Web (browser)\n");
console.log(`Homepage:  http://localhost:${port}/welcome`);
console.log(`Download:  http://localhost:${port}/download`);
console.log(`Sign in:   http://localhost:${port}/login`);
console.log(`Sign up:   http://localhost:${port}/signup`);
console.log(`App:       http://localhost:${port}/`);
console.log(`API:       http://localhost:${apiPort}/api/health\n`);
console.log("Start with:  pnpm dev:web\n");
console.log("After sign-in, open Profile → Sign Out to test logout.\n");
