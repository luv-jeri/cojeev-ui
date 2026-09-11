"use client";

import * as React from "react";
import {
  Questionnaire,
  QuestionnaireProgress,
  QuestionnaireQuestion,
  QuestionnaireOptions,
  QuestionnaireOption,
  QuestionnaireOptionBody,
  type SelectorSize,
} from "@/registry/cojeev/ui/questionnaire";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

export function QuestionnaireExample({
  variant = "stacked",
  size = "default",
  shape = "organic",
  indicator = "auto",
  showIndicator = true,
}: ExampleProps) {
  const id = React.useId();
  const [answers, setAnswers] = React.useState(["", ""]);
  const [step, setStep] = React.useState(0);
  const [saved, setSaved] = React.useState("");
  const headings = React.useRef<Array<HTMLLegendElement | null>>([]);
  const focusNext = React.useRef(false);
  const presentation =
    variant === "journey" || variant === "worksheet" ? variant : "stacked";
  const questions: Array<{
    title: string;
    hint: string;
    options: Array<{
      value: string;
      label: string;
      detail: string;
      disabled?: boolean;
    }>;
  }> = [
    {
      title: "Where should we begin?",
      hint: "Choose the way into your next idea.",
      options: [
        {
          value: "plan",
          label: "Make a little room",
          detail: "A clear plan, with just enough structure.",
        },
        {
          value: "try",
          label: "Try something small",
          detail: "A small experiment, with room to change your mind.",
        },
        {
          value: "explore",
          label: "Follow a good question",
          detail: "Collect a few clues before deciding.",
        },
      ],
    },
    {
      title: "What rhythm feels right?",
      hint: "A little consistency leaves room to play.",
      options: [
        {
          value: "daily",
          label: "Every day",
          detail: "A small moment, woven into the day.",
        },
        {
          value: "weekly",
          label: "Every week",
          detail: "One unhurried session to go a little deeper.",
        },
        {
          value: "managed",
          label: "Workspace schedule",
          detail: "Set by your team. Unavailable in this example.",
          disabled: true,
        },
      ],
    },
  ];
  const completed = answers.filter(Boolean).length;
  React.useEffect(() => {
    if (focusNext.current) {
      headings.current[step]?.focus();
      focusNext.current = false;
    }
  }, [step]);
  const move = (next: number) => {
    focusNext.current = true;
    setStep(next);
  };
  const startAgain = () => {
    setAnswers(["", ""]);
    setSaved("");
    move(0);
  };
  const save = () => {
    if (completed < 2) return;
    const first =
      answers[0] === "try"
        ? "A small experiment"
        : answers[0] === "plan"
          ? "A clear plan"
          : "A good question";
    const rhythm = answers[1] === "daily" ? "Every day" : "Every week";
    setSaved(`${first} · ${rhythm}. Kept in this example only.`);
  };
  return (
    <form
      className="v-questionnaire-example"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      onReset={startAgain}
    >
      <Questionnaire presentation={presentation}>
        <header className="v-questionnaire-example__intro">
          <span className="v-questionnaire-example__tab" aria-hidden="true">
            <Icon name="sparkles" />
          </span>
          <div>
            <p>A small beginning</p>
            <h3>Make room for your next idea.</h3>
          </div>
        </header>
        <QuestionnaireProgress value={completed} total={2} />
        <div className="v-questionnaire-example__questions">
          {questions.map((question, index) => (
            <QuestionnaireQuestion
              key={question.title}
              hidden={presentation === "journey" && step !== index}
              inert={presentation === "journey" && step !== index}
            >
              <legend
                id={`${id}-question-${index}`}
                tabIndex={-1}
                ref={(node) => {
                  headings.current[index] = node;
                }}
              >
                <span className="v-questionnaire-example__heading">
                  <span
                    className="v-questionnaire-example__number"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="v-questionnaire-example__title">
                    {question.title}
                  </span>
                </span>
              </legend>
              <p
                className="v-questionnaire-example__hint"
                id={`${id}-hint-${index}`}
              >
                {question.hint}
              </p>
              <QuestionnaireOptions
                name={`${id}-answer-${index}`}
                aria-labelledby={`${id}-question-${index}`}
                aria-describedby={`${id}-hint-${index}`}
                value={answers[index]}
                onValueChange={(value) => {
                  setAnswers((current) =>
                    current.map((answer, position) =>
                      position === index ? value : answer,
                    ),
                  );
                  setSaved("");
                }}
                selectorShape={shape}
                selectorSize={size as SelectorSize}
                selectorIndicator={indicator}
                showSelectorIndicator={showIndicator}
                selectorTone={index === 0 ? "pink" : "blue"}
              >
                {question.options.map((option) => (
                  <QuestionnaireOption
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    inputProps={{ required: true }}
                  >
                    <QuestionnaireOptionBody>
                      <b>{option.label}</b>
                      <small>{option.detail}</small>
                    </QuestionnaireOptionBody>
                  </QuestionnaireOption>
                ))}
              </QuestionnaireOptions>
            </QuestionnaireQuestion>
          ))}
        </div>
        <footer className="v-questionnaire-example__footer">
          {presentation === "journey" && (
            <Button
              variant="ghost"
              onClick={() => move(step - 1)}
              disabled={step === 0}
            >
              <Icon name="arrow-left" size="sm" />
              Back
            </Button>
          )}
          {presentation === "journey" && step === 0 ? (
            <Button
              variant="secondary"
              onClick={() => move(1)}
              disabled={!answers[0]}
            >
              Next question
              <Icon name="arrow-right" size="sm" />
            </Button>
          ) : (
            <Button variant="accent" type="submit" disabled={completed !== 2}>
              Save my plan
              <Icon name="arrow-up-right" size="sm" />
            </Button>
          )}
          <Button variant="ghost" type="reset">
            Start again
          </Button>
        </footer>
        <p className="v-questionnaire-example__result" role="status">
          {saved ||
            (completed === 2
              ? "Your two answers are ready. Save a local summary when you’re happy."
              : `${2 - completed} ${completed === 1 ? "question" : "questions"} left. You can change any answer.`)}
        </p>
      </Questionnaire>
    </form>
  );
}
