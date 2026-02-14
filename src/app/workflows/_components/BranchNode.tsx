"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

interface BranchNodeData {
  question: string;
}

const baseHandleStyle = {
  width: 14,
  height: 14,
  border: "3px solid white",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
};

export const BranchNode = memo(function BranchNode({
  data,
  selected,
}: NodeProps & { data: BranchNodeData }) {
  return (
    <div
      className={`relative bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 rounded-lg p-3 min-w-[180px] cursor-pointer ${
        selected ? "ring-2 ring-primary ring-offset-2 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...baseHandleStyle, background: "#f59e0b" }}
        isConnectable={true}
      />
      <div className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="h-4 w-4 text-amber-600" />
        <span className="text-amber-800 dark:text-amber-200">分岐</span>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
        {data.question}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ ...baseHandleStyle, background: "#22c55e", left: "30%" }}
        isConnectable={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ ...baseHandleStyle, background: "#ef4444", left: "70%" }}
        isConnectable={true}
      />
      <div className="absolute -bottom-5 left-[25%] text-[10px] text-green-600 font-medium">
        Yes
      </div>
      <div className="absolute -bottom-5 left-[65%] text-[10px] text-red-600 font-medium">
        No
      </div>
    </div>
  );
});
