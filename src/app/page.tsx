import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// サンプルデータ（実際のデータはAPIやDBから取得）
const projects = [
  { id: "P-001", manager: "山田", client: "〇〇不動産", projectNumber: "2026-0001" },
  { id: "P-002", manager: "佐藤", client: "△△建設", projectNumber: "2026-0002" },
  { id: "P-003", manager: "田中", client: "□□開発", projectNumber: "2026-0003" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto max-w-5xl py-10">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">案件一覧</h1>
            <p className="text-sm text-muted-foreground">
              担当する案件を確認できます
            </p>
          </div>

          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>管理番号</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead>販売先</TableHead>
                  <TableHead>案件番号</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.id}</TableCell>
                    <TableCell>{project.manager}</TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>{project.projectNumber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
