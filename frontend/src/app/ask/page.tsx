import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageTitle } from "@/components/ui/PageTitle";

// PUB-06 흙·유약 질문. 자료 근거 답변(RAG)은 다음 단계로 미뤄 두었다.
export default function AskPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageTitle>흙·유약 질문</PageTitle>
      <EmptyState
        title="개발 중이에요"
        action={
          <ButtonLink href="/" variant="secondary">
            첫 화면으로
          </ButtonLink>
        }
      />
    </div>
  );
}
