import { db } from "@/db";
import { projects } from "@/db/schema";
import ProjectsView from "./ProjectsView";

export default async function ProjectsPage() {
  const allProjects = await db.select().from(projects);

  return <ProjectsView initialProjects={allProjects} />;
}
