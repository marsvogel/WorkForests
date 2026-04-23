import { Box, Text, useInput } from "ink";
import React, { useMemo, useState } from "react";
import { WORKFOREST_ROOT } from "../constants.js";
import type { Forest } from "../types.js";
import { Header } from "../ui/Header.js";
import { Footer, type StatusTone } from "../ui/Footer.js";
import { SelectList } from "../ui/SelectList.js";
import { theme } from "../ui/theme.js";
import { compactPath, formatRelativeTime, truncateMiddle } from "../ui/format.js";

type Row =
  | { kind: "forest"; forest: Forest }
  | { kind: "new" };

export interface HomeProps {
  forests: Forest[];
  onOpen: (forest: Forest) => void;
  onEdit: (forest: Forest) => void;
  onNew: () => void;
  onDelete: (forest: Forest) => void;
  onRefresh: () => void;
  onQuit: () => void;
  refreshing?: boolean;
  toast?: { message: string; tone: StatusTone };
}

export function Home({
  forests,
  onOpen,
  onEdit,
  onNew,
  onDelete,
  onRefresh,
  onQuit,
  refreshing,
  toast,
}: HomeProps) {
  const rows = useMemo<Row[]>(
    () => [
      ...forests.map<Row>((f) => ({ kind: "forest", forest: f })),
      { kind: "new" },
    ],
    [forests],
  );
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, rows.length - 1);
  const current = rows[safeIndex];

  useInput((input, key) => {
    if (!current) return;
    if (input === "n" || input === "N") {
      onNew();
      return;
    }
    if (input === "e" || input === "E") {
      if (current.kind === "forest") onEdit(current.forest);
      return;
    }
    if (input === "d" || input === "D") {
      if (current.kind === "forest") onDelete(current.forest);
      return;
    }
    if (input === "r" || input === "R") {
      onRefresh();
      return;
    }
    if (input === "q" || key.escape) {
      onQuit();
      return;
    }
    if (key.return) {
      if (current.kind === "new") onNew();
      else onOpen(current.forest);
    }
  });

  const status = toast?.message
    ?? (refreshing ? "scanning…" : `${forests.length} forest${forests.length === 1 ? "" : "s"}`);
  const statusTone: StatusTone = toast?.tone ?? "info";

  return (
    <Box flexDirection="column">
      <Header mode="home" context={compactPath(WORKFOREST_ROOT)} />

      <Box paddingX={1} flexDirection="column">
        <SelectList<Row>
          items={rows}
          selectedIndex={safeIndex}
          onIndexChange={setIndex}
          viewportSize={Math.max(6, (process.stdout.rows || 24) - 8)}
          itemKey={(r, i) => (r.kind === "forest" ? `f-${r.forest.name}` : `new-${i}`)}
          onSelect={(r) => {
            if (r.kind === "new") onNew();
            else onOpen(r.forest);
          }}
          renderItem={(row, { focused }) => {
            if (row.kind === "new") {
              return (
                <Text
                  color={focused ? theme.colors.primary : theme.colors.muted}
                  bold={focused}
                >
                  {theme.symbols.plus} new forest
                </Text>
              );
            }
            return <ForestRow forest={row.forest} focused={focused} />;
          }}
          emptyState={
            <Text color={theme.colors.muted}>no forests yet.</Text>
          }
        />
      </Box>

      <Footer
        mode="home"
        hints={[
          { keys: "↑↓", label: "move" },
          { keys: "⏎", label: current?.kind === "new" ? "create" : "open" },
          { keys: "e", label: "edit" },
          { keys: "n", label: "new" },
          { keys: "d", label: "delete", tone: "danger" },
          { keys: "r", label: "reload" },
          { keys: "q", label: "quit" },
        ]}
        status={status}
        statusTone={statusTone}
      />
    </Box>
  );
}

function ForestRow({
  forest,
  focused,
}: {
  forest: Forest;
  focused: boolean;
}) {
  const wtCount = forest.worktrees.length;
  const missingCount = forest.worktrees.filter((wt) => !wt.exists).length;
  const timeSrc = forest.lastOpenedAt ?? forest.createdAt;
  const timeLabel = formatRelativeTime(timeSrc);
  const timePrefix = forest.lastOpenedAt ? "opened" : "created";

  const repoNames = forest.worktrees.map((wt) => wt.repo.name);
  const shownRepos = repoNames.slice(0, 3);
  const overflow = repoNames.length - shownRepos.length;
  const reposLine =
    shownRepos.length > 0
      ? truncateMiddle(
          shownRepos.join(", ") + (overflow > 0 ? `, +${overflow} more` : ""),
          Math.max(40, (process.stdout.columns || 100) - 12),
        )
      : "no repos";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text
          color={focused ? theme.colors.primary : theme.colors.fg}
          bold
        >
          {forest.name}
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={theme.colors.muted}>
          ◆ {wtCount} worktree{wtCount === 1 ? "" : "s"}
        </Text>
        <Text color={theme.colors.muted}>
          {"    "}◷ {timePrefix} {timeLabel}
        </Text>
        {missingCount > 0 ? (
          <Text color={theme.colors.warning} bold>
            {"    "}
            {theme.symbols.warn} {missingCount} missing
          </Text>
        ) : null}
      </Box>
      <Box paddingLeft={2}>
        <Text color={theme.colors.subtle} dimColor>
          ⌁ {reposLine}
        </Text>
      </Box>
    </Box>
  );
}
