"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateInput, Field, Input, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { api } from "@/lib/api";
import { toast } from "@/lib/notify";
import { CAPACITY, KIND_LABEL, toastError, type Kind, type Program } from "./types";

const EMPTY = { program: "ONEDAY" as Program, kind: "HAND" as Kind, date: "", start: "", end: "", title: "", courseName: "" };

// STF-04 일정 추가. 정원은 종류로 정해진다(일반 8, 물레 6). 정규반은 4주 일정이 한 번에 생긴다.
export function CreateSessionSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setF((prev) => ({ ...prev, ...patch }));

  const close = () => {
    setF(EMPTY);
    onClose();
  };

  const submit = async () => {
    if (!f.date) return toast("날짜를 골라 주세요", "error");
    if (!f.start || !f.end) return toast("시작·종료 시간을 입력해 주세요", "error");
    if (f.end <= f.start) return toast("종료 시간이 시작보다 늦어야 해요", "error");
    if (f.program === "ONEDAY" && !f.title.trim()) return toast("제목을 입력해 주세요", "error");
    if (f.program === "REGULAR" && !f.courseName.trim()) return toast("반 이름을 입력해 주세요", "error");
    setSaving(true);
    try {
      const body =
        f.program === "ONEDAY"
          ? { program: f.program, kind: f.kind, date: f.date, start: f.start, end: f.end, title: f.title.trim() }
          : { program: f.program, kind: f.kind, date: f.date, start: f.start, end: f.end, courseName: f.courseName.trim() };
      const r = await api<{ sessionIds: number[] }>("/staff/classes", { method: "POST", body: JSON.stringify(body) });
      toast(r.sessionIds.length > 1 ? `정규반 일정 ${r.sessionIds.length}회를 만들었어요` : "일정을 추가했어요", "success");
      onCreated();
      close();
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="일정 추가"
      footer={
        <Button full loading={saving} onClick={submit}>
          {f.program === "REGULAR" ? "4주 일정 만들기" : "추가하기"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="구분" required>
            {(id) => (
              <Select id={id} value={f.program} onChange={(e) => set({ program: e.target.value as Program })}>
                <option value="ONEDAY">원데이</option>
                <option value="REGULAR">정규반</option>
              </Select>
            )}
          </Field>
          <Field label={`종류 · 정원 ${CAPACITY[f.kind]}명`} required>
            {(id) => (
              <Select id={id} value={f.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
                {(["HAND", "WHEEL"] as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]} ({CAPACITY[k]}명)
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={f.program === "REGULAR" ? "첫 수업 날짜" : "날짜"} required>
          {(id) => <DateInput id={id} value={f.date} onChange={(e) => set({ date: e.target.value })} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작" required>
            {(id) => <Input id={id} type="time" className="tabular" value={f.start} onChange={(e) => set({ start: e.target.value })} />}
          </Field>
          <Field label="종료" required>
            {(id) => <Input id={id} type="time" className="tabular" value={f.end} onChange={(e) => set({ end: e.target.value })} />}
          </Field>
        </div>
        {f.program === "ONEDAY" ? (
          <Field label="제목" required>
            {(id) => <Input id={id} value={f.title} maxLength={40} placeholder="원데이 핸드빌딩" onChange={(e) => set({ title: e.target.value })} />}
          </Field>
        ) : (
          <Field label="반 이름" required>
            {(id) => <Input id={id} value={f.courseName} maxLength={40} placeholder="화 물레반 12월기" onChange={(e) => set({ courseName: e.target.value })} />}
          </Field>
        )}
      </div>
    </Sheet>
  );
}
