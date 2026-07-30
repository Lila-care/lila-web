import AppShell from "@/components/AppShell/AppShell";
import { useAuth } from "@/auth/AuthContext";
import { useProfile } from "@/Profile/useProfile";
import CreateAccountBanner from "@/Profile/CreateAccountBanner";
import CycleCard from "@/Profile/CycleCard";
import NotificationsCard from "@/Profile/NotificationsCard";
import DataPrivacyCard from "@/Profile/DataPrivacyCard";

function ProfilePage() {
  const { token } = useAuth();
  const { summary, loading, error, saving, saveError, saveSuccess, saveCycleInfo } =
    useProfile();

  return (
    <AppShell>
      <main className="px-6 md:px-16 pt-14 pb-16 max-w-[920px]">
        <h1
          className="font-bold text-3xl md:text-[44px] mb-3 -tracking-[0.5px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Perfil
        </h1>
        <p className="text-base mb-8 max-w-[560px]" style={{ color: "rgba(61,43,80,0.65)" }}>
          Ajusta Lila a tu ritmo.
        </p>

        {!token && <CreateAccountBanner />}

        {loading && (
          <div
            data-testid="profile-loading"
            className="bg-white rounded-3xl p-10 mb-7 animate-pulse"
            style={{ border: "1px solid rgba(61,43,80,0.07)" }}
          >
            <div className="h-6 w-40 bg-black/5 rounded mb-4" />
            <div className="h-10 w-full bg-black/5 rounded" />
          </div>
        )}

        {!loading && error && (
          <div
            data-testid="profile-error"
            className="bg-white rounded-3xl p-8 mb-7 text-sm"
            style={{ border: "1px solid rgba(139,58,82,0.2)", color: "#8B3A52" }}
          >
            No pudimos cargar tu ciclo. {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <CycleCard
                summary={summary}
                saving={saving}
                saveError={saveError}
                saveSuccess={saveSuccess}
                onSave={saveCycleInfo}
              />
              <NotificationsCard />
            </div>

            <DataPrivacyCard />
          </>
        )}
      </main>
    </AppShell>
  );
}

export default ProfilePage;
