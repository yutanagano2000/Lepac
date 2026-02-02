import { db } from "@/db";
import { projects, progress } from "@/db/schema";
import TimelineView from "./TimelineView";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const allProjects = await db.select().from(projects);
  const allProgress = await db.select().from(progress);

  // 各プロジェクトに進捗データを紐付け
  const projectsWithProgress = allProjects.map((project) => ({
    ...project,
    progressItems: allProgress.filter((p) => p.projectId === project.id),
  }));

  return <TimelineView projects={projectsWithProgress} />;
}
