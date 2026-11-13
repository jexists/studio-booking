// pnpm install 후 실행: .env 파일이 없으면 .env.example 을 복사한다. 이미 있으면 건드리지 않는다.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["backend/.env.example", "backend/.env"],
  ["frontend/.env.example", "frontend/.env.local"],
];

for (const [example, target] of pairs) {
  const from = join(root, example);
  const to = join(root, target);
  if (existsSync(from) && !existsSync(to)) {
    copyFileSync(from, to);
    console.log(`[init-env] ${target} 생성 (${example} 복사)`);
  }
}
