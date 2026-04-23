import { Box, Text, useInput } from "ink";
import React, { useEffect, useMemo, useState } from "react";
import { theme } from "./theme.js";

export interface SelectListProps<T> {
  items: T[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  renderItem: (item: T, meta: { focused: boolean; index: number }) => React.ReactNode;
  onSelect?: (item: T, index: number) => void;
  viewportSize?: number;
  itemKey?: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
}

export function SelectList<T>({
  items,
  selectedIndex,
  onIndexChange,
  renderItem,
  onSelect,
  viewportSize = 10,
  itemKey,
  emptyState,
}: SelectListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));

  useEffect(() => {
    if (items.length === 0) return;
    if (safeIndex < scrollTop) {
      setScrollTop(safeIndex);
    } else if (safeIndex >= scrollTop + viewportSize) {
      setScrollTop(safeIndex - viewportSize + 1);
    }
  }, [safeIndex, scrollTop, viewportSize, items.length]);

  useInput((_input, key) => {
    if (items.length === 0) return;
    if (key.upArrow) {
      if (safeIndex > 0) onIndexChange(safeIndex - 1);
      return;
    }
    if (key.downArrow) {
      if (safeIndex < items.length - 1) onIndexChange(safeIndex + 1);
      return;
    }
    if (key.pageUp) {
      onIndexChange(Math.max(0, safeIndex - viewportSize));
      return;
    }
    if (key.pageDown) {
      onIndexChange(Math.min(items.length - 1, safeIndex + viewportSize));
      return;
    }
    if (key.return && onSelect) {
      const selected = items[safeIndex];
      if (selected !== undefined) onSelect(selected, safeIndex);
    }
  });

  const visible = useMemo(
    () => items.slice(scrollTop, scrollTop + viewportSize),
    [items, scrollTop, viewportSize],
  );

  if (items.length === 0) {
    return (
      <Box>
        {emptyState ?? (
          <Text color={theme.colors.muted}>empty.</Text>
        )}
      </Box>
    );
  }

  const endIndex = scrollTop + visible.length;
  const hasMoreAbove = scrollTop > 0;
  const hasMoreBelow = endIndex < items.length;

  return (
    <Box flexDirection="column">
      {hasMoreAbove ? (
        <Text color={theme.colors.subtle} dimColor>
          {"  "}
          {theme.symbols.ellipsis} {scrollTop} above
        </Text>
      ) : null}
      {visible.map((item, i) => {
        const index = scrollTop + i;
        const focused = index === safeIndex;
        const key = itemKey ? itemKey(item, index) : String(index);
        return (
          <Box key={key} flexDirection="row">
            <Text color={focused ? theme.colors.primary : theme.colors.muted}>
              {focused ? theme.symbols.cursor : " "}{" "}
            </Text>
            <Box>{renderItem(item, { focused, index })}</Box>
          </Box>
        );
      })}
      {hasMoreBelow ? (
        <Text color={theme.colors.subtle} dimColor>
          {"  "}
          {theme.symbols.ellipsis} {items.length - endIndex} below
        </Text>
      ) : null}
    </Box>
  );
}
