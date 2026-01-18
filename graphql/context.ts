import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface GraphQLContext {
  userId?: string;
  supabase: SupabaseClient<Database>;
}

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // אם אתה צריך login/logout שמעדכן cookies, תצטרך לממש set/remove דרך NextResponse
        set() {},
        remove() {},
      },
    }
  );
}

export async function createContext(): Promise<GraphQLContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    userId: session?.user?.id,
    supabase,
  };
}
