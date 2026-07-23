import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/")({
  ssr: false,
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", data.user.id)
        .maybeSingle();
      navigate({ to: p?.onboarded ? "/app" : "/onboarding" });
    })();
  }, [navigate]);

  return (
    <main className="min-h-screen grain flex items-center justify-center">
      <div className="flex items-center gap-3 opacity-70">
        <img src="/betterorder-logo.png" alt="" width={36} height={36} className="h-9 w-9" />
        <span className="text-serif text-2xl">Loading…</span>
      </div>
    </main>
  );
}
