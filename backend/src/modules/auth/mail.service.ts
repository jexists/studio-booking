import { Injectable, Logger } from '@nestjs/common';

// 초대 메일 발송 (Resend HTTP API, 패키지 없이 fetch).
// RESEND_API_KEY 가 없거나 실패하면 false 를 돌려주고, 화면에서 초대 링크를 복사해 전달한다.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInvite(to: string, link: string, inviter: string): Promise<boolean> {
    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.MAIL_FROM || 'onboarding@resend.dev',
          to,
          subject: '[흙의 온도] 직원 초대',
          html: `<p>${inviter} 님이 흙의 온도 직원으로 초대했어요.</p><p><a href="${link}">비밀번호 설정하기</a></p><p>링크는 72시간 동안 한 번만 쓸 수 있어요.</p>`,
        }),
      });
      if (!res.ok) this.logger.warn(`초대 메일 실패 ${res.status}: ${await res.text()}`);
      return res.ok;
    } catch (e) {
      this.logger.warn(`초대 메일 실패: ${(e as Error).message}`);
      return false;
    }
  }
}
