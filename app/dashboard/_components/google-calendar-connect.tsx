"use client";

import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function GoogleCalendarConnect() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      const response = await fetch("/api/auth/google-calendar");
      const data = await response.json();
      console.log(data, "calendar data");

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Failed to get authorization URL");
      }
    } catch (error) {
      console.error("Failed to connect Google Calendar:", error);
      toast.error("Failed to connect Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return (
    <Button
      variant="outline"
      onClick={handleConnect}
      disabled={isConnecting}
      className="gap-2"
    >
      <CalendarPlus className="h-4 w-4" />
      {isConnecting ? "Connecting..." : "Connect Google Calendar"}
    </Button>
  );
}
