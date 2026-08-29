"use client";

import { useState, useEffect, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { KnowledgeItem, Difficulty } from "@/types/knowledge";
import {
  getAllItems,
  createItem,
  deleteItem,
  searchItems,
  getAllTags,
  exportToJSON,
  importFromJSON,
  syncFromGitHub,
  syncToGitHub,
} from "@/lib/storage";
import {
  getGitHubConfig,
  setGitHubConfig,
  clearGitHubConfig,
  isGitHubConfigured,
  testGitHubConnection,
  GitHubConfig,
} from "@/lib/github";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function Home() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [showDetail, setShowDetail] = useState<KnowledgeItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  useEffect(() => {
    setItems(getAllItems());
    setGithubConnected(isGitHubConfigured());

    if (isGitHubConfigured()) {
      setSyncStatus("동기화 중...");
      syncFromGitHub().then((ok) => {
        setItems(getAllItems());
        setSyncStatus(ok ? "동기화 완료" : "동기화 실패");
        setTimeout(() => setSyncStatus(""), 3000);
      });
    }
  }, []);

  const tags = useMemo(() => getAllTags(), [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (searchQuery) {
      result = searchItems(searchQuery);
    }
    if (selectedTag) {
      result = result.filter((item) => item.tags.includes(selectedTag));
    }
    return result;
  }, [items, searchQuery, selectedTag]);

  const handleDelete = (id: string) => {
    if (confirm("이 지식을 삭제하시겠습니까?")) {
      deleteItem(id);
      setItems(getAllItems());
      setShowDetail(null);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setShowDetail(null);
    setShowEditor(true);
  };

  const getDifficultyLabel = (d: Difficulty) => {
    switch (d) {
      case "beginner": return "초급";
      case "intermediate": return "중급";
      case "advanced": return "고급";
    }
  };

  const handleBackup = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-log-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        if (importFromJSON(json)) {
          setItems(getAllItems());
          alert("복원 완료");
        } else {
          alert("복원 실패");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleManualSync = async () => {
    setSyncStatus("동기화 중...");
    const ok = await syncFromGitHub();
    setItems(getAllItems());
    setSyncStatus(ok ? "동기화 완료" : "동기화 실패");
    setTimeout(() => setSyncStatus(""), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <h1
            className="text-xl font-bold tracking-tight cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
            onClick={() => { setShowDetail(null); setSelectedTag(null); setSearchQuery(""); }}
          >
            Knowledge Log
          </h1>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass pl-10"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <button onClick={handleCreate} className="btn-primary">
            글쓰기
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 p-5 hidden md:block">
          <div className="glass-card p-5 space-y-6 sticky top-24">
            {/* Stats */}
            <div>
              <h3 className="text-xs font-semibold opacity-40 uppercase tracking-wider mb-3">
                통계
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-60">전체 항목</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                {selectedTag && (
                  <div className="flex justify-between">
                    <span className="opacity-60">검색 결과</span>
                    <span className="font-semibold">{filteredItems.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-semibold opacity-40 uppercase tracking-wider mb-3">
                태그
              </h3>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`tag ${selectedTag === tag ? "tag-active" : ""}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-40">태그 없음</p>
              )}
            </div>

            {/* GitHub Sync */}
            <div>
              <h3 className="text-xs font-semibold opacity-40 uppercase tracking-wider mb-3">
                GitHub 연동
              </h3>
              {githubConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    <span className="opacity-60">연결됨</span>
                  </div>
                  {syncStatus && (
                    <p className="text-xs opacity-50">{syncStatus}</p>
                  )}
                  <div className="flex gap-1.5">
                    <button onClick={handleManualSync} className="btn-ghost text-xs flex-1 whitespace-nowrap">
                      동기화
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="btn-ghost text-xs flex-1 whitespace-nowrap"
                    >
                      설정
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSettings(true)}
                  className="btn-ghost text-xs w-full"
                >
                  GitHub 연결 설정
                </button>
              )}
            </div>

            {/* Backup / Restore */}
            <div>
              <h3 className="text-xs font-semibold opacity-40 uppercase tracking-wider mb-3">
                데이터
              </h3>
              <div className="flex gap-2">
                <button onClick={handleBackup} className="btn-ghost text-xs flex-1">
                  백업
                </button>
                <button onClick={handleRestore} className="btn-ghost text-xs flex-1">
                  복원
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">
          {showDetail ? (
            <DetailPage
              item={showDetail}
              onBack={() => setShowDetail(null)}
              onEdit={() => handleEdit(showDetail)}
              onDelete={() => handleDelete(showDetail.id)}
            />
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="opacity-40 mb-4">
                {searchQuery || selectedTag
                  ? "검색 결과가 없습니다"
                  : "작성된 글이 없습니다"}
              </p>
              {!searchQuery && !selectedTag && (
                <button onClick={handleCreate} className="btn-primary">
                  첫 글쓰기
                </button>
              )}
            </div>
          ) : (
            <Virtuoso
              className="h-[calc(100vh-10rem)]"
              totalCount={filteredItems.length}
              itemContent={(index) => {
                const item = filteredItems[index];
                return (
                  <article
                    className="glass-card p-5 mb-3 cursor-pointer card-hover"
                    onClick={() => setShowDetail(item)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge badge-${item.difficulty}`}>
                        {getDifficultyLabel(item.difficulty)}
                      </span>
                      <span className="text-xs opacity-40">
                        {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold mb-2 hover:text-indigo-500 transition-colors">
                      {item.title}
                    </h2>
                    {item.summary && (
                      <p className="text-sm opacity-60 line-clamp-2 mb-3">
                        {item.summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tag);
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              }}
            />
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <EditorModal
          item={editingItem}
          onClose={() => setShowEditor(false)}
          onSave={() => {
            setItems(getAllItems());
            setShowEditor(false);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setGithubConnected(isGitHubConfigured());
            setShowSettings(false);
            handleManualSync();
          }}
        />
      )}
    </div>
  );
}

/* ===== Detail Page ===== */
function DetailPage({
  item,
  onBack,
  onEdit,
  onDelete,
}: {
  item: KnowledgeItem;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getDifficultyLabel = (d: Difficulty) => {
    switch (d) {
      case "beginner": return "초급";
      case "intermediate": return "중급";
      case "advanced": return "고급";
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm opacity-50 hover:opacity-100 transition-opacity mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </button>

      <header className="glass-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge badge-${item.difficulty}`}>
            {getDifficultyLabel(item.difficulty)}
          </span>
          <span className="text-sm opacity-40">
            {new Date(item.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-3">{item.title}</h1>
        {item.summary && (
          <p className="opacity-60 leading-relaxed mb-3">{item.summary}</p>
        )}
        {item.source && (
          <p className="text-sm opacity-40">출처: {item.source}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </header>

      <div className="glass-card p-6 mb-4">
        <MarkdownPreview content={item.content} />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onEdit} className="btn-ghost text-sm">
          수정
        </button>
        <button
          onClick={onDelete}
          className="h-10 px-5 text-sm font-medium rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* ===== Editor Modal ===== */
function EditorModal({
  item,
  onClose,
  onSave,
}: {
  item: KnowledgeItem | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [title, setTitle] = useState(item?.title || "");
  const [content, setContent] = useState(item?.content || "");
  const [summary, setSummary] = useState(item?.summary || "");
  const [source, setSource] = useState(item?.source || "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    item?.difficulty || "beginner"
  );
  const [tagsInput, setTagsInput] = useState(item?.tags.join(", ") || "");

  const handleSave = () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (item) {
      import("@/lib/storage").then(({ updateItem }) => {
        updateItem(item.id, { title, content, summary, source, difficulty, tags });
        onSave();
      });
    } else {
      import("@/lib/storage").then(({ createItem }) => {
        createItem({ title, content, summary, source, difficulty, tags });
        onSave();
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-4xl glass-strong rounded-2xl mb-20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-lg font-semibold">
            {item ? "글 수정" : "새 글쓰기"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors">
            <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:opacity-30"
          />

          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="요약을 입력하세요 (선택)"
            className="w-full text-sm bg-transparent border-none outline-none opacity-60 placeholder:opacity-30"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
                출처
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="URL, 책 제목 등"
                className="input-glass"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
                난이도
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="select-glass"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
          </div>

          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="태그를 쉼표로 구분하여 입력하세요"
            className="input-glass"
          />

          <div>
            <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
              본문
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] opacity-30 mb-1 uppercase">Editor</p>
                <div className="glass-card p-1 overflow-hidden">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="마크다운으로 작성하세요"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] opacity-30 mb-1 uppercase">Preview</p>
                <div className="glass-card p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                  {content ? (
                    <MarkdownPreview content={content} />
                  ) : (
                    <p className="text-sm opacity-30">미리보기</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--glass-border)]">
          <button onClick={onClose} className="btn-ghost">
            취소
          </button>
          <button onClick={handleSave} className="btn-primary">
            {item ? "수정" : "발행"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Settings Modal ===== */
function SettingsModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = getGitHubConfig();
  const [token, setToken] = useState(existing?.token || "");
  const [owner, setOwner] = useState(existing?.owner || "");
  const [repo, setRepo] = useState(existing?.repo || "");
  const [filePath, setFilePath] = useState(existing?.filePath || "data/items.json");
  const [testResult, setTestResult] = useState<string>("");
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    setGitHubConfig({ token, owner, repo, filePath });
    const result = await testGitHubConnection();
    setTestResult(result.message);
    setTesting(false);
  };

  const handleSave = () => {
    if (!token || !owner || !repo) {
      alert("모든 필드를 입력해주세요");
      return;
    }
    setGitHubConfig({ token, owner, repo, filePath });
    onSaved();
  };

  const handleDisconnect = () => {
    clearGitHubConfig();
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-lg glass-strong rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
          <h2 className="text-lg font-semibold">GitHub 연동 설정</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors">
            <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs opacity-50 leading-relaxed">
            GitHub Personal Access Token (repo scope)이 필요합니다.
            <br />
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=knowledge-log"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              토큰 발급 받기 →
            </a>
          </p>

          <div>
            <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
              Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="input-glass"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
                레포 소유자
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="asher8554"
                className="input-glass"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
                레포 이름
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="web_study"
                className="input-glass"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-40 uppercase tracking-wider mb-1.5">
              저장 경로
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="data/items.json"
              className="input-glass"
            />
          </div>

          {testResult && (
            <p className="text-xs opacity-60">{testResult}</p>
          )}
        </div>

        <div className="flex justify-between px-6 py-4 border-t border-[var(--glass-border)]">
          {existing ? (
            <button onClick={handleDisconnect} className="btn-ghost text-red-500 text-sm">
              연동 해제
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button onClick={handleTest} disabled={testing} className="btn-ghost text-sm">
              {testing ? "테스트 중..." : "연결 테스트"}
            </button>
            <button onClick={handleSave} className="btn-primary text-sm">
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
