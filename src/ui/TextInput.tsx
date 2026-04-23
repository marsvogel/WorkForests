import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { theme } from "./theme.js";

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  focus = true,
}: TextInputProps) {
  const [cursor, setCursor] = useState<number>(value.length);

  useInput(
    (input, key) => {
      if (!focus) return;
      if (key.return) {
        onSubmit?.(value);
        return;
      }
      if (key.backspace || key.delete) {
        if (cursor > 0) {
          const next = value.slice(0, cursor - 1) + value.slice(cursor);
          onChange(next);
          setCursor(cursor - 1);
        }
        return;
      }
      if (key.leftArrow) {
        setCursor(Math.max(0, cursor - 1));
        return;
      }
      if (key.rightArrow) {
        setCursor(Math.min(value.length, cursor + 1));
        return;
      }
      if (key.ctrl && input === "a") {
        setCursor(0);
        return;
      }
      if (key.ctrl && input === "e") {
        setCursor(value.length);
        return;
      }
      if (key.ctrl && input === "u") {
        onChange(value.slice(cursor));
        setCursor(0);
        return;
      }
      if (key.ctrl && input === "k") {
        onChange(value.slice(0, cursor));
        return;
      }
      if (key.ctrl && input === "w") {
        const left = value.slice(0, cursor);
        const right = value.slice(cursor);
        const trimmed = left.replace(/\s*\S*$/, "");
        onChange(trimmed + right);
        setCursor(trimmed.length);
        return;
      }
      if (key.meta || (key.ctrl && input !== " ")) return;
      if (input && !key.upArrow && !key.downArrow) {
        const printable = input.replace(/[\r\n]/g, "");
        if (printable.length === 0) return;
        const next =
          value.slice(0, cursor) + printable + value.slice(cursor);
        onChange(next);
        setCursor(cursor + printable.length);
      }
    },
    { isActive: focus },
  );

  const showPlaceholder = value.length === 0 && placeholder;
  const effectiveCursor = Math.min(cursor, value.length);

  return (
    <Box>
      <Text color={theme.colors.primary} bold>
        {theme.symbols.prompt}{" "}
      </Text>
      <Text>
        {showPlaceholder ? (
          <>
            {focus ? <Text inverse> </Text> : null}
            <Text color={theme.colors.muted}>
              {focus ? " " : ""}
              {placeholder}
            </Text>
          </>
        ) : (
          <>
            <Text>{value.slice(0, effectiveCursor)}</Text>
            {focus ? (
              <Text inverse>
                {value.charAt(effectiveCursor) || " "}
              </Text>
            ) : (
              <Text>{value.charAt(effectiveCursor) || ""}</Text>
            )}
            <Text>{value.slice(effectiveCursor + 1)}</Text>
          </>
        )}
      </Text>
    </Box>
  );
}
