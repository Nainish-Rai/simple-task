"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "./event-form";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { EventFormData } from "@/utils/types";

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialData?: any; // We'll type this properly when we have the event type
  onSubmit: (data: EventFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean; // New prop for loading state
}

export function EventDialog({
  isOpen,
  onClose,
  mode,
  initialData,
  onSubmit,
  onDelete,
  isLoading = false,
}: EventDialogProps) {
  const handleSubmit = async (data: EventFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Event" : "Edit Event"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <EventForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isSubmitting={isLoading}
          />
          {mode === "edit" && onDelete && (
            <div className="mt-6 flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && <Trash2 className="mr-2 h-4 w-4" />}
                Delete Event
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
