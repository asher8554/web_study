import { KnowledgeStore } from "@/types/knowledge";

const CONFIG_KEY = "knowledge-github-config";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  filePath: string;
}

export function getGitHubConfig(): GitHubConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const data = sessionStorage.getItem(CONFIG_KEY);
    if (!data) return null;
    return JSON.parse(data) as GitHubConfig;
  } catch {
    return null;
  }
}

export function setGitHubConfig(config: GitHubConfig): void {
  sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearGitHubConfig(): void {
  sessionStorage.removeItem(CONFIG_KEY);
}

export function isGitHubConfigured(): boolean {
  const config = getGitHubConfig();
  return !!(config?.token && config?.owner && config?.repo);
}

async function githubFetch(
  config: GitHubConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function fetchFromGitHub(): Promise<KnowledgeStore | null> {
  const config = getGitHubConfig();
  if (!config) return null;

  try {
    const res = await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${config.filePath}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        await initGitHubFile(config);
        return { items: [] };
      }
      return null;
    }

    const data = await res.json();
    const content = atob(data.content.replace(/\n/g, ""));
    return JSON.parse(content) as KnowledgeStore;
  } catch {
    return null;
  }
}

export async function commitToGitHub(
  store: KnowledgeStore
): Promise<boolean> {
  const config = getGitHubConfig();
  if (!config) return false;

  try {
    let sha: string | undefined;

    const existing = await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${config.filePath}`
    );

    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }

    const content = btoa(JSON.stringify(store, null, 2));

    const body: Record<string, string> = {
      message: `chore: update knowledge-log [${new Date().toISOString()}]`,
      content,
    };
    if (sha) body.sha = sha;

    const res = await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${config.filePath}`,
      { method: "PUT", body: JSON.stringify(body) }
    );

    return res.ok;
  } catch {
    return false;
  }
}

async function initGitHubFile(config: GitHubConfig): Promise<void> {
  try {
    const res = await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${config.filePath}`
    );
    if (res.ok) return;

    const content = btoa(JSON.stringify({ items: [] }, null, 2));
    await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${config.filePath}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: "chore: initialize knowledge-log data",
          content,
        }),
      }
    );
  } catch {
    // ignore
  }
}

export async function testGitHubConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const config = getGitHubConfig();
  if (!config) return { ok: false, message: "설정 없음" };

  try {
    const res = await githubFetch(config, "/user");
    if (!res.ok) return { ok: false, message: "토큰 검증 실패" };

    const repoRes = await githubFetch(
      config,
      `/repos/${config.owner}/${config.repo}`
    );
    if (!repoRes.ok) return { ok: false, message: "레포 접근 실패" };

    return { ok: true, message: "연결 성공" };
  } catch {
    return { ok: false, message: "네트워크 오류" };
  }
}
