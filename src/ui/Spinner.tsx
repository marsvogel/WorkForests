import { Text } from "ink";
import InkSpinner from "ink-spinner";
import React from "react";
import { theme } from "./theme.js";

export interface LoadingProps {
  label?: string;
}

export function Loading({ label }: LoadingProps) {
  return (
    <Text>
      <Text color={theme.colors.primary}>
        <InkSpinner type="line" />
      </Text>
      {label ? (
        <Text color={theme.colors.fg}>
          {"  "}
          {label}
        </Text>
      ) : null}
    </Text>
  );
}
