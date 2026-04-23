import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { REPO_ROOT } from "../constants.js";
import { fuzzyFilter } from "../core/fuzzy.js";
import { disambiguateRepoNames, scanRepos } from "../core/repo-scanner.js";
import type { RepoRef } from "../types.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { HighlightedText } from "../ui/HighlightedText.js";
import { Loading } from "../ui/Spinner.js";
import { theme } from "../ui/theme.js";
import { compactPath } from "../ui/format.js";

export interface RepoPickerProps {
  headerMode: string;
  subject?: string;
  mode: "multi" | "single";
  excludeAbsPaths?: Set<string>;
  onConfirm: (repos: RepoRef[]) => void;
  onCancel: () => void;
  reposOverride?: RepoRef[];
}

export function RepoPicker({
  headerMode,
  subject,
  mode,
  excludeAbsPaths,
  onConfirm,
  onCancel,
  reposOverride,
}: RepoPickerProps) {
  const [loading, setLoading] = useState(!reposOverride);
  const [repos, setRepos] = useState<RepoRef[]>(reposOverride ?? []);
  const [query, setQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedAbsPaths, setSelectedAbsPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reposOverride) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await scanRepos();
        const disamb = disambiguateRepoNames(raw);
        if (!cancelled) {
          setRepos(disamb);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String((e as Error).message || e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reposOverride]);

  const filteredRepos = useMemo(() => {
    const pool = excludeAbsPaths
      ? repos.filter((r) => !excludeAbsPaths.has(r.absPath))
      : repos;
    return fuzzyFilter(pool, query, (r) => r.relPath);
  }, [repos, query, excludeAbsPaths]);

  useEffect(() => {
    if (activeIndex >= filteredRepos.length) {
      setActiveIndex(Math.max(0, filteredRepos.length - 1));
    }
  }, [filteredRepos.length, activeIndex]);

  const viewportSize = Math.max(
    6,
    (process.stdout.rows || 24) - 10,
  );

  useEffect(() => {
    if (activeIndex < scrollTop) setScrollTop(activeIndex);
    else if (activeIndex >= scrollTop + viewportSize) {
      setScrollTop(activeIndex - viewportSize + 1);
    }
  }, [activeIndex, scrollTop, viewportSize]);

  const toggleCurrent = () => {
    const current = filteredRepos[activeIndex]?.item;
    if (!current) return;
    if (mode === "single") {
      onConfirm([current]);
      return;
    }
    setSelectedAbsPaths((prev) => {
      const next = new Set(prev);
      if (next.has(current.absPath)) next.delete(current.absPath);
      else next.add(current.absPath);
      return next;
    });
  };

  useInput((input, key) => {
    if (loading) {
      if (key.escape) onCancel();
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      if (mode === "single") {
        toggleCurrent();
        return;
      }
      const selected = repos.filter((r) => selectedAbsPaths.has(r.absPath));
      if (selected.length === 0) return;
      onConfirm(selected);
      return;
    }
    if (key.tab) {
      toggleCurrent();
      return;
    }
    if (key.upArrow) {
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setActiveIndex((i) => Math.min(filteredRepos.length - 1, i + 1));
      return;
    }
    if (key.pageUp) {
      setActiveIndex((i) => Math.max(0, i - viewportSize));
      return;
    }
    if (key.pageDown) {
      setActiveIndex((i) => Math.min(filteredRepos.length - 1, i + viewportSize));
      return;
    }
    if (key.ctrl && input === "a") {
      if (mode === "multi") {
        setSelectedAbsPaths(new Set(filteredRepos.map((r) => r.item.absPath)));
      }
      return;
    }
    if (key.ctrl && input === "u") {
      setQuery("");
      setCursorPos(0);
      return;
    }
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const next = query.slice(0, cursorPos - 1) + query.slice(cursorPos);
        setQuery(next);
        setCursorPos(cursorPos - 1);
        setActiveIndex(0);
      }
      return;
    }
    if (key.leftArrow) {
      setCursorPos((c) => Math.max(0, c - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos((c) => Math.min(query.length, c + 1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      const printable = input.replace(/[\r\n]/g, "");
      if (printable.length === 0) return;
      const next = query.slice(0, cursorPos) + printable + query.slice(cursorPos);
      setQuery(next);
      setCursorPos(cursorPos + printable.length);
      setActiveIndex(0);
    }
  });

  const visible = filteredRepos.slice(scrollTop, scrollTop + viewportSize);
  const aboveCount = scrollTop;
  const belowCount = Math.max(0, filteredRepos.length - (scrollTop + visible.length));

  const repoRootRel = compactPath(REPO_ROOT);

  if (loading) {
    return (
      <Box flexDirection="column">
        <Header mode={headerMode} subject={subject} context={repoRootRel} />
        <Box paddingX={1}>
          <Loading label={`scanning ${repoRootRel}…`} />
        </Box>
        <Footer mode={headerMode} hints={[{ keys: "esc", label: "cancel", tone: "danger" }]} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Header mode={headerMode} subject={subject} context={repoRootRel} />
        <Box paddingX={1}>
          <Text color={theme.colors.error} bold>
            {theme.symbols.cross} scan failed: {error}
          </Text>
        </Box>
        <Footer mode={headerMode} hints={[{ keys: "esc", label: "back", tone: "danger" }]} />
      </Box>
    );
  }

  const counts =
    mode === "multi"
      ? `${filteredRepos.length}/${repos.length} · ${selectedAbsPaths.size} selected`
      : `${filteredRepos.length}/${repos.length}`;

  const statusText = filteredRepos.length === 0 && query.length > 0
    ? `no match for "${query}"`
    : counts;

  return (
    <Box flexDirection="column">
      <Header mode={headerMode} subject={subject} context={repoRootRel} />

      <Box paddingX={1} flexDirection="column">
        <Box>
          <Text color={theme.colors.primary} bold>
            {theme.symbols.prompt}{" "}
          </Text>
          {query.length === 0 ? (
            <>
              <Text inverse> </Text>
              <Text color={theme.colors.muted}> filter…</Text>
            </>
          ) : (
            <Text>
              <Text>{query.slice(0, cursorPos)}</Text>
              <Text inverse>{query.charAt(cursorPos) || " "}</Text>
              <Text>{query.slice(cursorPos + 1)}</Text>
            </Text>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column">
          {aboveCount > 0 ? (
            <Text color={theme.colors.subtle} dimColor>
              {"  "}
              {theme.symbols.ellipsis} {aboveCount} above
            </Text>
          ) : null}
          {visible.map((r, i) => {
            const index = scrollTop + i;
            const focused = index === activeIndex;
            const selected =
              mode === "multi" && selectedAbsPaths.has(r.item.absPath);
            const repoLabel = r.item.relPath;
            const lastSeg = r.item.relPath.split("/").pop() || r.item.name;
            const showDisambig = r.item.name !== lastSeg;
            return (
              <Box key={r.item.absPath} flexDirection="row">
                <Text color={focused ? theme.colors.primary : theme.colors.muted}>
                  {focused ? theme.symbols.cursor : " "}{" "}
                </Text>
                {mode === "multi" ? (
                  <Text color={selected ? theme.colors.success : theme.colors.subtle}>
                    {selected ? theme.symbols.check : " "}{" "}
                  </Text>
                ) : null}
                <HighlightedText
                  text={repoLabel}
                  indices={r.indices}
                  color={theme.colors.fg}
                  highlightColor={theme.colors.primary}
                  bold={focused}
                />
                {showDisambig ? (
                  <Text color={theme.colors.subtle} dimColor>
                    {"  "}
                    {r.item.name}
                  </Text>
                ) : null}
              </Box>
            );
          })}
          {belowCount > 0 ? (
            <Text color={theme.colors.subtle} dimColor>
              {"  "}
              {theme.symbols.ellipsis} {belowCount} below
            </Text>
          ) : null}
        </Box>
      </Box>

      <Footer
        mode={headerMode}
        hints={
          mode === "multi"
            ? [
                { keys: "↑↓", label: "move" },
                { keys: "⇥", label: "toggle" },
                { keys: "⏎", label: "confirm" },
                { keys: "^a", label: "all" },
                { keys: "esc", label: "back", tone: "danger" },
              ]
            : [
                { keys: "↑↓", label: "move" },
                { keys: "⏎", label: "pick" },
                { keys: "esc", label: "back", tone: "danger" },
              ]
        }
        status={statusText}
        statusTone={filteredRepos.length === 0 && query.length > 0 ? "warning" : "info"}
      />
    </Box>
  );
}
