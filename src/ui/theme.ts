export const theme = {
  colors: {
    primary: "magenta",
    fg: "whiteBright",
    muted: "gray",
    subtle: "gray",
    success: "greenBright",
    warning: "yellow",
    error: "redBright",
  } as const,
  symbols: {
    cursor: "▸",
    check: "✓",
    warn: "!",
    cross: "×",
    plus: "+",
    prompt: ">",
    ellipsis: "…",
    arrowUp: "↑",
    arrowDown: "↓",
  },
} as const;
