"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/utils/cn";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, X } from "lucide-react";
import { EventFormData, EventFormSchema } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  isSubmitting?: boolean;
}

interface AgendaItem {
  title: string;
  duration: number | null;
  presenter: string | null;
  notes: string | null;
  status: "pending" | "completed";
}

const PRIORITY_COLORS = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
} as const;

const MEETING_TYPES = [
  { value: "none", label: "No Meeting" },
  { value: "google_meet", label: "Google Meet" },
] as const;

export function EventForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: EventFormProps) {
  const form = useForm<EventFormData>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: React.useMemo(
      () => ({
        title: initialData?.title ?? "",
        description: initialData?.description ?? "",
        location: initialData?.location ?? "",
        startDate: initialData?.startDate ?? new Date(),
        endDate: initialData?.endDate ?? new Date(),
        startTime: initialData?.startTime ?? "09:00",
        endTime: initialData?.endTime ?? "10:00",
        isAllDay: initialData?.isAllDay ?? false,
        colorCode: initialData?.colorCode ?? "#3B82F6",
        priority: initialData?.priority ?? "medium",
        meetingType: initialData?.meetingType ?? "none",
        attendees: initialData?.attendees ?? [],
        notes: initialData?.notes ?? "",
        agendaItems: (initialData?.agendaItems?.map((item: any) => ({
          ...item,
          status: item.status || "pending",
        })) ?? []) as AgendaItem[],
        tags: initialData?.tags ?? [],
        isPrivate: initialData?.isPrivate ?? false,
        category: initialData?.category ?? "",
        notifyChanges: initialData?.notifyChanges ?? true,
      }),
      [initialData]
    ),
  });

  const [isAllDay, setIsAllDay] = React.useState<boolean>(
    form.getValues("isAllDay")
  );

  const [agendaItems, setAgendaItems] = React.useState<AgendaItem[]>(
    form.getValues("agendaItems") as AgendaItem[]
  );

  const [tags, setTags] = React.useState<string[]>(
    form.getValues("tags") ?? []
  );
  const [currentTag, setCurrentTag] = React.useState<string>("");
  const [currentEmail, setCurrentEmail] = React.useState<string>("");
  const [attendees, setAttendees] = React.useState<string[]>(
    form.getValues("attendees") ?? []
  );

  const handleAddAttendee = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && currentEmail.trim()) {
        e.preventDefault();
        const email = currentEmail.trim();
        if (email.includes("@")) {
          setAttendees((prevAttendees) => {
            const newAttendees = [...prevAttendees, email];
            form.setValue("attendees", newAttendees);
            return newAttendees;
          });
          setCurrentEmail("");
        }
      }
    },
    [currentEmail, form]
  );

  const handleRemoveAttendee = React.useCallback(
    (emailToRemove: string) => {
      setAttendees((prevAttendees) => {
        const newAttendees = prevAttendees.filter(
          (email) => email !== emailToRemove
        );
        form.setValue("attendees", newAttendees);
        return newAttendees;
      });
    },
    [form]
  );

  const handleAddAgendaItem = React.useCallback(() => {
    const newItem: AgendaItem = {
      title: "",
      duration: null,
      presenter: null,
      notes: null,
      status: "pending",
    };
    setAgendaItems((prevItems): AgendaItem[] => {
      const newItems = [...prevItems, newItem];
      form.setValue("agendaItems", newItems);
      return newItems;
    });
  }, [form]);

  const handleRemoveAgendaItem = React.useCallback(
    (index: number) => {
      setAgendaItems((prevItems): AgendaItem[] => {
        const newItems = prevItems.filter((_, i) => i !== index);
        form.setValue("agendaItems", newItems);
        return newItems;
      });
    },
    [form]
  );

  const handleUpdateAgendaItem = React.useCallback(
    (index: number, title: string) => {
      setAgendaItems((prevItems): AgendaItem[] => {
        const newItems = [...prevItems];
        newItems[index] = { ...newItems[index], title };
        form.setValue("agendaItems", newItems);
        return newItems;
      });
    },
    [form]
  );

  const handleAddTag = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && currentTag.trim()) {
        e.preventDefault();
        const newTag = currentTag.trim();
        setTags((prevTags): string[] => {
          const newTags = [...prevTags, newTag];
          form.setValue("tags", newTags);
          return newTags;
        });
        setCurrentTag("");
      }
    },
    [currentTag, form]
  );

  const handleRemoveTag = React.useCallback(
    (tagToRemove: string) => {
      setTags((prevTags): string[] => {
        const newTags = prevTags.filter((tag) => tag !== tagToRemove);
        form.setValue("tags", newTags);
        return newTags;
      });
    },
    [form]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* Basic Details */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter event title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add event description"
                    className="resize-none"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isAllDay && (
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < form.getValues("startDate") ||
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isAllDay && (
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex items-center space-x-4">
            <FormField
              control={form.control}
              name="isAllDay"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setIsAllDay(checked);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">All day</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Meeting Settings */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="meetingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Integration</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEETING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {form.watch("meetingType") === "google_meet" && (
              <div className="space-y-4">
                <FormLabel>Invite Attendees</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {attendees.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {email}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => handleRemoveAttendee(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <Input
                  type="email"
                  placeholder="Type email and press Enter"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={handleAddAttendee}
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced-settings">
              <AccordionTrigger>Advanced Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value ?? "medium"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded",
                                    PRIORITY_COLORS.low
                                  )}
                                >
                                  Low
                                </span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded",
                                    PRIORITY_COLORS.medium
                                  )}
                                >
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded",
                                    PRIORITY_COLORS.high
                                  )}
                                >
                                  High
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="colorCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input
                              type="color"
                              value={field.value ?? "#3B82F6"}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Add location"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Markdown supported)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add notes with markdown formatting"
                            className="min-h-[100px] font-mono"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Type tag and press Enter"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Agenda Items</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddAgendaItem}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    {agendaItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          placeholder="Agenda item title"
                          value={item.title}
                          onChange={(e) =>
                            handleUpdateAgendaItem(index, e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAgendaItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name="isPrivate"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Private</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifyChanges"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">
                            Notify Changes
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Event" : "Create Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
