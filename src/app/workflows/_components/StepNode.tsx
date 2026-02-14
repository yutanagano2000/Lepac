"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface StepNodeData {
  label: string;
  description: string;
  fields?: { name: string; type: string }[];
}

const handleStyle = {
  width: 14,
  height: 14,
  background: "#6366f1",
  border: "3px solid white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
};

export const StepNode = memo(function StepNode({
  data,
  selected,
}: NodeProps & { data: StepNodeData }) {
  return (
    <Card
      className={`min-w-[200px] cursor-pointer ${
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
        isConnectable={true}
      />
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          {data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-muted-foreground">{data.description}</p>
        {data.fields && data.fields.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.fields.length}個のフィールド
          </div>
        )}
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
        isConnectable={true}
      />
    </Card>
  );
});
