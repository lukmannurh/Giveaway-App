import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth/UserMenu";
import { SignInButton } from "@/components/auth/SignInButton";
import type { User } from "@/lib/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Header — Server Component.
 * Fetches the current user server-side and renders either UserMenu or a sign-in link.
 */
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let profile: User | null = null;
  if (authUser) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();
      
    if (data) {
      profile = data as User;
    } else {
      // Fallback if user exists in auth but not in our public.users table yet
      profile = {
        id: authUser.id,
        email: authUser.email || "",
        username: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
        avatar_url: authUser.user_metadata?.avatar_url || null,
        created_at: authUser.created_at,
        credits: authUser.user_metadata?.is_guest ? 20 : 100,
      };
    }
  }

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "var(--color-background)",
        borderBottom: "3px solid var(--color-border)",
        boxShadow: "0 3px 0px var(--color-border)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          id="header-logo"
          className="flex items-center gap-2 text-decoration-none"
          aria-label="Giveaway App home"
        >
          <span
            className="flex items-center justify-center w-8 h-8 text-base border-2 border-[var(--color-border)]"
            style={{ background: "var(--color-accent)", boxShadow: "2px 2px 0px var(--color-border)" }}
            aria-hidden="true"
          >
            🎁
          </span>
          <span
            className="font-black text-lg hidden sm:block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Giveaway
          </span>
        </Link>

        {/* Nav links — desktop only */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          <Link href="/" className="neo-btn neo-btn-ghost neo-btn-sm" id="nav-home">
            Home
          </Link>
          <Link href="/rooms/create" className="neo-btn neo-btn-ghost neo-btn-sm" id="nav-create">
            Create
          </Link>
          <Link href="/rooms/history" className="neo-btn neo-btn-ghost neo-btn-sm" id="nav-history">
            History
          </Link>
          {(profile as any)?.role === "admin" && (
            <Link href="/admin" className="neo-btn neo-btn-primary neo-btn-sm ml-2" id="nav-admin">
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <div className="flex items-center gap-1 font-bold text-sm bg-[var(--color-muted)] px-3 py-1.5 border-2 border-[var(--color-border)]" style={{ boxShadow: "2px 2px 0px var(--color-border)" }}>
                <span>💰</span>
                <span>{profile.credits} Credits</span>
              </div>
              <UserMenu user={profile} />
            </>
          ) : (
            <SignInButton />
          )}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
