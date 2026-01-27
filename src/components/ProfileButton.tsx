// src/components/ProfileButton.tsx
"use client";

import { User, Settings, LogOut, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="
            glass hover:glass-strong
            rounded-full overflow-hidden
            transition-all duration-200
            hover:bg-background/40
            active:scale-95
          "
          aria-label="Profile"
        >
          {/* Avatar image (optional later) */}
          {/*
          <img
            src="/avatar.png"
            alt="Profile"
            className="h-full w-full object-cover rounded-full"
          />
          */}

          {/* Fallback icon */}
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="
          w-56
          rounded-xl
          border border-border/40
          bg-background/70
          backdrop-blur-md
          shadow-xl
        "
      >
        {/* User info */}
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Imtiaj Sajin</span>
          <span className="text-xs text-muted-foreground">
            sajin@rentroll.app
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <User className="h-4 w-4 opacity-70" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <CreditCard className="h-4 w-4 opacity-70" />
          <span>Billing</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4 opacity-70" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 opacity-70" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
