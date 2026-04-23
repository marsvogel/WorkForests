import { Box, Text, useApp } from "ink";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteForest,
  listForests,
  touchLastOpened,
} from "./core/forest.js";
import { openClaudeInIterm2, openCursor } from "./core/ide.js";
import type { Forest, Ide, RepoRef } from "./types.js";
import { Header } from "./ui/Header.js";
import { Footer, type StatusTone } from "./ui/Footer.js";
import { Loading } from "./ui/Spinner.js";
import { theme } from "./ui/theme.js";
import { Home } from "./screens/Home.js";
import { CreateName } from "./screens/CreateName.js";
import { Creating } from "./screens/Creating.js";
import { Edit } from "./screens/Edit.js";
import { IdePicker } from "./screens/IdePicker.js";
import { RepoPicker } from "./screens/RepoPicker.js";
import { ConfirmDeleteForest } from "./screens/ConfirmDeleteForest.js";

type Route =
  | { name: "home" }
  | { name: "createName"; initialName?: string }
  | { name: "createRepos"; forestName: string }
  | { name: "creating"; forestName: string; repos: RepoRef[] }
  | { name: "edit"; forestName: string }
  | { name: "idePicker"; forestName: string }
  | { name: "confirmDelete"; forestName: string }
  | { name: "deleting"; forestName: string; step: string };

interface Toast {
  message: string;
  tone: StatusTone;
  id: number;
}

