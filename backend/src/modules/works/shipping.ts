import type { Work } from '@prisma/client';

export const CARRIER_LABEL: Record<string, string> = { CJ: 'CJ대한통운', POST: '우체국택배', HANJIN: '한진택배', LOTTE: '롯데택배', LOGEN: '로젠택배' };

// 택배사 공식 배송조회 페이지 (송장번호를 넣어 연다). 실시간 연동이 아니라 링크만 만든다.
const TRACK_URL: Record<string, (no: string) => string> = {
  CJ: (no) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${no}`,
  POST: (no) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${no}`,
  HANJIN: (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${no}`,
  LOTTE: (no) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${no}`,
  LOGEN: (no) => `https://www.ilogen.com/web/personal/trace/${no}`,
};

// 택배 작품의 배송 상태. 택배로 정했지만 아직 기록이 없으면 준비중으로 본다.
export function shipView(w: Pick<Work, 'pickupMethod' | 'shipStatus' | 'carrier' | 'trackingNo'>) {
  const shipStatus = w.shipStatus ?? (w.pickupMethod === 'DELIVERY' ? 'PREPARING' : null);
  const url = w.carrier && w.trackingNo ? TRACK_URL[w.carrier]?.(w.trackingNo) ?? null : null;
  return { shipStatus, carrierName: w.carrier ? CARRIER_LABEL[w.carrier] ?? w.carrier : null, trackUrl: url };
}
