/**
 * Single source of truth for the running build. The release script
 * (`node scripts/release.mjs`) rewrites APP_VERSION from package.json before
 * every release, so the installed app always knows what it is.
 */
export const APP_NAME = 'HyperGym';
export const APP_VERSION = '1.0.1';

/** Public repo whose GitHub Releases drive the in-app update check. */
export const RELEASES_REPO = 'indranil098/HyperGym';
