import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLocalUserSession, auth as firebaseAuth } from "@/lib/firebase";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const localSession = getLocalUserSession();
    const fbUser = firebaseAuth?.currentUser ?? null;
    let suUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      suUser = data?.user;
    } catch {
      suUser = null;
    }

    const activeUser = suUser ?? fbUser ?? localSession;
    if (activeUser) {
      return { user: activeUser };
    }

    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
