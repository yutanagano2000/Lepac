"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Play, CheckCircle } from "lucide-react";

interface StartEndNodeData {
  label: string;
  type: "start" | "end";
}

const handleStyle = {
  width: 14,
  height: 14,
  border: "3px solid white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
};

export const StartEndNode = memo(function StartEndNode({
  data,
}: NodeProps & { data: StartEndNodeData }) {
  const isStart = data.type === "start";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer ${
        isStart
          ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500"
          : "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
      }`}
    >
      {isStart ? (
        <>
          <Play className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            {data.label}
          </span>
          <Handle
            type="source"
            position={Position.Bottom}
            style={{ ...handleStyle, background: "#22c55e" }}
            isConnectable={true}
          />
        </>
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Top}
            style={{ ...handleStyle, background: "#3b82f6" }}
            isConnectable={true}
          />
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {data.label}
          </span>
        </>
      )}
    </div>
  );
});
