"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth, MOCK_USERS } from "@/lib/mock-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Navigation items for the wedding sidebar
const NAV_ITEMS = [
  { title: "Overview", href: "", icon: "home" },
  { title: "Day-of Timeline", href: "/timeline", icon: "calendar" },
  { title: "Cash Management", href: "/cash", icon: "dollar" },
];

// Simple icon components
function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

const ICONS: Record<string, () => React.ReactElement> = {
  home: HomeIcon,
  calendar: CalendarIcon,
  dollar: DollarIcon,
};

export default function WeddingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const weddingId = params.weddingId as string;
  const { user, timelineRole, budgetRole, switchUser } = useAuth();

  const basePath = `/weddings/${weddingId}`;

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2">
            <Link href="/" className="text-lg font-semibold hover:underline">
              Wedding Planner
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
              Sarah & John&apos;s Wedding
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Planning</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const href = `${basePath}${item.href}`;
                  const isActive = pathname === href ||
                    (item.href !== "" && pathname.startsWith(href));
                  const Icon = ICONS[item.icon];

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Role indicator */}
          <SidebarGroup>
            <SidebarGroupLabel>Your Roles</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Timeline:</span>
                  <Badge variant="secondary" className="text-xs">
                    {timelineRole?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Budget:</span>
                  <Badge variant="secondary" className="text-xs">
                    {budgetRole?.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <UserIcon />
                    <span className="truncate">{user?.name}</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Switch User (Dev)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(MOCK_USERS).map(([key, mockUser]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => switchUser(key as keyof typeof MOCK_USERS)}
                    >
                      <div className="flex flex-col">
                        <span>{mockUser.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {mockUser.timelineRole.replace(/_/g, " ")}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h1 className="text-sm font-medium">
              {NAV_ITEMS.find(
                (item) =>
                  pathname === `${basePath}${item.href}` ||
                  (item.href && pathname.startsWith(`${basePath}${item.href}`))
              )?.title || "Wedding"}
            </h1>
          </div>
          <div className="text-xs text-muted-foreground">
            All times: America/New_York (Venue)
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
