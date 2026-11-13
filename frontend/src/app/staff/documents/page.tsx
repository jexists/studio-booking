import { EmptyState, PageTitle } from "@/components/ui/PageTitle";

// STF-08 자료 관리. 자료 업로드·검색 반영은 다음 단계로 미뤄 두었다.
export default function DocumentsPage() {
  return (
    <>
      <PageTitle>자료</PageTitle>
      <EmptyState title="개발 중이에요" />
    </>
  );
}
