import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import type { Forest, Ide } from "../types.js";
import { IDE_LABEL, isIdeAvailable } from "../core/ide.js";
import { Footer } from "../ui/Footer.js";
import { Header } from "../ui/Header.js";
import { theme } from "../ui/theme.js";
import { compactPath } from "../ui/format.js";

interface IdeOption {
  ide: Ide;
  available: boolean | undefined;
}

export interface IdePickerProps {
  forest: Forest;
  onPick: (ide: Ide) => void;
  onCancel: () => void;
}

export function IdePicker({ forest, onPick, onCancel }: IdePickerProps) {
  const [options, setOptions] = useState<IdeOption[]>([
    { ide: "cursor", available: undefined },
    { ide: "claude", available: undefined },
  ]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const cursorAvail = await isIdeAvailable("cursor");
      const claudeAvail = await isIdeAvailable("claude");
      setOptions([
        { ide: "cursor", available: cursorAvail },
        { ide: "claude", available: claudeAvail },
      ]);
    })();
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(options.length - 1, i + 1));
    if (input === "1") setIndex(0);
    if (input === "2") setIndex(1);
    if (input === "c" || input === "C") {
      onPick("cursor");
      return;
    }
    if (input === "a" || input === "A") {
      onPick("claude");
      return;
    }
    if (key.return) {
      const opt = options[index];
      if (opt) onPick(opt.ide);
    }
  });

  return (
    <Box flexDirection="column">
      <Header mode="open" subject={forest.name} context={compactPath(forest.path)} />

      <Box paddingX={1} flexDirection="column">
        {options.map((opt, i) => {
          const focused = i === index;
          const label = IDE_LABEL[opt.ide];
          const shortcut = opt.ide === "cursor" ? "c" : "a";
          const missing = opt.available === false;
          return (
            <Box key={opt.ide}>
              <Text
                color={focused ? theme.colors.primary : theme.colors.muted}
              >
                {focused ? theme.symbols.cursor : " "}{" "}
              </Text>
              <Text
                color={focused ? theme.colors.primary : theme.colors.fg}
                bold={focused}
              >
                {label.padEnd(14)}
              </Text>
              <Text color={theme.colors.muted}>[{shortcut}]</Text>
              {missing ? (
                <Text color={theme.colors.warning}>
                  {"  "}
                  {theme.symbols.cross} not in $PATH
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Box>

      <Footer
        mode="open"
        hints={[
          { keys: "↑↓", label: "move" },
          { keys: "⏎", label: "open" },
          { keys: "c/a", label: "direct" },
          { keys: "esc", label: "cancel", tone: "danger" },
        ]}
      />
    </Box>
  );
}
