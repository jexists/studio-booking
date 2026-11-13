import { StaffShell } from "@/features/staff/StaffShell";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <StaffShell>{children}</StaffShell>;
}