export function App() {
  const { exit } = useApp();
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [forests, setForests] = useState<Forest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingHome, setRefreshingHome] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = ++toastIdRef.current;
      setToast({ message, tone, id });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev && prev.id === id ? null : prev));
      }, 3000);
    },
    [],
  );

  const reloadForests = useCallback(async (): Promise<Forest[]> => {
    const list = await listForests();
    setForests(list);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reloadForests();
      } catch (e) {
        showToast(String((e as Error).message || e), "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadForests, showToast]);

  const existingForestNames = useMemo(
    () => new Set(forests.map((f) => f.name)),
    [forests],
  );

  const currentForest = useMemo(() => {
    if (
      route.name === "edit" ||
      route.name === "idePicker" ||
      route.name === "confirmDelete"
    ) {
      return forests.find((f) => f.name === route.forestName) ?? null;
    }
    return null;
  }, [forests, route]);

  const handleRefreshHome = useCallback(async () => {
    setRefreshingHome(true);
    try {
      await reloadForests();
      showToast("reloaded", "success");
    } catch (e) {
      showToast(String((e as Error).message || e), "error");
    } finally {
      setRefreshingHome(false);
    }
  }, [reloadForests, showToast]);

  const handleOpen = useCallback((forest: Forest) => {
    setRoute({ name: "idePicker", forestName: forest.name });
  }, []);

  const handleEdit = useCallback((forest: Forest) => {
    setRoute({ name: "edit", forestName: forest.name });
  }, []);

  const handleNew = useCallback(() => {
    setRoute({ name: "createName" });
  }, []);

  const handleDelete = useCallback((forest: Forest) => {
    setRoute({ name: "confirmDelete", forestName: forest.name });
  }, []);

  const handleQuit = useCallback(() => {
    exit();
  }, [exit]);

  if (loading) {
    return (
      <Box flexDirection="column">
        <Header mode="home" />
        <Box paddingX={1}>
          <Loading label="loading forests…" />
        </Box>
      </Box>
    );
  }

  if (route.name === "home") {
    return (
      <Home
        forests={forests}
        onOpen={handleOpen}
        onEdit={handleEdit}
        onNew={handleNew}
        onDelete={handleDelete}
        onRefresh={handleRefreshHome}
        onQuit={handleQuit}
        refreshing={refreshingHome}
        toast={
          toast ? { message: toast.message, tone: toast.tone } : undefined
        }
      />
    );
  }

  if (route.name === "createName") {
    return (
      <CreateName
        existingForestNames={existingForestNames}
        initialName={route.initialName ?? ""}
        onNext={(name) => setRoute({ name: "createRepos", forestName: name })}
        onCancel={() => setRoute({ name: "home" })}
      />
    );
  }

  if (route.name === "createRepos") {
    return (
      <RepoPicker
        headerMode="new"
        subject={`2/2 · ${route.forestName}`}
        mode="multi"
        onConfirm={(repos) =>
          setRoute({
            name: "creating",
            forestName: route.forestName,
            repos,
          })
        }
        onCancel={() =>
          setRoute({
            name: "createName",
            initialName: route.forestName,
          })
        }
      />
    );
  }

  if (route.name === "creating") {
    return (
      <Creating
        name={route.forestName}
        repos={route.repos}
        onDone={async (forest) => {
          const wt = forest.worktrees.length;
          showToast(
            `created ${forest.name} (${wt} worktree${wt === 1 ? "" : "s"})`,
            "success",
          );
          await reloadForests();
          setRoute({ name: "home" });
        }}
        onError={async (msg) => {
          showToast(msg, "error");
          await reloadForests();
          setRoute({ name: "home" });
        }}
      />
    );
  }

  if (route.name === "edit") {
    if (!currentForest) {
      return <ForestUnavailable mode="edit" name={route.forestName} />;
    }
    const otherForestNames = new Set(existingForestNames);
    otherForestNames.delete(currentForest.name);
    return (
      <Edit
        forest={currentForest}
        existingForestNames={otherForestNames}
        onBack={async () => {
          await reloadForests();
          setRoute({ name: "home" });
        }}
        onError={(msg) => showToast(msg, "error")}
        onInfo={(msg) => showToast(msg, "success")}
      />
    );
  }

  if (route.name === "confirmDelete") {
    if (!currentForest) {
      setRoute({ name: "home" });
      return null;
    }
    return (
      <ConfirmDeleteForest
        forest={currentForest}
        onCancel={() => setRoute({ name: "home" })}
        onConfirm={async () => {
          const forest = currentForest;
          setRoute({
            name: "deleting",
            forestName: forest.name,
            step: "starting",
          });
          try {
            await deleteForest({
              forest,
              onStep: (msg) =>
                setRoute({
                  name: "deleting",
                  forestName: forest.name,
                  step: msg,
                }),
            });
            showToast(`deleted ${forest.name}`, "success");
          } catch (e) {
            showToast(
              `delete failed: ${(e as Error).message}`,
              "error",
            );
          }
          await reloadForests();
          setRoute({ name: "home" });
        }}
      />
    );
  }

  if (route.name === "deleting") {
    return (
      <Box flexDirection="column">
        <Header mode="deleting" subject={route.forestName} />
        <Box paddingX={1}>
          <Loading label={route.step} />
        </Box>
        <Footer mode="deleting" hints={[]} />
      </Box>
    );
  }

  if (route.name === "idePicker") {
    if (!currentForest) {
      return <ForestUnavailable mode="open" name={route.forestName} />;
    }
    const forest = currentForest;
    return (
      <IdePicker
        forest={forest}
        onPick={async (ide: Ide) => {
          try {
            const updated = await touchLastOpened(forest);
            setForests((prev) =>
              prev.map((f) => (f.name === updated.name ? updated : f)),
            );
            if (ide === "cursor") {
              await openCursor(forest.path);
              showToast(`opened cursor on ${forest.name}`, "success");
              setRoute({ name: "home" });
              return;
            }
            await openClaudeInIterm2(forest.path);
            showToast(`opened claude on ${forest.name}`, "success");
            setRoute({ name: "home" });
          } catch (e) {
            showToast(
              `failed to open ide: ${(e as Error).message}`,
              "error",
            );
            setRoute({ name: "home" });
          }
        }}
        onCancel={() => setRoute({ name: "home" })}
      />
    );
  }

  return null;
}

function ForestUnavailable({ mode, name }: { mode: string; name: string }) {
  return (
    <Box flexDirection="column">
      <Header mode={mode} subject={name} />
      <Box paddingX={1}>
        <Text color={theme.colors.error} bold>
          {theme.symbols.cross} forest "{name}" not available
        </Text>
      </Box>
      <Footer
        mode={mode}
        hints={[{ keys: "esc", label: "back", tone: "danger" }]}
      />
    </Box>
  );
}
