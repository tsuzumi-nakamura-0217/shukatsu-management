import { getAllCompanies } from "./companies";
import { getAllTasks } from "./tasks";
import { getAllInterviews } from "./interviews";

export async function getCalendarEvents(): Promise<
  {
    id: string;
    title: string;
    date: string;
    type: string;
    companySlug: string;
    companyName: string;
    color: string;
  }[]
> {
  const companies = await getAllCompanies();
  const tasks = await getAllTasks();
  const events: {
    id: string;
    title: string;
    date: string;
    type: string;
    companySlug: string;
    companyName: string;
    color: string;
  }[] = [];

  // Interviews
  const allInterviews = await getAllInterviews();
  const companyMap = new Map(companies.map(c => [c.slug, c]));

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

  // Task deadlines
  for (const task of tasks) {
    if (task.deadline && task.status !== "完了") {
      events.push({
        id: task.id,
        title: `${task.companyName || ""} - ${task.title}`,
        date: task.deadline,
        type: task.category === "ES" ? "es" : "deadline",
        companySlug: task.companySlug,
        companyName: task.companyName || "",
        color: task.category === "ES" ? "#eab308" : "#ef4444", // yellow / red
      });
    }
  }

  return events;
}
