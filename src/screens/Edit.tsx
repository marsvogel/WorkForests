import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import {
  addWorktreeToForest,
  refreshWorktreeStatuses,
  removeWorktreeFromForest,
  renameForest as renameForestAction,
  loadForest,
} from "../core/forest.js";
import { validateName } from "../core/paths.js";
import type { Forest, Worktree } from "../types.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { Loading } from "../ui/Spinner.js";
import { TextInput } from "../ui/TextInput.js";
import { theme } from "../ui/theme.js";
import { RepoPicker } from "./RepoPicker.js";
import { compactPath, truncateMiddle } from "../ui/format.js";

type Row =
  | { kind: "worktree"; worktree: Worktree }
  | { kind: "add" };

type Mode =
  | { kind: "list" }
  | { kind: "renameForest"; value: string }
  | { kind: "addPicker" }
  | { kind: "confirmRemove"; worktree: Worktree }
  | { kind: "busy"; label: string };

export interface EditProps {
  forest: Forest;
  existingForestNames: Set<string>;
  onBack: () => void;
  onError: (msg: string) => void;
  onInfo: (msg: string) => void;
}

const COL_REPO = 36;

export function Edit({
  forest: initialForest,
  existingForestNames,
  onBack,
  onError,
  onInfo,
}: EditProps) {
  const [forest, setForest] = useState<Forest>(initialForest);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [index, setIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshed = await refreshWorktreeStatuses(forest);
      if (!cancelled) {
        setForest(refreshed);
        setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forest.name, forest.worktrees.length]);

  const rows = useMemo<Row[]>(
    () => [
      ...forest.worktrees.map<Row>((wt) => ({ kind: "worktree", worktree: wt })),
      { kind: "add" },
    ],
    [forest],
  );

  useInput(
    (input, key) => {
      if (mode.kind !== "list") return;
      const current = rows[index];
      if (!current) return;
      if (key.escape) {
        onBack();
        return;
      }
      if (key.upArrow) {
        setIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setIndex((i) => Math.min(rows.length - 1, i + 1));
        return;
      }
      if (input === "a" || input === "A") {
        setMode({ kind: "addPicker" });
        return;
      }
      if (input === "r" || input === "R") {
        setMode({ kind: "renameForest", value: forest.name });
        return;
      }
      if (input === "d" || input === "D") {
        if (current.kind === "worktree") {
          setMode({ kind: "confirmRemove", worktree: current.worktree });
        }
        return;
      }
      if (key.return) {
        if (current.kind === "add") {
          setMode({ kind: "addPicker" });
        }
        return;
      }
    },
    { isActive: mode.kind === "list" },
  );

  if (mode.kind === "addPicker") {
    const excluded = new Set(forest.worktrees.map((wt) => wt.repo.absPath));
    return (
      <RepoPicker
        mode="single"
        subject={forest.name}
        headerMode="add"
        excludeAbsPaths={excluded}
        onConfirm={async (repos) => {
          const repo = repos[0];
          if (!repo) return;
          setMode({ kind: "busy", label: `adding worktree ${repo.name}…` });
          try {
            const updated = await addWorktreeToForest({
              forest,
              repo,
              onStep: (msg) => setMode({ kind: "busy", label: msg }),
            });
            const refreshed = await refreshWorktreeStatuses(updated);
            setForest(refreshed);
            onInfo(`added ${repo.name}`);
            setMode({ kind: "list" });
          } catch (err) {
            onError(String((err as Error).message || err));
            setMode({ kind: "list" });
          }
        }}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }

  if (mode.kind === "renameForest") {
    return (
      <RenameForestPrompt
        currentName={forest.name}
        value={mode.value}
        existingNames={existingForestNames}
        onChange={(v) => setMode({ kind: "renameForest", value: v })}
        onCancel={() => setMode({ kind: "list" })}
        onSubmit={async (newName) => {
          if (newName === forest.name) {
            setMode({ kind: "list" });
            return;
          }
          setMode({ kind: "busy", label: `renaming to ${newName}…` });
          try {
            const updated = await renameForestAction({
              forest,
              newName,
              onStep: (msg) => setMode({ kind: "busy", label: msg }),
            });
            const refreshed = await refreshWorktreeStatuses(updated);
            setForest(refreshed);
            onInfo(`renamed to ${newName}`);
            setMode({ kind: "list" });
          } catch (err) {
            onError(String((err as Error).message || err));
            const reread = await loadForest(forest.name).catch(() => null);
            if (reread) setForest(reread);
            setMode({ kind: "list" });
          }
        }}
      />
    );
  }

  if (mode.kind === "confirmRemove") {
    const wt = mode.worktree;
    const hasChanges = wt.status ? !wt.status.clean : false;
    return (
      <ConfirmRemoveWorktree
        worktree={wt}
        branchName={forest.name}
        hasChanges={hasChanges}
        onCancel={() => setMode({ kind: "list" })}
        onConfirm={async () => {
          setMode({ kind: "busy", label: "removing…" });
          try {
            const updated = await removeWorktreeFromForest({
              forest,
              worktree: wt,
              onStep: (msg) => setMode({ kind: "busy", label: msg }),
            });
            const refreshed = await refreshWorktreeStatuses(updated);
            setForest(refreshed);
            onInfo(`removed ${wt.repo.name}`);
            setMode({ kind: "list" });
          } catch (err) {
            onError(String((err as Error).message || err));
            setMode({ kind: "list" });
          }
        }}
      />
    );
  }

  if (mode.kind === "busy") {
    return (
      <Box flexDirection="column">
        <Header mode="edit" subject={forest.name} />
        <Box paddingX={1}>
          <Loading label={mode.label} />
        </Box>
        <Footer mode="edit" hints={[]} />
      </Box>
    );
  }

  const wtCount = forest.worktrees.length;
  const status = refreshing
    ? "loading status…"
    : `${wtCount} worktree${wtCount === 1 ? "" : "s"}`;

  return (
    <Box flexDirection="column">
      <Header mode="edit" subject={forest.name} context={compactPath(forest.path)} />

      <Box paddingX={1} flexDirection="column">
        {forest.worktrees.length > 0 ? (
          <Box paddingLeft={2}>
            <Text color={theme.colors.subtle} dimColor>
              {"REPO".padEnd(COL_REPO)}STATUS
            </Text>
          </Box>
        ) : null}

        {rows.map((row, i) => {
          const focused = i === index;
          if (row.kind === "add") {
            return (
              <Box key="add-row" marginTop={1}>
                <Text color={focused ? theme.colors.primary : theme.colors.muted}>
                  {focused ? theme.symbols.cursor : " "}{" "}
                </Text>
                <Text
                  color={focused ? theme.colors.primary : theme.colors.muted}
                  bold={focused}
                >
                  {theme.symbols.plus} add worktree
                </Text>
              </Box>
            );
          }
          const wt = row.worktree;
          return (
            <WorktreeRow
              key={wt.repo.absPath}
              worktree={wt}
              focused={focused}
              refreshing={refreshing}
            />
          );
        })}
      </Box>

      <Footer
        mode="edit"
        hints={[
          { keys: "↑↓", label: "move" },
          { keys: "r", label: "rename" },
          { keys: "a", label: "add" },
          { keys: "d", label: "remove", tone: "danger" },
          { keys: "esc", label: "back" },
        ]}
        status={status}
      />
    </Box>
  );
}

function WorktreeRow({
  worktree,
  focused,
  refreshing,
}: {
  worktree: Worktree;
  focused: boolean;
  refreshing: boolean;
}) {
  const status = worktree.status;
  const missing = !worktree.exists;
  const label = truncateMiddle(worktree.repo.name, COL_REPO).padEnd(COL_REPO);

  return (
    <Box>
      <Text color={focused ? theme.colors.primary : theme.colors.muted}>
        {focused ? theme.symbols.cursor : " "}{" "}
      </Text>
      <Text color={focused ? theme.colors.primary : theme.colors.fg} bold={focused}>
        {label}
      </Text>
      {renderStatus(status, missing, refreshing)}
    </Box>
  );
}

function renderStatus(
  status: Worktree["status"],
  missing: boolean,
  refreshing: boolean,
) {
  if (missing) {
    return (
      <Text color={theme.colors.error} bold>
        {theme.symbols.cross} missing
      </Text>
    );
  }
  if (!status) {
    if (refreshing) {
      return <Text color={theme.colors.muted}>…</Text>;
    }
    return <Text color={theme.colors.muted}>—</Text>;
  }
  if (status.clean && status.ahead === 0 && status.behind === 0) {
    return (
      <Text color={theme.colors.success} bold>
        {theme.symbols.check}
      </Text>
    );
  }
  const parts: React.ReactNode[] = [];
  if (!status.clean) {
    parts.push(
      <Text key="changes" color={theme.colors.warning} bold>
        {theme.symbols.warn} +{status.changedFiles}
      </Text>,
    );
  }
  if (status.ahead > 0 || status.behind > 0) {
    const ab =
      (status.ahead > 0 ? `${theme.symbols.arrowUp}${status.ahead}` : "") +
      (status.behind > 0 ? `${theme.symbols.arrowDown}${status.behind}` : "");
    parts.push(
      <Text key="ab" color={theme.colors.muted}>
        {parts.length > 0 ? "  " : ""}
        {ab}
      </Text>,
    );
  }
  return <>{parts}</>;
}

function RenameForestPrompt({
  currentName,
  value,
  existingNames,
  onChange,
  onSubmit,
  onCancel,
}: {
  currentName: string;
  value: string;
  existingNames: Set<string>;
  onChange: (v: string) => void;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const trimmed = value.trim();
  const err =
    trimmed === currentName
      ? null
      : !trimmed
        ? "name required"
        : validateName(trimmed) ||
          (existingNames.has(trimmed)
            ? `"${trimmed}" already exists`
            : null);
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });
  return (
    <Box flexDirection="column">
      <Header mode="rename" subject={currentName} />
      <Box paddingX={1}>
        <Text color={theme.colors.muted}>name  </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={(v) => {
            if (!err) onSubmit(v.trim());
          }}
        />
      </Box>
      <Footer
        mode="rename"
        hints={[
          { keys: "⏎", label: "apply" },
          { keys: "esc", label: "cancel", tone: "danger" },
        ]}
        status={err ?? (trimmed === currentName ? "no change" : undefined)}
        statusTone={err ? "error" : "info"}
      />
    </Box>
  );
}

