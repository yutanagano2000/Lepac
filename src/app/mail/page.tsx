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
  const [copiedBody, setCopiedBody] = React.useState(false);
  const [copiedTitle, setCopiedTitle] = React.useState(false);

  const done = step >= QUESTIONS.length;
  const question = QUESTIONS[step];
  const emailText = React.useMemo(() => (done ? buildEmail(answers) : ""), [done, answers]);
  
  // メールタイトルを生成
  const emailTitle = React.useMemo(() => {
    if (!done) return "";
    const content = answers.content;
    if (content === "ownership-transfer") {
      return "所有権移転登記のお願い（会社名_P番号)";
    }
    return "";
  }, [done, answers]);

  const choose = (qId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionId }));
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));
  const reset = () => {
    setAnswers({});
    setStep(0);
    setCopiedBody(false);
    setCopiedTitle(false);
  };

  const onCopyBody = async () => {
    if (!emailText) return;
    await navigator.clipboard.writeText(emailText);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 1500);
  };

  const onCopyTitle = async () => {
    if (!emailTitle) return;
    await navigator.clipboard.writeText(emailTitle);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 1500);
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
                <Button type="button" variant="ghost" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  最初から
                </Button>
              </div>

              {/* メールタイトルカード */}
              {emailTitle && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                    {emailTitle}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onCopyTitle}
                    disabled={!emailTitle}
                    aria-label="タイトルをコピー"
                    title="コピー"
                  >
                    {copiedTitle ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* メール文面カード */}
              <div className="rounded-2xl border border-border bg-card p-4">
                {emailText ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-card-foreground">
                        {emailText}
                      </pre>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onCopyBody}
                        className="shrink-0"
                        aria-label="本文をコピー"
                        title="コピー"
                      >
                        {copiedBody ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    （この条件のメール文面は未登録です）
                  </p>
                )}
              </div>

              {/* 添付資料の注意書き */}
              {emailText && (
                <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-full bg-amber-500/20 p-2">
                      <svg
                        className="h-5 w-5 text-amber-600 dark:text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        添付資料をお忘れなく
                      </p>
                      <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                          土地売買契約書
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                          印鑑登録証明書
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                          身分証明書
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400"></span>
                          不動産登記
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

