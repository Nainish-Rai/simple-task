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
    return response.data;
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
