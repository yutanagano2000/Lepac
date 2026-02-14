"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2, GripVertical } from "lucide-react";

interface FormField {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "select" | "file" | "address" | "phone" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface StepData {
  label: string;
  description: string;
  fields: FormField[];
}

interface BranchData {
  question: string;
  conditionType: "manual" | "auto";
  conditionField?: string;
}

interface NodeEditorPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: StepData | BranchData) => void;
  onDelete: (nodeId: string) => void;
}

const fieldTypes = [
  { value: "text", label: "テキスト" },
  { value: "number", label: "数値" },
  { value: "date", label: "日付" },
  { value: "textarea", label: "テキストエリア" },
  { value: "address", label: "住所" },
  { value: "phone", label: "電話番号" },
  { value: "file", label: "ファイル" },
  { value: "select", label: "選択肢" },
];

export function NodeEditorPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: NodeEditorPanelProps) {
  const [stepData, setStepData] = useState<StepData>({
    label: "",
    description: "",
    fields: [],
  });
  const [branchData, setBranchData] = useState<BranchData>({
    question: "",
    conditionType: "manual",
  });

  useEffect(() => {
    if (node) {
      if (node.type === "step") {
        setStepData({
          label: (node.data as StepData).label || "",
          description: (node.data as StepData).description || "",
          fields: (node.data as StepData).fields || [],
        });
      } else if (node.type === "branch") {
        setBranchData({
          question: (node.data as BranchData).question || "",
          conditionType: (node.data as BranchData).conditionType || "manual",
          conditionField: (node.data as BranchData).conditionField,
        });
      }
    }
  }, [node]);

  if (!node) return null;

  const isStep = node.type === "step";
  const isBranch = node.type === "branch";
  const isStartEnd = node.type === "startEnd";

  if (isStartEnd) {
    return (
      <div className="w-80 border-l bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">
            {(node.data as { type: string }).type === "start" ? "開始ノード" : "完了ノード"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          このノードは編集できません
        </p>
      </div>
    );
  }

  const handleStepUpdate = () => {
    onUpdate(node.id, stepData);
  };

  const handleBranchUpdate = () => {
    onUpdate(node.id, branchData);
  };

  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: "",
      type: "text",
      required: false,
    };
    setStepData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setStepData((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    }));
  };

  const removeField = (fieldId: string) => {
    setStepData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">
          {isStep ? "ステップ編集" : "分岐編集"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isStep && (
          <>
            <div className="space-y-2">
              <Label>ステップ名</Label>
              <Input
                value={stepData.label}
                onChange={(e) =>
                  setStepData((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="例: 建築主情報入力"
              />
            </div>

            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={stepData.description}
                onChange={(e) =>
                  setStepData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="このステップの説明..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>入力フィールド</Label>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-3 w-3 mr-1" />
                  追加
                </Button>
              </div>

              <div className="space-y-2">
                {stepData.fields.map((field) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-3 space-y-2 bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateField(field.id, { name: e.target.value })
                        }
                        placeholder="フィールド名"
                        className="flex-1 h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          updateField(field.id, {
                            type: v as FormField["type"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        必須
                      </label>
                    </div>
                  </div>
                ))}

                {stepData.fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    フィールドがありません
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {isBranch && (
          <>
            <div className="space-y-2">
              <Label>分岐条件（質問）</Label>
              <Textarea
                value={branchData.question}
                onChange={(e) =>
                  setBranchData((prev) => ({
                    ...prev,
                    question: e.target.value,
                  }))
                }
                placeholder="例: 農地転用が必要ですか？"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>判定方法</Label>
              <Select
                value={branchData.conditionType}
                onValueChange={(v) =>
                  setBranchData((prev) => ({
                    ...prev,
                    conditionType: v as "manual" | "auto",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">ユーザーが選択</SelectItem>
                  <SelectItem value="auto">前ステップの入力値で自動判定</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {branchData.conditionType === "auto" && (
              <div className="space-y-2">
                <Label>判定に使用するフィールド</Label>
                <Input
                  value={branchData.conditionField || ""}
                  onChange={(e) =>
                    setBranchData((prev) => ({
                      ...prev,
                      conditionField: e.target.value,
                    }))
                  }
                  placeholder="フィールドIDを入力"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* フッター */}
      <div className="p-4 border-t space-y-2">
        <Button
          className="w-full"
          onClick={isStep ? handleStepUpdate : handleBranchUpdate}
        >
          変更を適用
        </Button>
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          ノードを削除
        </Button>
      </div>
    </div>
  );
}
