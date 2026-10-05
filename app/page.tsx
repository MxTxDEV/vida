"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { syncConfigured } from "@/lib/supabase";

/**
 * With accounts enabled the community is the home page (the sign-in gate in
 * the shell keeps signed-out visitors from reaching this). Without them the
 * personal dashboard stays the home page.
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (syncConfigured) router.replace("/social");
  }, [router]);
  return syncConfigured ? null : <Dashboard />;
}
