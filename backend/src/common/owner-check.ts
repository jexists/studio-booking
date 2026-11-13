import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

// 수강생 확인(예약번호 + 휴대폰 뒤 4자리) 반복 대입 막기.
// 같은 예약번호로 10분 안에 5번 틀리면 10분 동안 막는다. 서버 메모리에만 둔다(인스턴스 1개 기준).
const MAX_FAILS = 5;
const WINDOW = 10 * 60 * 1000;
const fails = new Map<string, { n: number; first: number; lockedUntil: number }>();

const NOT_FOUND = '예약 번호나 휴대폰 뒤 4자리가 맞지 않아요';

export function checkOwner<T extends { phoneLast4: string }>(r: T | null, reservationNo: string, phoneLast4: string): T {
  const key = reservationNo.trim().toUpperCase();
  const now = Date.now();
  const f = fails.get(key);
  if (f && f.lockedUntil > now) {
    throw new HttpException('여러 번 틀려서 잠시 막았어요. 10분 뒤에 다시 시도해 주세요', HttpStatus.TOO_MANY_REQUESTS);
  }
  if (!r || r.phoneLast4 !== phoneLast4) {
    const cur = f && now - f.first < WINDOW ? f : { n: 0, first: now, lockedUntil: 0 };
    cur.n += 1;
    if (cur.n >= MAX_FAILS) cur.lockedUntil = now + WINDOW;
    fails.set(key, cur);
    throw new NotFoundException(NOT_FOUND);
  }
  fails.delete(key);
  return r;
}
