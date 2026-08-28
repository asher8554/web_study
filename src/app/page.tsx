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
} from "@/lib/storage";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function Home() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [showDetail, setShowDetail] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    setItems(getAllItems());
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
    a.download = `knowledge-log-backup-${new Date().toISOString().split("T")[0]}.json`;
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
          alert("복원이 완료되었습니다");
        } else {
          alert("복원에 실패했습니다");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <h1
            className="text-lg font-bold tracking-tight cursor-pointer"
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
                className="w-full h-9 pl-9 pr-4 text-sm bg-[var(--accent-light)] border border-[var(--border)] rounded-sm focus:outline-none focus:border-[var(--text-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="h-9 px-4 text-sm font-medium bg-[var(--accent)] text-[var(--card-bg)] rounded-sm hover:opacity-90 transition-opacity"
          >
            글쓰기
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-5 hidden md:block">
          <div className="space-y-6">
            {/* Stats */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                통계
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">전체 항목</span>
                  <span className="font-medium text-[var(--text-primary)]">{items.length}</span>
                </div>
                {selectedTag && (
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">검색 결과</span>
                    <span className="font-medium text-[var(--text-primary)]">{filteredItems.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
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
                <p className="text-xs text-[var(--text-muted)]">태그 없음</p>
              )}
            </div>

            {/* Backup/Restore */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                데이터
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleBackup}
                  className="flex-1 h-8 text-xs border border-[var(--border)] rounded-sm hover:bg-[var(--accent-light)] transition-colors"
                >
                  백업
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 h-8 text-xs border border-[var(--border)] rounded-sm hover:bg-[var(--accent-light)] transition-colors"
                >
                  복원
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {showDetail ? (
            /* Detail View */
            <DetailPage
              item={showDetail}
              onBack={() => setShowDetail(null)}
              onEdit={() => handleEdit(showDetail)}
              onDelete={() => handleDelete(showDetail.id)}
            />
          ) : (
            /* List View */
            <div className="p-6">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-[var(--text-muted)] mb-4">
                    {searchQuery || selectedTag
                      ? "검색 결과가 없습니다"
                      : "작성된 글이 없습니다"}
                  </p>
                  {!searchQuery && !selectedTag && (
                    <button
                      onClick={handleCreate}
                      className="h-10 px-6 text-sm font-medium bg-[var(--accent)] text-[var(--card-bg)] rounded-sm hover:opacity-90"
                    >
                      첫 글쓰기
                    </button>
                  )}
                </div>
              ) : (
                <Virtuoso
                  className="h-[calc(100vh-8rem)]"
                  totalCount={filteredItems.length}
                  itemContent={(index) => {
                    const item = filteredItems[index];
                    return (
                      <article
                        className="py-6 border-b border-[var(--border)] cursor-pointer card-hover"
                        onClick={() => setShowDetail(item)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-${item.difficulty}`}>
                            {getDifficultyLabel(item.difficulty)}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2 hover:underline">
                          {item.title}
                        </h2>
                        {item.summary && (
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
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
            </div>
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
    </div>
  );
}

/* Detail Page Component */
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
    <div className="max-w-3xl mx-auto p-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </button>

      {/* Article header */}
      <header className="mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge badge-${item.difficulty}`}>
            {getDifficultyLabel(item.difficulty)}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            {new Date(item.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          {item.title}
        </h1>
        {item.summary && (
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {item.summary}
          </p>
        )}
        {item.source && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            출처: {item.source}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </header>

      {/* Article content */}
      <div className="mb-8">
        <MarkdownPreview content={item.content} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-6 border-t border-[var(--border)]">
        <button
          onClick={onEdit}
          className="h-9 px-4 text-sm border border-[var(--border)] rounded-sm hover:bg-[var(--accent-light)] transition-colors"
        >
          수정
        </button>
        <button
          onClick={onDelete}
          className="h-9 px-4 text-sm border border-red-300 text-red-600 rounded-sm hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* Editor Modal Component */
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border)] rounded-sm mb-20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {item ? "글 수정" : "새 글쓰기"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--accent-light)] rounded transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />

          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="요약을 입력하세요 (선택)"
            className="w-full text-sm bg-transparent border-none outline-none text-[var(--text-secondary)] placeholder:text-[var(--text-muted)]"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                출처
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="URL, 책 제목 등"
                className="w-full h-9 px-3 text-sm bg-[var(--accent-light)] border border-[var(--border)] rounded-sm outline-none focus:border-[var(--text-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                난이도
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full h-9 px-3 text-sm bg-[var(--accent-light)] border border-[var(--border)] rounded-sm outline-none text-[var(--text-primary)]"
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
            className="w-full h-9 px-3 text-sm bg-[var(--accent-light)] border border-[var(--border)] rounded-sm outline-none focus:border-[var(--text-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              본문
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase">Editor</p>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="마크다운으로 작성하세요"
                />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase">Preview</p>
                <div className="rounded-sm border border-[var(--border)] p-4 min-h-[300px] max-h-[500px] overflow-y-auto bg-[var(--accent-light)]">
                  {content ? (
                    <MarkdownPreview content={content} />
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">미리보기</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="h-9 px-5 text-sm border border-[var(--border)] rounded-sm hover:bg-[var(--accent-light)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="h-9 px-5 text-sm font-medium bg-[var(--accent)] text-[var(--card-bg)] rounded-sm hover:opacity-90 transition-opacity"
          >
            {item ? "수정" : "발행"}
          </button>
        </div>
      </div>
    </div>
  );
}
