// 백엔드 응답 타입. docs/api.md 와 맞춘다.
export type HealthResponse = {
  status: "ok";
  database: "up" | "down";
  timestamp: string;
};
