#!/usr/bin/env node
/**
 * Release pipeline for HyperGym.
 *
 *   node scripts/release.mjs 0.2.0 --notes "..."          # full: bump, build, commit, publish
 *   node scripts/release.mjs 0.2.0 --skip-build            # version + release only
 *   node scripts/release.mjs 0.2.0 --skip-create           # version + build only
 *
 * Steps: sync APP_VERSION into src/releaseInfo.ts and package.json, build the
 * release APK with gradle, commit the bump, then `gh release create` with the
 * APK attached. The in-app updater reads /releases/latest, so publishing here
 * is what makes the update sheet appear on installed builds.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const version = args.find(arg => /^\d+\.\d+\.\d+$/.test(arg));
if (!version) {
  fail('usage: node scripts/release.mjs <version> [--notes <text|@file>] [--skip-build] [--skip-create] [--skip-commit]');
}

const hasFlag = name => args.includes(name);
const skipBuild = hasFlag('--skip-build');
const skipCreate = hasFlag('--skip-create');
const skipCommit = hasFlag('--skip-commit');

const notesIndex = args.indexOf('--notes');
let notes = '';
if (notesIndex !== -1) {
  const raw = args[notesIndex + 1];
  if (!raw) {
    fail('--notes needs a value (text, or @path/to/file.md)');
  }
  notes = raw.startsWith('@') ? readFileSync(path.resolve(raw.slice(1)), 'utf8').trim() : raw;
}

const tag = `v${version}`;

// 1. Sync the version into the two places that declare it.
const releaseInfoPath = path.join(root, 'src', 'releaseInfo.ts');
const releaseInfo = readFileSync(releaseInfoPath, 'utf8');
if (!/export const APP_VERSION = '[^']+';/.test(releaseInfo)) {
  fail('src/releaseInfo.ts does not declare APP_VERSION as expected');
}
writeFileSync(
  releaseInfoPath,
  releaseInfo.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${version}';`),
);

const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

// Android reads its own copy; versionCode must strictly increase for real
// update installs, so it is derived from the semver fields.
const [maj, min, patch] = version.split('.').map(Number);
const versionCode = maj * 1_000_000 + min * 1_000 + patch;
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const gradle = readFileSync(gradlePath, 'utf8');
if (!/versionCode \d+/.test(gradle) || !/versionName "[^"]+"/.test(gradle)) {
  fail('android/app/build.gradle does not declare versionCode/versionName as expected');
}
writeFileSync(
  gradlePath,
  gradle
    .replace(/versionCode \d+/, `versionCode ${versionCode}`)
    .replace(/versionName "[^"]+"/, `versionName "${version}"`),
);
console.log(`release: version synced to ${version} (android versionCode ${versionCode})`);

// 2. Build the release APK.
const apkPath = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!skipBuild) {
  console.log('release: building assembleRelease (first build can take a while)');
  const build = spawnSync('gradlew.bat', ['assembleRelease'], {
    cwd: path.join(root, 'android'),
    stdio: 'inherit',
    shell: true,
  });
  if (build.status !== 0) {
    fail('gradle build failed');
  }
}
if (!existsSync(apkPath)) {
  fail(`APK not found at ${apkPath} — run without --skip-build first`);
}
console.log(`release: APK ready at ${apkPath}`);

if (skipCreate) {
  console.log(`release: done (create skipped). Publish later with: gh release create ${tag} <apk>`);
  process.exit(0);
}

// 3. Commit the bump so the tag points at real code.
if (!skipCommit) {
  const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
  const touched = status
    .split(/\r?\n/)
    .filter(line => /releaseInfo\.ts|package\.json$/.test(line));
  if (touched.length === 0) {
    console.log('release: version files unchanged, skipping the release commit');
  } else {
    execSync(`git add package.json src/releaseInfo.ts`, { cwd: root, stdio: 'inherit' });
    execSync(`git commit -m "Release ${tag}"`, { cwd: root, stdio: 'inherit' });
    execSync('git push', { cwd: root, stdio: 'inherit' });
    console.log('release: bump committed and pushed');
  }
}

const sha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();

// 4. Publish the release with the APK attached, named like the store ones.
const notesFile = path.join(mkdtempSync(path.join(tmpdir(), 'hg-release-')), 'notes.md');
writeFileSync(notesFile, notes || `HyperGym ${tag}`);
const namedApk = path.join(path.dirname(apkPath), `HyperGym-${version}.apk`);
copyFileSync(apkPath, namedApk);

// shell:true means node joins the args with spaces, so anything that can
// contain a space (this checkout lives under "F:\gym App") needs quoting.
const q = value => (/\s/.test(value) ? `"${value}"` : value);

const create = spawnSync(
  'gh',
  ['release', 'create', tag, q(namedApk), '--title', q(`HyperGym ${tag}`), '--notes-file', q(notesFile), '--target', sha],
  { cwd: root, stdio: 'inherit', shell: true },
);
if (create.status !== 0) {
  fail('gh release create failed');
}
rmSync(namedApk, { force: true });
console.log(`release: ${tag} published — installed builds will surface it on next cold start`);
