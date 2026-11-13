"use client";

import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import type { HealthResponse } from "@/types/api";

// 브라우저에서 백엔드 /api/health 를 호출해 프론트↔백엔드↔DB 연결을 보여준다.
export function HealthStatus() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<HealthResponse>("/health")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      <h2 className="mb-2 font-semibold">Backend Health</h2>
      <p className="mb-2 text-zinc-500">{API_URL}/health</p>
      {error && <p className="text-red-600">연결 실패: {error}</p>}
      {!error && !data && <p>확인 중…</p>}
      {data && (
        <ul data-testid="health-result" className="space-y-1">
          <li>API: {data.status}</li>
          <li>Database: {data.database}</li>
          <li className="text-zinc-500">{data.timestamp}</li>
        </ul>
      )}
    </section>
  );
}
