"use client";

import { Check } from "lucide-react";

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} / {totalSteps}
        </span>
        <span className="text-sm font-medium">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={stepNum} className="flex-1 flex items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" : ""}
                  ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              {stepNum < totalSteps && (
                <div
                  className={`
                    flex-1 h-1 mx-1
                    ${stepNum < currentStep ? "bg-green-500" : "bg-muted"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
