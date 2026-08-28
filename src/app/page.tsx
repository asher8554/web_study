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
          alert("복원에 실패했습니다. 파일을 확인해주세요");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDelete = (id: string) => {
    if (confirm("이 지식을 삭제하시겠습니까?")) {
      deleteItem(id);
      setItems(getAllItems());
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const getDifficultyLabel = (d: Difficulty) => {
    switch (d) {
      case "beginner":
        return "초급";
      case "intermediate":
        return "중급";
      case "advanced":
        return "고급";
    }
  };

  const getDifficultyClass = (d: Difficulty) => {
    switch (d) {
      case "beginner":
        return "badge-beginner";
      case "intermediate":
        return "badge-intermediate";
      case "advanced":
        return "badge-advanced";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-sidebar flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">Knowledge Log</h1>
          <p className="text-sm text-foreground/60 mt-1">지식 정리 웹페이지</p>
        </div>

        {/* Tags */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">
            태그 ({tags.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
                className={`tag cursor-pointer transition-all ${
                  selectedTag === tag
                    ? "ring-2 ring-indigo-500 ring-offset-1"
                    : ""
                }`}
              >
                {tag}
              </button>
            ))}
            {tags.length === 0 && (
              <p className="text-xs text-foreground/40">아직 태그가 없습니다</p>
            )}
          </div>
        </div>

        {/* Stats & Backup */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="text-sm text-foreground/60 space-y-1">
            <div className="flex justify-between">
              <span>전체 항목</span>
              <span className="font-medium text-foreground">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>검색 결과</span>
              <span className="font-medium text-foreground">
                {filteredItems.length}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBackup}
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-foreground/70 transition-colors"
            >
              백업
            </button>
            <button
              onClick={handleRestore}
              className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-foreground/70 transition-colors"
            >
              복원
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="glass-header px-6 py-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="제목, 내용, 태그로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-foreground/40"
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            + 새 지식
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery || selectedTag
                  ? "검색 결과가 없습니다"
                  : "아직 지식이 없습니다"}
              </h3>
              <p className="text-foreground/60 mb-4">
                {searchQuery || selectedTag
                  ? "다른 검색어나 태그를 시도해보세요"
                  : "첫 번째 지식을 추가해보세요"}
              </p>
              {!searchQuery && !selectedTag && (
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
                >
                  + 지식 추가하기
                </button>
              )}
            </div>
          ) : (
            <Virtuoso
              className="h-full"
              totalCount={filteredItems.length}
              itemContent={(index) => {
                const item = filteredItems[index];
                return (
                  <div className="p-4">
                    <div className="glass-card p-5 hover:scale-[1.01] transition-transform">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                          {item.title}
                        </h3>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-white/20 text-foreground/60 hover:text-foreground transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-foreground/60 hover:text-red-500 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {item.summary && (
                        <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
                          {item.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getDifficultyClass(item.difficulty)}`}
                        >
                          {getDifficultyLabel(item.difficulty)}
                        </span>
                        {item.source && (
                          <span className="text-xs text-foreground/50 truncate max-w-[200px]">
                            {item.source}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="tag text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 text-xs text-foreground/40">
                        {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </main>

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

// Editor Modal Component
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
      // Update existing
      import("@/lib/storage").then(({ updateItem }) => {
        updateItem(item.id, { title, content, summary, source, difficulty, tags });
        onSave();
      });
    } else {
      // Create new
      import("@/lib/storage").then(({ createItem }) => {
        createItem({ title, content, summary, source, difficulty, tags });
        onSave();
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {item ? "지식 편집" : "새 지식 추가"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 text-foreground/60 hover:text-foreground transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="지식 제목을 입력하세요"
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              요약
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="간략한 요약을 입력하세요"
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              내용 (마크다운)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-foreground/50 mb-1">에디터</p>
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  placeholder="마크다운으로 내용을 입력하세요..."
                />
              </div>
              <div>
                <p className="text-xs text-foreground/50 mb-1">미리보기</p>
                <div className="rounded-xl border border-white/20 p-4 min-h-[300px] max-h-[500px] overflow-y-auto bg-white/30 dark:bg-white/5">
                  {content ? (
                    <MarkdownPreview content={content} />
                  ) : (
                    <p className="text-foreground/40 text-sm">
                      내용을 입력하면 미리보기가 표시됩니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                출처
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="URL, 책 제목 등"
                className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-foreground/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                난이도
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="JavaScript, React, TypeScript"
              className="w-full px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-foreground/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/20 text-foreground/70 hover:bg-white/10 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            {item ? "수정 완료" : "추가 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
