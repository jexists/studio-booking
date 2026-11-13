"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/notify";

type AskResult = {
  answer: string;
  isSafety: boolean;
  hasEvidence: boolean;
  sources: { title: string; page: number }[];
};

type Message = { id: number; role: "user" | "assistant"; text: string; result?: AskResult };

const EXAMPLES = ["분청이란?", "산청토로 만든 컵은 식기로 써도 되나요?", "유약 바른 작품 전자레인지에 넣어도 돼요?"];

// PUB-06. 자료 근거 질문을 채팅 형태로 주고받는다. 대화는 화면에만 두고 저장하지 않는다.
export function AskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // 입력 줄 수에 맞춰 높이를 늘린다(최대 약 6줄).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (!question) return;
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [question]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (loading) return;
    if (trimmed.length < 2) return toast("질문을 2자 이상 입력해 주세요", "error");
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    try {
      const result = await api<AskResult>("/ask", { method: "POST", body: JSON.stringify({ question: trimmed }) });
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", text: result.answer, result }]);
    } catch (error) {
      if (error instanceof ApiError && error.status !== 0) toast(error.message, "error");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(question);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageTitle>흙·유약 질문</PageTitle>

      <div className="flex min-h-[50vh] flex-col gap-6 pb-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 py-12 text-center">
            <Avatar large />
            <p className="text-lg font-semibold text-ink">무엇이 궁금하세요?</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => void send(example)}
                    className="min-h-10 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => (message.role === "user" ? <UserBubble key={message.id} text={message.text} /> : <AnswerBubble key={message.id} message={message} />))
        )}
        {loading && <Typing />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} noValidate className="sticky bottom-0 -mx-1 bg-bg px-1 pt-2 pb-4">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface py-2 pr-2 pl-4 shadow-float focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-subtle">
          <label htmlFor="ask-input" className="sr-only">궁금한 점</label>
          <textarea
            id="ask-input"
            ref={inputRef}
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="흙·유약·기법에 대해 물어보세요"
            maxLength={600}
            className="max-h-40 flex-1 resize-none bg-transparent py-2 text-base text-ink outline-none placeholder:text-muted"
            style={{ outline: "none" }}
          />
          <button
            type="submit"
            aria-label="보내기"
            disabled={loading || question.trim().length === 0}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:bg-line"
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 16V4M4.5 9.5L10 4l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function Avatar({ large = false }: { large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary ${large ? "size-14 text-lg" : "size-8 text-sm"}`}
    >
      흙
    </span>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-4 py-2.5 whitespace-pre-wrap text-white">{text}</p>
    </div>
  );
}

function AnswerBubble({ message }: { message: Message }) {
  const result = message.result;
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="flex max-w-[85%] min-w-0 flex-col gap-2">
        {result && (result.isSafety || !result.hasEvidence) && (
          <div className="flex gap-2">
            {result.isSafety && <Badge tone="warning">안전 관련</Badge>}
            {!result.hasEvidence && <Badge tone="warning">근거 확인 필요</Badge>}
          </div>
        )}
        <div className="rounded-xl rounded-tl-sm border border-line bg-surface px-4 py-3">
          <p className="leading-7 whitespace-pre-wrap text-ink">{message.text}</p>
        </div>
        {result &&
          (result.sources.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="근거 자료">
              {result.sources.map((source) => (
                <li key={`${source.title}-${source.page}`}>
                  <Badge tone="neutral">
                    {source.title} p.{source.page}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Notice>근거 자료가 충분하지 않아 공방 확인이 필요해요.</Notice>
          ))}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-3" aria-label="답변 작성 중">
      <Avatar />
      <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-line bg-surface px-4 py-4">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}
