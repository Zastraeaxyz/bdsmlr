
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import {
  Activity,
  Bell,
  Bookmark,
  ChevronDown,
  FileText,
  Home,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PenSquare,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
} from "lucide-solid";
import { useAuth } from "../lib/useAuth";
import { useBlogAvatar } from "../lib/blogAvatar";
import { BdsmlrIcon, DiscordIcon, GitHubIcon } from "./Icons";
import { DISCORD_URL, REPO_URL } from "../lib/links";
import { unreadCount, refreshMessageUnread } from "../lib/messageUnread";
import { activityUnreadCount, refreshActivityUnread } from "../lib/activityUnread";
import { changelogUnseenCount, refreshChangelogSeen } from "../lib/changelogSeen";
import { features } from "../lib/features";
import { trackEvent } from "../lib/analytics";
import OutageBanner from "./OutageBanner";
import RateLimitBanner from "./RateLimitBanner";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerLabel,
  DrawerPortal,
  DrawerTrigger,
} from "./ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";


interface HeaderProps {
  info?: string;
  children?: any;
}

function UnreadBadge(props: { count: number; max?: number }) {
  return (
    <Show when={props.count > 0}>
      <Badge
        variant="destructive"
        class="pointer-events-none h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px] leading-none"
      >
        {props.count > (props.max ?? 99) ? `${props.max ?? 99}+` : props.count}
      </Badge>
    </Show>
  );
}

