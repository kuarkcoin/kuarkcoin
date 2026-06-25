import { supabaseServer } from "../../../lib/supabaseServer.ts";

type SupabaseClient = ReturnType<typeof supabaseServer>;
let supabaseFactory: () => SupabaseClient = supabaseServer;

export function getSignalsSupabaseClient() {
  return supabaseFactory();
}

export function setSignalsSupabaseFactory(factory: () => SupabaseClient) {
  supabaseFactory = factory;
}

export function resetSignalsSupabaseFactory() {
  supabaseFactory = supabaseServer;
}
