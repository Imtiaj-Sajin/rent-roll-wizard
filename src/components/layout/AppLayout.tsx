import { Outlet } from "react-router-dom";

import GlassShell from "@/components/layout/GlassShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { RentRollSessionProvider } from "@/features/rentroll/ui/rentroll-session";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProfileButton } from "@/components/ProfileButton";

export default function AppLayout() {
  return (
    <RentRollSessionProvider>
      <GlassShell>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />

            <SidebarInset className="bg-transparent">
              <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/40 bg-background/40 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/30">
                {/* Left */}
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="glass" />
                  <div className="hidden text-sm font-medium sm:block">Rent Roll</div>
                </div>

                {/* Right */}
                <div className="ml-auto flex items-center gap-2">
                  <ThemeToggle />
                  <ProfileButton />

                </div>
              </header>


              <main className="mx-auto w-full max-w-[95rem] px-4 py-10 sm:px-6 lg:px-8">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </GlassShell>
    </RentRollSessionProvider>
  );
}
