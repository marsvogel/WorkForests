import { Box, Text } from "ink";
import React, { useEffect, useRef, useState } from "react";
import { createForest } from "../core/forest.js";
import type { Forest, RepoRef } from "../types.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { Loading } from "../ui/Spinner.js";
import { theme } from "../ui/theme.js";
import { WORKFOREST_ROOT } from "../constants.js";
import path from "node:path";
import { compactPath } from "../ui/format.js";

export interface CreatingProps {
  name: string;
  repos: RepoRef[];
  onDone: (forest: Forest) => void;
  onError: (message: string) => void;
}

export function Creating({ name, repos, onDone, onError }: CreatingProps) {
  const [step, setStep] = useState<string>("starting");
  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = 1 + repos.length * 3;

  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const forest = await createForest({
          name,
          repos,
          onStep: (msg) => {
            if (cancelled) return;
            setStep(msg);
            setStepIndex((i) => Math.min(totalSteps, i + 1));
          },
        });
        if (!cancelled) onDoneRef.current(forest);
      } catch (e) {
        if (!cancelled) onErrorRef.current(String((e as Error).message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, repos, totalSteps]);

  const contextPath = path.join(WORKFOREST_ROOT, name);

  return (
    <Box flexDirection="column">
      <Header mode="creating" subject={name} context={compactPath(contextPath)} />

      <Box paddingX={1}>
        <Text color={theme.colors.subtle} dimColor>
          [{Math.min(stepIndex, totalSteps)}/{totalSteps}]{" "}
        </Text>
        <Loading label={step} />
      </Box>

      <Footer mode="creating" hints={[]} />
    </Box>
  );
}
