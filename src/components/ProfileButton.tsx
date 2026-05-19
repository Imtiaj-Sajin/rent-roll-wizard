"use client";

import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.employee
    ? `${user.employee.first_name ?? ""} ${user.employee.last_name ?? ""}`.trim()
    : "";
  const displayName = fullName || user?.username || "Guest";
  const subtitle = user?.email || (user ? "" : "Not signed in");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="glass hover:glass-strong rounded-full overflow-hidden transition-all duration-200 hover:bg-background/40 active:scale-95"
          aria-label="Profile"
        >
          {user?.employee?.profile_photo_url ? (
            <img
              src={user.employee.profile_photo_url}
              alt={displayName}
              className="h-full w-full object-cover rounded-full"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-56 rounded-xl border border-border bg-background/40 backdrop-blur-xl shadow-xs"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{displayName}</span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4 opacity-70" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
