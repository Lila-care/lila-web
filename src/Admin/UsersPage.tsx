import { useState } from "react";
import AdminLayout from "@/Admin/AdminLayout";
import { UsersListSection } from "@/Admin/UsersListSection";
import { TemplateSection } from "@/Admin/TemplateSection";
import { UserDetailPanel } from "@/Admin/UserDetailPanel";
import { useSelectedUser } from "@/Admin/useAdminUrl";
import { LedgerTabs, type LedgerTab } from "@/Admin/ledger/LedgerTabs";
import { Breadcrumb } from "@/Admin/ledger/Breadcrumb";
import { tabId, tabPanelId } from "@/Admin/ledger/tabIds";

type UsersTabKey = "users" | "template";

const TABS: LedgerTab<UsersTabKey>[] = [
  { id: "users", label: "Usuarias" },
  { id: "template", label: "Template" },
];

function UsersPage() {
  const [activeTab, setActiveTab] = useState<UsersTabKey>("users");
  const { userId, close } = useSelectedUser();

  return (
    <AdminLayout>
      <div
        className="flex min-h-full flex-col gap-6 px-4 pt-6 pb-10 md:px-8 md:pt-8 lg:pt-10 lg:pr-10 lg:pb-16 lg:pl-16"
        data-testid="users-page"
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/admin/dashboard" },
              { label: "Usuarias" },
            ]}
          />
          <h1 className="type-h4-strong text-text-primary">Usuarias</h1>
        </div>
        <LedgerTabs
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          label="Secciones de usuarias"
        />
        <div
          role="tabpanel"
          id={tabPanelId(activeTab)}
          aria-labelledby={tabId(activeTab)}
          className="min-w-0"
        >
          {activeTab === "users" && <UsersListSection />}
          {activeTab === "template" && <TemplateSection />}
        </div>
        {userId && <UserDetailPanel userId={userId} onClose={close} />}
      </div>
    </AdminLayout>
  );
}

export default UsersPage;
