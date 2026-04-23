import { Box, Text } from "ink";
import React from "react";
import { theme } from "./theme.js";

export interface Hint {
  keys: string;
  label: string;
  tone?: "default" | "danger";
}

export type StatusTone = "info" | "success" | "warning" | "error";

export interface FooterProps {
  mode: string;
  hints: Hint[];
  status?: string;
  statusTone?: StatusTone;
}

function toneColor(tone: StatusTone | undefined) {
  if (tone === "success") return theme.colors.success;
  if (tone === "warning") return theme.colors.warning;
  if (tone === "error") return theme.colors.error;
  return theme.colors.muted;
}

export function Footer({ mode, hints, status, statusTone }: FooterProps) {
  return (
    <Box
      flexDirection="row"
      marginTop={1}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box flexShrink={0}>
        <Text color="black" backgroundColor={theme.colors.primary} bold>
          {" "}
          {mode}
          {" "}
        </Text>
        {hints.length > 0 ? <Text>{"  "}</Text> : null}
        {hints.map((h, i) => (
          <Text key={`${h.keys}-${i}`}>
            <Text
              color={
                h.tone === "danger" ? theme.colors.error : theme.colors.primary
              }
              bold
            >
              {h.keys}
            </Text>
            <Text color={theme.colors.muted}> {h.label}</Text>
            {i < hints.length - 1 ? (
              <Text color={theme.colors.muted}>{"  "}</Text>
            ) : null}
          </Text>
        ))}
      </Box>
      {status ? (
        <Box flexShrink={1} paddingLeft={2}>
          <Text color={toneColor(statusTone)}>{status}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
