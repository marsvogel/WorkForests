import { useEffect, useState } from "react";

export function useTerminalColumns(): number {
  const [columns, setColumns] = useState(() => process.stdout.columns || 100);

  useEffect(() => {
    const onResize = () => setColumns(process.stdout.columns || 100);
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return columns;
}
