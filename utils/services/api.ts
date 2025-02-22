import axios from "axios";
import { CalendarEventType, EventFormData } from "../types";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const calendarApi = {
  getEvents: async (start: Date, end: Date): Promise<CalendarEventType[]> => {
    const response = await api.get("/calendar", {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
    // Convert string dates back to Date objects
    return response.data.map((event: CalendarEventType) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt),
    }));
  },

  createEvent: async (data: EventFormData) => {
    const response = await api.post("/calendar", data);
    return response.data;
  },

  updateEvent: async (eventId: string, data: EventFormData) => {
    const response = await api.put(`/calendar/${eventId}`, data);
    return response.data;
  },

  deleteEvent: async (eventId: string) => {
    const response = await api.delete(`/calendar/${eventId}`);
    return response.data;
  },
};

export default api;