export default function Header(props: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, blogs, activeBlogId, activeBlog, setActiveBlog } = useAuth();
  const [navOpen, setNavOpen] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const avatarUrl = useBlogAvatar(() => activeBlogId());
  const isPreview = () =>
    typeof window !== "undefined" &&
    (window as unknown as { __PREVIEW__?: boolean }).__PREVIEW__ === true;

  const profileHref = () =>
    user() ? `/${activeBlog()?.name ?? user()!.blog_name}` : "/login";

  const backTo = (href: string) => {
    setNavOpen(false);
    setMenuOpen(false);
    navigate(href);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    setNavOpen(false);
    trackEvent("login", { result: "logout" });
    logout();
    navigate("/login", { replace: true });
  };

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== "/home" && location.pathname.startsWith(`${href}/`));

  onMount(() => {
    if (typeof document === "undefined") return;
    refreshChangelogSeen();
  });

  createEffect(() => {
    if (typeof window === "undefined") return;
    if (!user()) return;
    void refreshMessageUnread();
    const timer = setInterval(() => void refreshMessageUnread(), 60000);
    const handleFocus = () => void refreshMessageUnread();
    window.addEventListener("focus", handleFocus);
    onCleanup(() => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    });
  });

  createEffect(() => {
    if (typeof window === "undefined") return;
    const blog = activeBlog();
    if (!user() || !blog) return;
    void refreshActivityUnread(blog.id, blog.name);
    const timer = setInterval(
      () => void refreshActivityUnread(blog.id, blog.name),
      120000,
    );
    const handleFocus = () => void refreshActivityUnread(blog.id, blog.name);
    window.addEventListener("focus", handleFocus);
    onCleanup(() => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    });
  });

  const primaryNav = () => [
    { href: "/home", label: "Home", icon: Home },
    { href: "/following", label: "Following", icon: Users },
    ...(features.forYou
      ? [{ href: "/for-you", label: "For you", icon: Bookmark }]
      : []),
    { href: "/search", label: "Search", icon: Search },
    { href: "/activity", label: "Activity", icon: Activity, badge: activityUnreadCount() },
  ];

  const accountNav = () => [
    { href: "/messages", label: "Messages", icon: Mail, badge: unreadCount() },
    { href: "/queue", label: "Queue", icon: ListChecks },
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/invitations", label: "Invitations", icon: MessageSquare },
    { href: "/blocked", label: "Blocked blogs", icon: Shield },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(features.legacyBlogCustomization
      ? [{ href: "/customize", label: "Customize blog", icon: Wrench }]
      : []),
    { href: "/changelog", label: "Changelog", icon: Bell, badge: changelogUnseenCount() },
  ];

  return (
    <>
      <header
        class="safe-top sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style="view-transition-name: header"
      >
        <div class="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3">
          <Drawer side="left" open={navOpen()} onOpenChange={setNavOpen}>
            <DrawerTrigger<typeof Button>
              as={(triggerProps) => (
                <Button
                  {...triggerProps}
                  variant="ghost"
                  size="icon"
                  class="md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu class="size-5" />
                </Button>
              )}
            />
            <DrawerPortal>
              <DrawerContent class="w-80 max-w-[85vw] p-0">
                <DrawerHeader class="flex-row items-center gap-3 border-b">
                  <Avatar
                    src={avatarUrl()}
                    fallback={activeBlog()?.name ?? user()?.blog_name ?? "B"}
                  />
                  <div class="min-w-0">
                    <DrawerLabel class="truncate text-base">
                      {activeBlog()?.name ?? user()?.blog_name ?? "Browse BDSMLR"}
                    </DrawerLabel>
                    <p class="text-xs text-muted-foreground">
                      {user() ? `@${user()!.username ?? user()!.blog_name}` : "Not signed in"}
                    </p>
                  </div>
                </DrawerHeader>
                <div class="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
                  <For each={primaryNav()}>
                    {(item) => (
                      <Button
                        variant="ghost"
                        class="h-11 w-full justify-start gap-3 px-3"
                        onClick={() => backTo(item.href)}
                      >
                        <item.icon class="size-4 text-muted-foreground" />
                        <span class="flex-1 text-left">{item.label}</span>
                        <UnreadBadge count={item.badge ?? 0} />
                      </Button>
                    )}
                  </For>
                  <Button
                    variant="default"
                    class="mt-2 h-11 w-full justify-start gap-3"
                    onClick={() => backTo("/compose")}
                  >
                    <PenSquare class="size-4" />
                    New post
                  </Button>
                  <Show when={user()}>
                    <Separator class="my-3" />
                    <p class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Your blog
                    </p>
                    <Button
                      variant="ghost"
                      class="h-11 w-full justify-start gap-3 px-3"
                      onClick={() => backTo(profileHref())}
                    >
                      <User class="size-4 text-muted-foreground" />
                      My blog
                    </Button>
                    <Button
                      variant="ghost"
                      class="h-11 w-full justify-start gap-3 px-3"
                      onClick={() => backTo("/liked")}
                    >
                      <Bookmark class="size-4 text-muted-foreground" />
                      Liked
                    </Button>
                    <Separator class="my-3" />
                    <p class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Manage
                    </p>
                    <For each={accountNav()}>
                      {(item) => (
                        <Button
                          variant="ghost"
                          class="h-11 w-full justify-start gap-3 px-3"
                          onClick={() => backTo(item.href)}
                        >
                          <item.icon class="size-4 text-muted-foreground" />
                          <span class="flex-1 text-left">{item.label}</span>
                          <UnreadBadge count={item.badge ?? 0} />
                        </Button>
                      )}
                    </For>
                    <Show when={blogs().length > 1}>
                      <Separator class="my-3" />
                      <p class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Active blog
                      </p>
                      <For each={blogs()}>
                        {(blog) => (
                          <Button
                            variant={blog.id === activeBlogId() ? "secondary" : "ghost"}
                            class="h-11 w-full justify-start px-3"
                            onClick={() => {
                              setActiveBlog(blog.id);
                              window.location.reload();
                            }}
                          >
                            {blog.name}
                          </Button>
                        )}
                      </For>
                    </Show>
                    <Separator class="my-3" />
                    <Button
                      variant="ghost"
                      class="h-11 w-full justify-start gap-3 px-3 text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut class="size-4" />
                      Sign out
                    </Button>
                  </Show>
                  <Show when={!user()}>
                    <Separator class="my-3" />
                    <Button
                      variant="ghost"
                      class="h-11 w-full justify-start gap-3 px-3"
                      onClick={() => backTo("/about")}
                    >
                      About
                    </Button>
                    <Button
                      variant="ghost"
                      class="h-11 w-full justify-start gap-3 px-3"
                      onClick={() => backTo("/changelog")}
                    >
                      <Bell class="size-4 text-muted-foreground" />
                      Changelog
                    </Button>
                    <Button
                      variant="default"
                      class="mt-2 h-11 w-full"
                      onClick={() => backTo("/login")}
                    >
                      Sign in
                    </Button>
                  </Show>
                  <Separator class="my-3" />
                  <div class="flex gap-2 px-1 pb-2">
                    <Button
                      as="a"
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      class="h-10 flex-1 gap-2"
                    >
                      <GitHubIcon class="size-4" />
                      GitHub
                    </Button>
                    <Button
                      as="a"
                      href={DISCORD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                      class="h-10 flex-1 gap-2"
                    >
                      <DiscordIcon class="size-4" />
                      Discord
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </DrawerPortal>
          </Drawer>

          <A href="/home" class="flex items-center gap-2 font-semibold tracking-tight">
            <BdsmlrIcon class="size-5 rounded-[4px]" />
            <span class="hidden text-sm sm:inline">BDSMLR</span>
          </A>
          <Show when={isPreview()}>
            <Badge variant="outline" class="text-[10px] uppercase">
              Preview
            </Badge>
          </Show>

          <Show when={props.info}>
            <span class="truncate text-sm text-muted-foreground">{props.info}</span>
          </Show>

          <div class="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
            {props.children}
          </div>

          <nav class="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
            <For each={primaryNav()}>
              {(item) => (
                <Button
                  as={A}
                  href={item.href}
                  variant="ghost"
                  size="sm"
                  class="gap-2 text-muted-foreground"
                  classList={{ "text-foreground": isActive(item.href) }}
                >
                  <item.icon class="size-4" />
                  {item.label}
                  <UnreadBadge count={item.badge ?? 0} />
                </Button>
              )}
            </For>
          </nav>

          <Show when={user()}>
            <Button
              as={A}
              href="/messages"
              variant="ghost"
              size="icon"
              class="relative shrink-0"
              aria-label="Messages"
            >
              <Mail class="size-5" />
              <span class="absolute -right-1 -top-1">
                <UnreadBadge count={unreadCount()} />
              </span>
            </Button>
          </Show>

          <DropdownMenu open={menuOpen()} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger<typeof Button>
              as={(triggerProps) => (
                <Button
                  {...triggerProps}
                  variant="ghost"
                  size="sm"
                  class="shrink-0 gap-2 px-2"
                  aria-label="Account menu"
                >
                  <Show
                    when={user()}
                    fallback={
                      <>
                        <User class="size-5" />
                        <span class="hidden sm:inline">Menu</span>
                      </>
                    }
                  >
                    <Avatar
                      class="size-7"
                      src={avatarUrl()}
                      fallback={activeBlog()?.name ?? user()?.blog_name ?? "B"}
                    />
                    <span class="hidden max-w-32 truncate md:inline">
                      {activeBlog()?.name ?? user()?.blog_name}
                    </span>
                    <ChevronDown class="hidden size-4 text-muted-foreground sm:block" />
                  </Show>
                </Button>
              )}
            />
            <DropdownMenuPortal>
              <DropdownMenuContent class="w-56">
                <Show
                  when={user()}
                  fallback={
                    <>
                      <DropdownMenuItem onSelect={() => navigate("/home")}>
                        <Home class="size-4" /> Home
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate("/about")}>
                        About
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate("/changelog")}>
                        <Bell class="size-4" /> Changelog
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigate("/login")}>
                        Sign in
                      </DropdownMenuItem>
                    </>
                  }
                >
                  <DropdownMenuGroup>
                    <DropdownMenuGroupLabel>{user()!.blog_name}</DropdownMenuGroupLabel>
                    <DropdownMenuItem onSelect={() => navigate(profileHref())}>
                      <User class="size-4" /> My blog
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate("/compose")}>
                      <PenSquare class="size-4" /> New post
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate("/messages")}>
                      <Mail class="size-4" /> Messages
                      <Show when={unreadCount() > 0}>
                        <Badge variant="destructive" class="ml-auto">
                          {unreadCount()}
                        </Badge>
                      </Show>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <For each={accountNav()}>
                      {(item) => (
                        <DropdownMenuItem onSelect={() => navigate(item.href)}>
                          <item.icon class="size-4" />
                          {item.label}
                          <Show when={(item.badge ?? 0) > 0}>
                            <Badge variant="destructive" class="ml-auto">
                              {item.badge}
                            </Badge>
                          </Show>
                        </DropdownMenuItem>
                      )}
                    </For>
                  </DropdownMenuGroup>
                  <Show when={blogs().length > 1}>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuGroupLabel>Active blog</DropdownMenuGroupLabel>
                      <For each={blogs()}>
                        {(blog) => (
                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveBlog(blog.id);
                              window.location.reload();
                            }}
                          >
                            {blog.name}
                            <Show when={blog.id === activeBlogId()}>
                              <span class="ml-auto text-primary">Current</span>
                            </Show>
                          </DropdownMenuItem>
                        )}
                      </For>
                    </DropdownMenuGroup>
                  </Show>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut class="size-4" /> Sign out
                  </DropdownMenuItem>
                </Show>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
      </header>
      <OutageBanner />
      <RateLimitBanner />


      <nav
        class="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div class="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
          <A
            href="/home"
            class="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"
            classList={{ "text-primary": isActive("/home") }}
          >
            <Home class="size-5" />
            <span class="text-[10px]">Home</span>
          </A>
          <A
            href="/search"
            class="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"
            classList={{ "text-primary": isActive("/search") }}
          >
            <Search class="size-5" />
            <span class="text-[10px]">Search</span>
          </A>
          <A
            href="/compose"
            class="flex h-full flex-col items-center justify-center"
            aria-label="New post"
          >
            <span class="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <PenSquare class="size-5" />
            </span>
          </A>
          <A
            href="/activity"
            class="relative flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"
            classList={{ "text-primary": isActive("/activity") }}
          >
            <Activity class="size-5" />
            <span class="text-[10px]">Activity</span>
            <span class="absolute right-3 top-1">
              <UnreadBadge count={activityUnreadCount()} />
            </span>
          </A>
          <A
            href={profileHref()}
            class="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"
            classList={{ "text-primary": isActive(profileHref()) }}
          >
            <User class="size-5" />
            <span class="text-[10px]">Profile</span>
          </A>
        </div>
      </nav>

    </>
  );
}
