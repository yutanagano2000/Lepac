 "use client";

import * as React from "react";
import { ChevronLeft, RotateCcw, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; label: string };
type Question = { id: string; title: string; options: Option[] };

const QUESTIONS: Question[] = [
  {
    id: "content",
    title: "Q1. メールの内容",
    options: [{ id: "ownership-transfer", label: "所有権移転登記" }],
  },
  {
    id: "deed",
    title: "Q2. 権利証",
    options: [
      { id: "lost", label: "紛失" },
      { id: "checked", label: "お預かりしていないが確認済み" },
    ],
  },
  {
    id: "land-use",
    title: "Q3. 地目変更",
    options: [
      { id: "yes", label: "あり" },
      { id: "no", label: "なし" },
    ],
  },
];

function buildEmail(answers: Record<string, string>) {
  const content = answers.content;
  const deed = answers.deed;
  const landUse = answers["land-use"];

  // 所有権移転登記 ⇒ 紛失 ⇒ あり
  if (content === "ownership-transfer" && deed === "lost" && landUse === "yes") {
    return [
      "吉村司法書士事務所",
      "吉村　様",
      "",
      "お世話になっております。",
      "Person Energyです。",
      "所有権移転登記をお願いいたします。",
      "権利証は紛失しておりますので、事前通知でお願いいたします。",
      "",
      "また、直近で地目変更をしておりますので、近傍評価の請求をお願いいたします。",
      "（概算で先に御見積等いただけると助かります）",
      "",
      "決済日はまだ未定です。",
      "",
      "何卒よろしくお願いいたします。",
    ].join("\n");
  }

  // 所有権移転登記 ⇒ お預かりしていないが確認済み ⇒ あり
  if (content === "ownership-transfer" && deed === "checked" && landUse === "yes") {
    return [
      "吉村司法書士事務所",
      "吉村　様",
      "",
      "お世話になっております。",
      "Person Energyです。",
      "所有権移転登記をお願いいたします。",
      "権利証はお預かりしておりませんが、確認はしています。",
      "入金後にお預かりの予定です。",
      "（登記申請書を送り返していただくときに、一緒に送っていただくよう案内していただけると助かります）",
      "",
      "また、直近で地目変更・相続をしておりますので、近傍評価の請求をお願いいたします。",
      "（概算で先に御見積等いただけると助かります）",
      "",
      "決済日はまだ未定です。",
      "",
      "何卒よろしくお願いいたします。",
    ].join("\n");
  }

  return "";
}

export default function MailPage() {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [copied, setCopied] = React.useState(false);

  const done = step >= QUESTIONS.length;
  const question = QUESTIONS[step];
  const emailText = React.useMemo(() => (done ? buildEmail(answers) : ""), [done, answers]);

  const choose = (qId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionId }));
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setAnswers({});
    setStep(0);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!emailText) return;
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background px-6">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center py-10">
        <div className="w-full space-y-4">
          {!done ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  質問 {step + 1} / {QUESTIONS.length}
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={back}
                    disabled={step === 0}
                    aria-label="戻る"
                    title="戻る"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={reset}
                    aria-label="最初から"
                    title="最初から"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{question.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {question.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => choose(question.id, opt.id)}
                        className="rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-accent"
                      >
                        <p className="text-base">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">メール文面</h1>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onCopy}
                    disabled={!emailText}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        コピーしました
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        コピー
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="ghost" onClick={reset}>
                    <RotateCcw className="h-4 w-4" />
                    最初から
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                {emailText ? (
                  <pre className="whitespace-pre-wrap break-words text-sm text-card-foreground">
                    {emailText}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    （この条件のメール文面は未登録です）
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

