import { getAllCompanies } from "./companies";
import { getAllTasks } from "./tasks";
import { getAllInterviews } from "./interviews";
import { getAllEvents } from "./events";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  end?: string;
  type: string;
  companySlug: string;
  companyName: string;
  color: string;
  status?: string;
};

export async function getCalendarEvents(options?: {
  includeCompleted?: boolean;
}): Promise<CalendarEvent[]> {
  const includeCompleted = options?.includeCompleted ?? false;
  const companies = await getAllCompanies();
  const tasks = await getAllTasks();
  const events: CalendarEvent[] = [];

  const companyMap = new Map(companies.map(c => [c.slug, c]));

  // Interviews
  const allInterviews = await getAllInterviews();
  for (const interview of allInterviews) {
    const company = companyMap.get(interview.companySlug);
    if (!company) continue;

    events.push({
      id: interview.id,
      title: `${company.name} - ${interview.type}`,
      date: interview.date,
      type: "interview",
      companySlug: company.slug,
      companyName: company.name,
      color: "#3b82f6", // blue
    });
  }

  // Company Events (Information sessions, Internships, etc.)
  const allCompanyEvents = await getAllEvents();
  for (const ev of allCompanyEvents) {
    const company = companyMap.get(ev.companySlug);
    if (!company) continue;

    events.push({
      id: ev.id,
      title: `${company.name} - ${ev.title}`,
      date: ev.date,
      end: ev.endDate || undefined,
      type: "event",
      companySlug: company.slug,
      companyName: company.name,
      color: "#a855f7", // purple
    });
  }

  // Task deadlines
  for (const task of tasks) {
    if (!task.deadline) continue;
    if (!includeCompleted && task.status === "完了") continue;

    events.push({
      id: task.id,
      title: `${task.companyName || ""} - ${task.title}`,
      date: task.deadline,
      type: task.category === "ES" ? "es" : "deadline",
      companySlug: task.companySlug,
      companyName: task.companyName || "",
      color: task.category === "ES" ? "#eab308" : "#ef4444", // yellow / red
      status: task.status,
    });
  }

  return events;
}
