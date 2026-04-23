import { Text } from "ink";
import React from "react";
import { theme } from "./theme.js";

export interface HighlightedTextProps {
  text: string;
  indices: readonly number[];
  color?: string;
  highlightColor?: string;
  bold?: boolean;
}

export function HighlightedText({
  text,
  indices,
  color,
  highlightColor = theme.colors.primary,
  bold = false,
}: HighlightedTextProps) {
  if (!indices || indices.length === 0) {
    return (
      <Text color={color} bold={bold}>
        {text}
      </Text>
    );
  }
  const set = new Set(indices);
  const chars: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (set.has(i)) {
      chars.push(
        <Text key={i} color={highlightColor} bold>
          {ch}
        </Text>,
      );
    } else {
      chars.push(
        <Text key={i} color={color} bold={bold}>
          {ch}
        </Text>,
      );
    }
  }
  return <Text>{chars}</Text>;
}
