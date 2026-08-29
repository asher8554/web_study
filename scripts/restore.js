#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const GITHUB_API = "https://api.github.com";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("사용법:");
    console.log("  GITHUB_TOKEN=ghp_xxx node scripts/restore.js <json파일경로>");
    console.log("");
    console.log("예시:");
    console.log("  GITHUB_TOKEN=ghp_xxx node scripts/restore.js knowledge-log.json");
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN 환경변수가 필요합니다.");
    console.error("  GITHUB_TOKEN=ghp_xxx node scripts/restore.js <json파일>");
    process.exit(1);
  }

  const jsonPath = path.resolve(args[0]);
  if (!fs.existsSync(jsonPath)) {
    console.error(`파일을 찾을 수 없습니다: ${jsonPath}`);
    process.exit(1);
  }

  const owner = process.env.GITHUB_OWNER || "asher8554";
  const repo = process.env.GITHUB_REPO || "web_study";
  const filePath = process.env.GITHUB_FILE_PATH || "data/items.json";

  console.log(`파일 읽는 중: ${jsonPath}`);
  const raw = fs.readFileSync(jsonPath, "utf-8");
  let store;
  try {
    store = JSON.parse(raw);
  } catch {
    console.error("JSON 파싱 실패");
    process.exit(1);
  }

  if (!Array.isArray(store.items)) {
    console.error("items 배열이 없습니다");
    process.exit(1);
  }

  console.log(`${store.items.length}개 항목 발견`);

  console.log("GitHub에서 기존 파일 확인 중...");
  let sha = null;
  const existingRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (existingRes.ok) {
    const existingData = await existingRes.json();
    sha = existingData.sha;
    console.log("기존 파일 발견, 업데이트 모드");
  } else if (existingRes.status === 404) {
    console.log("파일 없음, 생성 모드");
  } else {
    console.error(`GitHub API 오류: ${existingRes.status}`);
    process.exit(1);
  }

  const content = Buffer.from(JSON.stringify(store, null, 2)).toString("base64");
  const body = {
    message: `chore: restore knowledge-log [${new Date().toISOString()}]`,
    content,
  };
  if (sha) body.sha = sha;

  console.log("GitHub에 업로드 중...");
  const uploadRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (uploadRes.ok) {
    console.log("완료! 사이트에서 확인하세요:");
    console.log(`  https://asher8554.github.io/web_study/`);
  } else {
    const err = await uploadRes.text();
    console.error(`업로드 실패: ${uploadRes.status}`);
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
