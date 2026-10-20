"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  onFinish?: () => void;
  finishLabel?: string;
  isLastStepValid?: boolean;
}

export function Wizard({
  steps,
  currentStep,
  onStepChange,
  children,
  onFinish,
  finishLabel = "Complete",
  isLastStepValid = true,
}: WizardProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => i < currentStep && onStepChange(i)}
                className="flex flex-col items-center gap-2"
                disabled={i > currentStep}
              >
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all",
                    done && "bg-success text-success-foreground",
                    active &&
                      "bg-primary text-primary-foreground shadow-glow-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </button>
              {i < steps.length - 1 ? (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded",
                    i < currentStep ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-[16px] border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-foreground">
          {steps[currentStep].title}
        </h2>
        {steps[currentStep].description ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={isFirst}
          onClick={() => onStepChange(currentStep - 1)}
        >
          Previous
        </Button>
        {isLast ? (
          <Button disabled={!isLastStepValid} onClick={onFinish}>
            {finishLabel}
          </Button>
        ) : (
          <Button onClick={() => onStepChange(currentStep + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}
