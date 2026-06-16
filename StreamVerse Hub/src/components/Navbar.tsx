import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Upload, LogOut, User, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide chrome on /watch
  if (pathname.startsWith("/watch/")) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-colors duration-300",
        scrolled ? "bg-background/95 backdrop-blur border-b border-border" : "bg-gradient-to-b from-black/80 to-transparent",
      )}
    >
      <div className="flex items-center gap-8 px-6 md:px-12 h-16">
        <Link to="/" className="flex items-center">
          <span className="font-display text-3xl tracking-wider text-primary">STREAMFLIX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className="text-foreground/90 hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground font-semibold" }}>Home</Link>
          <Link to="/browse/$genre" params={{ genre: "action" }} className="text-foreground/70 hover:text-foreground">Action</Link>
          <Link to="/browse/$genre" params={{ genre: "comedy" }} className="text-foreground/70 hover:text-foreground">Comedy</Link>
          <Link to="/browse/$genre" params={{ genre: "drama" }} className="text-foreground/70 hover:text-foreground">Drama</Link>
          <Link to="/browse/$genre" params={{ genre: "horror" }} className="text-foreground/70 hover:text-foreground">Horror</Link>
          {user && (
            <Link to="/my-list" className="text-foreground/70 hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>My List</Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/search" className="p-2 hover:text-primary" aria-label="Search">
            <Search className="size-5" />
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="size-9 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {(profile?.display_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => navigate({ to: "/upload" })}>
                  <Upload className="mr-2 size-4" /> Upload video
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/studio" })}>
                  <User className="mr-2 size-4" /> Creator studio
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/my-list" })}>
                  <Bookmark className="mr-2 size-4" /> My list
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}