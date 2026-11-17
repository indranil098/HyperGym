import { RELEASES_REPO } from '../releaseInfo';

export type ReleaseAsset = Readonly<{
  name: string;
  size: number;
  url: string;
}>;

export type ReleaseInfo = Readonly<{
  tag: string;
  version: string;
  title: string;
  notes: string;
  publishedAt: string;
  url: string;
  assets: ReleaseAsset[];
}>;

type GithubRelease = {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name?: string; size?: number; browser_download_url?: string }[];
};

const API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;
const TIMEOUT_MS = 12_000;

/** `v1.2.3` / `1.2.3` → [1, 2, 3]; anything else (prerelease shapes) → null. */
export function parseTag(tag: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag.trim());
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewerTag(candidate: string, current: string): boolean {
  const a = parseTag(candidate);
  const b = parseTag(current);
  if (!a || !b) {
    return false;
  }
  if (a[0] !== b[0]) {
    return a[0] > b[0];
  }
  if (a[1] !== b[1]) {
    return a[1] > b[1];
  }
  return a[2] > b[2];
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as GithubRelease;
    if (!data || data.draft || data.prerelease || !data.tag_name) {
      // GitHub already hides drafts and prereleases from /latest; the guard
      // keeps a hand-rolled endpoint from slipping one through.
      return null;
    }
    return {
      tag: data.tag_name,
      version: data.tag_name.replace(/^v/, ''),
      title: data.name?.trim() || data.tag_name,
      notes: (data.body ?? '').trim(),
      publishedAt: data.published_at ?? '',
      url: data.html_url ?? '',
      assets: (data.assets ?? [])
        .filter(asset => asset.browser_download_url)
        .map(asset => ({
          name: asset.name ?? 'download',
          size: asset.size ?? 0,
          url: asset.browser_download_url as string,
        })),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}
