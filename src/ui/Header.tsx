import { Box, Text } from "ink";
import React from "react";
import { compactPath, truncateMiddle } from "./format.js";
import { theme } from "./theme.js";
import { useTerminalColumns } from "./useTerminalColumns.js";

export interface HeaderProps {
  mode: string;
  subject?: string;
  context?: string;
}

export function Header({ mode, subject, context }: HeaderProps) {
  const columns = useTerminalColumns();
  const leftLen = mode.length + (subject ? subject.length + 3 : 0);
  const available = Math.max(10, columns - leftLen - 4);
  const ctx = context ? truncateMiddle(compactPath(context), available) : null;

  return (
    <Box
      flexDirection="row"
      paddingX={1}
      marginBottom={1}
      justifyContent="space-between"
    >
      <Box flexShrink={0}>
        <Text color={theme.colors.primary} bold>
          {mode}
        </Text>
        {subject ? (
          <>
            <Text color={theme.colors.muted}> · </Text>
            <Text color={theme.colors.fg} bold>
              {subject}
            </Text>
          </>
        ) : null}
      </Box>
      {ctx ? (
        <Box flexShrink={1}>
          <Text color={theme.colors.subtle} dimColor>
            {ctx}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
