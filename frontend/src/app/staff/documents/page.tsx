"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/notify";

type DocumentItem = {
  id: number;
  title: string;
  kind: "SUPPLIER" | "NOTE";
  fileName: string;
  pageCount: number;
  status: "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  createdAt: string;
  _count: { chunks: number };
};

const STATUS: Record<DocumentItem["status"], { label: string; tone: "warning" | "success" | "error" }> = {
  PROCESSING: { label: "처리 중", tone: "warning" },
  READY: { label: "검색 가능", tone: "success" },
  FAILED: { label: "실패", tone: "error" },
};

// STF-08 자료 관리 — 올리는 즉시 청킹·임베딩하여 질문 검색에 반영한다.
export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"NOTE" | "SUPPLIER">("NOTE");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  const load = useCallback(() => {
    api<DocumentItem[]>("/staff/documents")
      .then(setItems)
      .catch((error) => {
        if (error instanceof ApiError && error.status !== 0) toast(error.message, "error");
      });
  }, []);

  useEffect(load, [load]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return toast("TXT 또는 PDF 파일을 선택해 주세요", "error");
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    if (title.trim()) body.append("title", title.trim());
    setUploading(true);
    try {
      await api<DocumentItem>("/staff/documents", { method: "POST", body });
      toast("자료를 검색에 반영했어요", "success");
      setFile(null);
      setTitle("");
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      load();
    } catch (error) {
      if (error instanceof ApiError && error.status !== 0) toast(error.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number) => {
    setRemoving(id);
    try {
      await api(`/staff/documents/${id}`, { method: "DELETE" });
      toast("자료를 삭제했어요", "success");
      load();
    } catch (error) {
      if (error instanceof ApiError && error.status !== 0) toast(error.message, "error");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageTitle>자료</PageTitle>
      <Card className="mb-8">
        <form onSubmit={upload} className="grid gap-5 md:grid-cols-2" noValidate>
          <Field label="자료 종류" required>
            {(id) => (
              <Select id={id} value={kind} onChange={(event) => setKind(event.target.value as "NOTE" | "SUPPLIER")}>
                <option value="NOTE">수업 노트</option>
                <option value="SUPPLIER">공급처 자료</option>
              </Select>
            )}
          </Field>
          <Field label="표시 이름">
            {(id) => <Input id={id} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="비우면 파일명을 사용해요" />}
          </Field>
          <div className="md:col-span-2">
            <Field label="파일" required>
              {(id) => <Input id={id} type="file" accept=".txt,.md,.pdf,text/plain,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />}
            </Field>
            <p className="mt-2 text-xs text-muted">TXT 또는 PDF, 최대 10MB</p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" loading={uploading}>업로드하고 검색에 반영</Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">등록한 자료</h2>
        {!items ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        ) : items.length === 0 ? (
          <EmptyState title="등록한 자료가 없어요" />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const status = STATUS[item.status];
              return (
                <Card key={item.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <Badge tone="neutral">{item.kind === "NOTE" ? "수업 노트" : "공급처"}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted">{item.fileName}</p>
                    {item.status === "READY" && <p className="mt-1 text-sm text-muted">{item.pageCount}쪽 · 검색 조각 {item._count.chunks}개</p>}
                    {item.status === "FAILED" && <div className="mt-2"><Notice tone="error">{item.error || "처리하지 못했어요"}</Notice></div>}
                  </div>
                  <Button size="sm" variant="destructive" loading={removing === item.id} onClick={() => remove(item.id)}>삭제</Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
