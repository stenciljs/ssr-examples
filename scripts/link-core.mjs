/**
 * Point the workspace at local checkouts of Stencil packages (for testing fixes), or back at the
 * published versions. Works through pnpm overrides in the root package.json, so no package.json
 * under packages/ or examples/ changes. Build the linked packages after editing them.
 *
 *   pnpm link:core      # @stencil/core                <- $STENCIL_CORE_PATH, or ../../stenciljs/packages/core
 *   pnpm link:react     # @stencil/react-output-target <- $OUTPUT_TARGETS_PATH/packages/react, or ../../output-targets/packages/react
 *   pnpm unlink:core / pnpm unlink:react
 *
 * `link:react` installs a packed copy rather than a symlink: Turbopack (Next.js) won't resolve
 * modules outside its project root. Re-run it after rebuilding the output target.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const unlink = process.argv.includes('--unlink');

const targets = {
  core: {
    name: '@stencil/core',
    path: process.env.STENCIL_CORE_PATH ?? path.join(root, '../../stenciljs/packages/core'),
  },
  react: {
    name: '@stencil/react-output-target',
    path: path.join(process.env.OUTPUT_TARGETS_PATH ?? path.join(root, '../../output-targets'), 'packages/react'),
    pack: true,
  },
};
const { name, path: localPath, pack } = targets[process.argv.includes('--react') ? 'react' : 'core'];

pkg.pnpm ??= {};
pkg.pnpm.overrides ??= {};

if (unlink) {
  delete pkg.pnpm.overrides[name];
  if (!Object.keys(pkg.pnpm.overrides).length) delete pkg.pnpm.overrides;
  if (!Object.keys(pkg.pnpm).length) delete pkg.pnpm;
  console.log(`${name} -> published version`);
} else {
  const resolved = path.resolve(localPath);
  if (!existsSync(path.join(resolved, 'package.json'))) {
    console.error(`No ${name} at ${resolved}`);
    process.exit(1);
  }
  if (pack) {
    const packDir = path.join(root, 'node_modules/.local-packs');
    mkdirSync(packDir, { recursive: true });
    const packed = path.resolve(
      resolved,
      execSync(`pnpm pack --pack-destination ${packDir}`, { cwd: resolved, encoding: 'utf8' }).trim().split('\n').pop(),
    );
    // content-addressed name: pnpm caches a `file:` tarball by its path
    const hash = createHash('sha1').update(readFileSync(packed)).digest('hex').slice(0, 10);
    const file = packed.replace(/\.tgz$/, `-${hash}.tgz`);
    renameSync(packed, file);
    pkg.pnpm.overrides[name] = `file:${path.relative(root, file)}`;
  } else {
    pkg.pnpm.overrides[name] = `link:${resolved}`;
  }
  console.log(`${name} -> ${resolved}`);
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
execSync('pnpm install', { cwd: root, stdio: 'inherit' });
