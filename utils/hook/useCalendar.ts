import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "@/utils/services/api";
import { EventFormData } from "@/utils/types";

export const useCalendarEvents = (start: Date, end: Date) => {
  return useQuery({
    queryKey: ["calendar-events", start.toISOString(), end.toISOString()],
    queryFn: () => calendarApi.getEvents(start, end),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventFormData) => calendarApi.createEvent(data),
    onSuccess: () => {
      // Invalidate calendar events queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: EventFormData }) =>
      calendarApi.updateEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => calendarApi.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};
