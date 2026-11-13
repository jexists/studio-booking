// DATABASE_URL 의 ?schema= 값으로 PostgreSQL 스키마를 만든다(이미 있으면 그대로). 접속 확인도 겸한다.
// 사용: pnpm db:schema (backend 디렉터리 기준)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const raw = process.env.DATABASE_URL;
if (!raw || raw.includes("USER:PASSWORD@HOST")) {
  console.error("[db:schema] backend/.env 에 실제 DATABASE_URL 을 넣으세요 (backend/.env.example 참고).");
  process.exit(1);
}

const schema = new URL(raw).searchParams.get("schema") ?? "public";
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  console.error(`[db:schema] 스키마 이름이 올바르지 않습니다: ${schema}`);
  process.exit(1);
}

const res = spawnSync("prisma", ["db", "execute", "--stdin", "--schema", "prisma/schema.prisma"], {
  input: `CREATE SCHEMA IF NOT EXISTS "${schema}";`,
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});
if (res.status !== 0) {
  console.error("[db:schema] DB 접속 또는 스키마 생성 실패. DATABASE_URL(주소·계정·sslmode)을 확인하세요.");
  process.exit(res.status ?? 1);
}
console.log(`[db:schema] 스키마 "${schema}" 준비 완료`);
