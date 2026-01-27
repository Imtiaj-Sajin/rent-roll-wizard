// src\components\ProfileButton.tsx
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfileButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="glass hover:glass-strong overflow-hidden"
      aria-label="Profile"
    >
      {/* If you have an image */}
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
  );
}
