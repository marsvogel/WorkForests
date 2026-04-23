import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { WORKFOREST_ROOT } from "../constants.js";
import { validateName } from "../core/paths.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { TextInput } from "../ui/TextInput.js";
import { theme } from "../ui/theme.js";
import { compactPath } from "../ui/format.js";

export interface CreateNameProps {
  existingForestNames: Set<string>;
  initialName?: string;
  onNext: (name: string) => void;
  onCancel: () => void;
}

export function CreateName({
  existingForestNames,
  initialName = "",
  onNext,
  onCancel,
}: CreateNameProps) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(initialName.length > 0);
  const trimmed = name.trim();
  const err = trimmed.length === 0 && !touched ? null : getError(name, existingForestNames);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  const handleChange = (v: string) => {
    setName(v);
    if (!touched && v.length > 0) setTouched(true);
  };

  return (
    <Box flexDirection="column">
      <Header mode="new" subject="1/2" context={compactPath(WORKFOREST_ROOT)} />

      <Box paddingX={1} flexDirection="column">
        <Box>
          <Text color={theme.colors.muted}>name  </Text>
          <TextInput
            value={name}
            onChange={handleChange}
            onSubmit={(v) => {
              setTouched(true);
              if (!getError(v, existingForestNames)) onNext(v.trim());
            }}
            placeholder="e.g. PROJ-1234"
          />
        </Box>
      </Box>

      <Footer
        mode="new"
        hints={[
          { keys: "⏎", label: "next" },
          { keys: "esc", label: "cancel", tone: "danger" },
        ]}
        status={err ?? undefined}
        statusTone={err ? "error" : "info"}
      />
    </Box>
  );
}

function getError(
  name: string,
  existing: Set<string>,
): string | null {
  const trimmed = name.trim();
  const err = validateName(trimmed);
  if (err) return err;
  if (existing.has(trimmed)) return `"${trimmed}" already exists`;
  return null;
}
