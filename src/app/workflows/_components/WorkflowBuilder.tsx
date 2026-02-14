"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
  MarkerType,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Plus, GitBranch } from "lucide-react";
import { StepNode } from "./StepNode";
import { BranchNode } from "./BranchNode";
import { StartEndNode } from "./StartEndNode";
import { NodeEditorPanel } from "./NodeEditorPanel";

const nodeTypes = {
  step: StepNode,
  branch: BranchNode,
  startEnd: StartEndNode,
};

const VERTICAL_GAP = 120;
const START_Y = 50;
const CENTER_X = 250;

const defaultEdgeOptions = {
  type: "default",
  animated: true,
  style: { stroke: "#6366f1", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
};

interface WorkflowBuilderProps {
  workflowId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

function WorkflowBuilderInner({ onSave }: WorkflowBuilderProps) {
  const stepCountRef = useRef(1);
  const edgeIdCounterRef = useRef(1);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // ユニークなエッジIDを生成
  const generateEdgeId = useCallback((prefix: string) => {
    const id = `${prefix}-${edgeIdCounterRef.current++}`;
    return id;
  }, []);

  // 初期ノード
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: "start",
      type: "startEnd",
      position: { x: CENTER_X, y: START_Y },
      data: { label: "開始", type: "start" },
    },
    {
      id: "end",
      type: "startEnd",
      position: { x: CENTER_X, y: START_Y + VERTICAL_GAP },
      data: { label: "完了", type: "end" },
    },
  ]);

  // 初期エッジ
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([
    {
      id: "e-start-end",
      source: "start",
      target: "end",
      ...defaultEdgeOptions,
    },
  ]);

  // 手動接続のコールバック
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        ...defaultEdgeOptions,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ステップ追加
  const addStepNode = useCallback(() => {
    const count = stepCountRef.current;
    const newNodeId = `step-${count}`;
    const edgeId1 = generateEdgeId(`e-to-${newNodeId}`);
    const edgeId2 = generateEdgeId(`e-${newNodeId}-to-end`);

    // 現在のノードとエッジを取得して更新
    setNodes((currentNodes) => {
      // 完了ノード以外で最もY座標が大きいノードを探す
      const nonEndNodes = currentNodes.filter((n) => n.id !== "end");
      if (nonEndNodes.length === 0) return currentNodes;

      const lastNode = nonEndNodes.reduce((max, n) =>
        n.position.y > max.position.y ? n : max
      );
      const newY = lastNode.position.y + VERTICAL_GAP;

      // 完了ノードを下に移動 + 新ノード追加
      const newNodes = currentNodes.map((n) =>
        n.id === "end"
          ? { ...n, position: { x: CENTER_X, y: newY + VERTICAL_GAP } }
          : n
      );

      const newNode: Node = {
        id: newNodeId,
        type: "step",
        position: { x: CENTER_X, y: newY },
        data: {
          label: `ステップ ${count}`,
          description: "クリックして編集",
          fields: [],
        },
      };

      // エッジも同時に更新（重複チェック付き）
      setEdges((currentEdges) => {
        // 既に同じIDのエッジが存在する場合はスキップ
        if (currentEdges.some((e) => e.id === edgeId1)) {
          return currentEdges;
        }

        // lastNode → end のエッジを削除
        const filteredEdges = currentEdges.filter(
          (e) => !(e.source === lastNode.id && e.target === "end")
        );

        return [
          ...filteredEdges,
          {
            id: edgeId1,
            source: lastNode.id,
            target: newNodeId,
            ...defaultEdgeOptions,
          },
          {
            id: edgeId2,
            source: newNodeId,
            target: "end",
            ...defaultEdgeOptions,
          },
        ];
      });

      stepCountRef.current += 1;
      return [...newNodes, newNode];
    });
  }, [setNodes, setEdges, generateEdgeId]);

  // 分岐追加
  const addBranchNode = useCallback(() => {
    const count = stepCountRef.current;
    const newNodeId = `branch-${count}`;
    const edgeId1 = generateEdgeId(`e-to-${newNodeId}`);
    const edgeId2 = generateEdgeId(`e-${newNodeId}-yes`);
    const edgeId3 = generateEdgeId(`e-${newNodeId}-no`);

    setNodes((currentNodes) => {
      const nonEndNodes = currentNodes.filter((n) => n.id !== "end");
      if (nonEndNodes.length === 0) return currentNodes;

      const lastNode = nonEndNodes.reduce((max, n) =>
        n.position.y > max.position.y ? n : max
      );
      const newY = lastNode.position.y + VERTICAL_GAP;

      const newNodes = currentNodes.map((n) =>
        n.id === "end"
          ? { ...n, position: { x: CENTER_X, y: newY + VERTICAL_GAP } }
          : n
      );

      const newNode: Node = {
        id: newNodeId,
        type: "branch",
        position: { x: CENTER_X, y: newY },
        data: {
          question: "条件を入力...",
          conditionType: "manual",
        },
      };

      setEdges((currentEdges) => {
        // 既に同じIDのエッジが存在する場合はスキップ
        if (currentEdges.some((e) => e.id === edgeId1)) {
          return currentEdges;
        }

        const filteredEdges = currentEdges.filter(
          (e) => !(e.source === lastNode.id && e.target === "end")
        );

        return [
          ...filteredEdges,
          {
            id: edgeId1,
            source: lastNode.id,
            target: newNodeId,
            ...defaultEdgeOptions,
          },
          {
            id: edgeId2,
            source: newNodeId,
            sourceHandle: "yes",
            target: "end",
            label: "Yes",
            animated: true,
            style: { stroke: "#22c55e", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
          },
          {
            id: edgeId3,
            source: newNodeId,
            sourceHandle: "no",
            target: "end",
            label: "No",
            animated: true,
            style: { stroke: "#ef4444", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
          },
        ];
      });

      stepCountRef.current += 1;
      return [...newNodes, newNode];
    });
  }, [setNodes, setEdges, generateEdgeId]);

  // ノード更新
  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  // ノード削除
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      if (nodeId === "start" || nodeId === "end") return;

      setEdges((currentEdges) => {
        const inEdges = currentEdges.filter((e) => e.target === nodeId);
        const outEdges = currentEdges.filter((e) => e.source === nodeId);

        // 前後を繋ぐエッジを作成
        const bridgeEdges: Edge[] = [];
        for (const inE of inEdges) {
          for (const outE of outEdges) {
            const bridgeId = generateEdgeId(`e-bridge-${inE.source}-${outE.target}`);
            bridgeEdges.push({
              id: bridgeId,
              source: inE.source,
              target: outE.target,
              ...defaultEdgeOptions,
            });
          }
        }

        return [
          ...currentEdges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          ...bridgeEdges,
        ];
      });

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges, generateEdgeId]
  );

  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  return (
    <div className="flex h-[calc(100vh-200px)] w-full border rounded-lg overflow-hidden">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <MiniMap nodeStrokeWidth={3} className="!bg-muted/50" />
          <Panel position="top-left" className="flex gap-2">
            <Button onClick={addStepNode} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              ステップ
            </Button>
            <Button onClick={addBranchNode} size="sm" variant="secondary">
              <GitBranch className="h-4 w-4 mr-1" />
              分岐
            </Button>
          </Panel>
          <Panel position="top-right">
            <Button onClick={handleSave}>保存</Button>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeEditorPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
        />
      )}
    </div>
  );
}

// ReactFlowProviderでラップ
export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