function ConfirmRemoveWorktree({
  worktree,
  branchName,
  hasChanges,
  onConfirm,
  onCancel,
}: {
  worktree: Worktree;
  branchName: string;
  hasChanges: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.escape) onCancel();
    if (input === "n" || input === "N") onCancel();
    if (input === "y" || input === "Y" || key.return) onConfirm();
  });
  return (
    <Box flexDirection="column">
      <Header mode="remove" subject={worktree.repo.name} context={compactPath(worktree.path)} />

      <Box paddingX={1} flexDirection="column">
        <Box>
          <Text color={theme.colors.error} bold>
            {theme.symbols.cross}
          </Text>
          <Text color={theme.colors.fg}> remove worktree?</Text>
        </Box>
        <Box marginTop={1} flexDirection="column" paddingLeft={2}>
          <Text color={theme.colors.muted}>
            dir <Text color={theme.colors.fg}>{compactPath(worktree.path)}</Text> will be deleted
          </Text>
          <Text color={theme.colors.muted}>
            branch <Text color={theme.colors.fg}>{branchName}</Text> stays in {worktree.repo.relPath}
          </Text>
          {hasChanges ? (
            <Text color={theme.colors.warning} bold>
              {theme.symbols.warn} uncommitted changes will be lost
            </Text>
          ) : null}
        </Box>
      </Box>

      <Footer
        mode="remove"
        hints={[
          { keys: "y/⏎", label: "remove", tone: "danger" },
          { keys: "n/esc", label: "cancel" },
        ]}
      />
    </Box>
  );
}
