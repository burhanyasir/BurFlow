const { execSync } = require('child_process');
const path = require('path');

const esbuild = path.resolve(__dirname, '../../node_modules/esbuild/bin/esbuild');
const src = path.resolve(__dirname, 'src/index.ts');
const out = path.resolve(__dirname, 'dist/widget.js');

execSync(`node "${esbuild}" "${src}" --bundle --target=es2022 --format=iife --minify --outfile="${out}"`, {
  cwd: __dirname,
  stdio: 'inherit'
});

console.log('Build complete:', out);
