import { Box, Text, useInput } from "ink";
import React from "react";
import type { Forest } from "../types.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { theme } from "../ui/theme.js";
import { compactPath } from "../ui/format.js";

export interface ConfirmDeleteForestProps {
  forest: Forest;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteForest({
  forest,
  onConfirm,
  onCancel,
}: ConfirmDeleteForestProps) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (input === "n" || input === "N") {
      onCancel();
      return;
    }
    if (input === "y" || input === "Y" || key.return) {
      onConfirm();
    }
  });

  const dirtyCount = forest.worktrees.filter(
    (wt) => wt.status && !wt.status.clean,
  ).length;

  const wtCount = forest.worktrees.length;

  return (
    <Box flexDirection="column">
      <Header mode="delete" subject={forest.name} context={compactPath(forest.path)} />

      <Box paddingX={1} flexDirection="column">
        <Box>
          <Text color={theme.colors.error} bold>
            {theme.symbols.cross}
          </Text>
          <Text color={theme.colors.fg}> delete forest {forest.name}?</Text>
        </Box>

        <Box marginTop={1} paddingLeft={2} flexDirection="column">
          <Text color={theme.colors.muted}>
            dir <Text color={theme.colors.fg}>{compactPath(forest.path)}</Text> will be removed
          </Text>
          <Text color={theme.colors.muted}>
            {wtCount} worktree{wtCount === 1 ? "" : "s"} will be unregistered
          </Text>
          <Text color={theme.colors.muted}>
            branch <Text color={theme.colors.fg}>{forest.name}</Text> will be deleted in all repos
          </Text>
          {dirtyCount > 0 ? (
            <Text color={theme.colors.warning} bold>
              {theme.symbols.warn} {dirtyCount} worktree{dirtyCount === 1 ? "" : "s"} with uncommitted changes — will be lost
            </Text>
          ) : null}
        </Box>
      </Box>

      <Footer
        mode="delete"
        hints={[
          { keys: "y/⏎", label: "delete", tone: "danger" },
          { keys: "n/esc", label: "cancel" },
        ]}
      />
    </Box>
  );
}
