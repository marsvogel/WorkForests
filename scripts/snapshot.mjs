// Render each screen to stdout so we can visually inspect every state.
import React from "react";
import { render } from "ink-testing-library";
import { Home } from "../src/screens/Home.tsx";
import { CreateName } from "../src/screens/CreateName.tsx";
import { RepoPicker } from "../src/screens/RepoPicker.tsx";
import { Edit } from "../src/screens/Edit.tsx";
import { IdePicker } from "../src/screens/IdePicker.tsx";

function header(title) {
  const bar = "═".repeat(Math.max(0, 80 - title.length - 4));
  return `\n\x1b[1m\x1b[95m━━ ${title} ${bar}\x1b[0m\n`;
}

function dump(label, el) {
  const { lastFrame, rerender, unmount } = render(el);
  process.stdout.write(header(label));
  process.stdout.write(lastFrame() + "\n");
  unmount();
}

const home = process.env.HOME || "/Users/demo";
const root = `${home}/Work Forests`;

const sampleForests = [
  {
    name: "PROJ-1234",
    path: `${root}/PROJ-1234`,
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    lastOpenedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    worktrees: [
      {
        repo: { name: "api", relPath: "github.com/org/api", absPath: "/x/api" },
        path: `${root}/PROJ-1234/api`,
        exists: true,
        status: { clean: true, changedFiles: 0, ahead: 0, behind: 0 },
      },
      {
        repo: { name: "web", relPath: "github.com/org/web", absPath: "/x/web" },
        path: `${root}/PROJ-1234/web`,
        exists: true,
        status: { clean: false, changedFiles: 4, ahead: 2, behind: 1 },
      },
      {
        repo: { name: "core", relPath: "bitbucket.org/org/core", absPath: "/x/core" },
        path: `${root}/PROJ-1234/core`,
        exists: false,
        status: undefined,
      },
    ],
  },
  {
    name: "OPS-42-investigate-latency",
    path: `${root}/OPS-42-investigate-latency`,
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
    lastOpenedAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    worktrees: [
      {
        repo: { name: "infra", relPath: "bitbucket.org/org/infra", absPath: "/x/infra" },
        path: `${root}/OPS-42-investigate-latency/infra`,
        exists: true,
        status: { clean: true, changedFiles: 0, ahead: 0, behind: 0 },
      },
    ],
  },
  {
    name: "quick-proto",
    path: `${root}/quick-proto`,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    worktrees: [],
  },
];

// 1. Home
dump("Home · 3 Forests", React.createElement(Home, {
  forests: sampleForests,
  onOpen: () => {}, onEdit: () => {}, onNew: () => {}, onRefresh: () => {}, onQuit: () => {},
}));

// 2. Home — with toast
dump("Home · after create (toast)", React.createElement(Home, {
  forests: sampleForests,
  onOpen: () => {}, onEdit: () => {}, onNew: () => {}, onRefresh: () => {}, onQuit: () => {},
  toast: { message: "Forest \"PROJ-1234\" created with 3 worktrees.", tone: "success" },
}));

// 3. Home — empty state
dump("Home · empty", React.createElement(Home, {
  forests: [],
  onOpen: () => {}, onEdit: () => {}, onNew: () => {}, onRefresh: () => {}, onQuit: () => {},
}));

// 4. CreateName
dump("CreateName · empty", React.createElement(CreateName, {
  existingForestNames: new Set(sampleForests.map(f => f.name)),
  onNext: () => {}, onCancel: () => {},
}));

// 5. CreateName — valid
const createValid = render(React.createElement(CreateName, {
  existingForestNames: new Set(sampleForests.map(f => f.name)),
  initialName: "PROJ-9876-new-feature",
  onNext: () => {}, onCancel: () => {},
}));
process.stdout.write(header("CreateName · valid name"));
process.stdout.write(createValid.lastFrame() + "\n");
createValid.unmount();

// 6. CreateName — duplicate
const createDup = render(React.createElement(CreateName, {
  existingForestNames: new Set(["PROJ-1234"]),
  initialName: "PROJ-1234",
  onNext: () => {}, onCancel: () => {},
}));
process.stdout.write(header("CreateName · duplicate"));
process.stdout.write(createDup.lastFrame() + "\n");
createDup.unmount();

// 7. Edit
dump("Edit · forest with 3 worktrees", React.createElement(Edit, {
  forest: sampleForests[0],
  existingForestNames: new Set(["OPS-42-investigate-latency", "quick-proto"]),
  onBack: () => {}, onError: () => {}, onInfo: () => {},
}));

// 8. IdePicker
dump("IdePicker", React.createElement(IdePicker, {
  forest: sampleForests[0],
  onPick: () => {}, onCancel: () => {},
}));

// 9. RepoPicker (with mock repos)
const mockRepos = [
  { name: "api", relPath: "github.com/org/api", absPath: "/x/api" },
  { name: "web", relPath: "github.com/org/web", absPath: "/x/web" },
  { name: "core", relPath: "bitbucket.org/org/core", absPath: "/x/core" },
  { name: "infra", relPath: "bitbucket.org/org/infra", absPath: "/x/infra" },
  { name: "WorkForests", relPath: "github.com/org/WorkForests", absPath: "/x/WorkForests" },
  { name: "cli", relPath: "github.com/org/cli", absPath: "/x/cli" },
  { name: "claude-sdk", relPath: "github.com/anthropic/claude-sdk", absPath: "/x/sdk" },
  { name: "docs", relPath: "github.com/org/docs", absPath: "/x/docs" },
];

dump("RepoPicker · empty, multi-select", React.createElement(RepoPicker, {
  headerMode: "new",
  subject: "2/2 · PROJ-1234",
  mode: "multi",
  reposOverride: mockRepos,
  onConfirm: () => {}, onCancel: () => {},
}));

// 10. Stress test: very long forest name + long context
const longName = "PROJ-1234-some-very-long-feature-branch-name-that-keeps-going";
const longForest = {
  name: longName,
  path: `${root}/${longName}`,
  createdAt: new Date().toISOString(),
  hasMeta: true,
  worktrees: sampleForests[0].worktrees.map(w => ({ ...w, path: `${root}/${longName}/${w.repo.name}` })),
};
dump("Edit · very long forest name (header stress)", React.createElement(Edit, {
  forest: longForest,
  existingForestNames: new Set(),
  onBack: () => {}, onError: () => {}, onInfo: () => {},
}));

// 11. Narrow terminal (80 cols)
process.stdout.columns = 80;
dump("Home · at 80 columns", React.createElement(Home, {
  forests: sampleForests,
  onOpen: () => {}, onEdit: () => {}, onNew: () => {}, onRefresh: () => {}, onQuit: () => {},
}));
process.stdout.columns = 110;

process.exit(0);
