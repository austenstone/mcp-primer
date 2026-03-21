/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ComponentType } from "react";
import {
  ActionList,
  ActionMenu,
  Avatar,
  AvatarStack,
  Banner,
  BranchName,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Checkbox,
  CounterLabel,
  Dialog,
  FormControl,
  Heading,
  IconButton,
  Label,
  Link,
  LinkButton,
  NavList,
  PageHeader,
  PageLayout,
  Pagination,
  Popover,
  ProgressBar,
  Radio,
  RelativeTime,
  SegmentedControl,
  Select,
  Spinner,
  Stack,
  StateLabel,
  Text,
  Textarea,
  TextInput,
  Timeline,
  ToggleSwitch,
  Token,
  Tooltip,
  TreeView,
  Truncate,
  UnderlineNav,
} from "@primer/react";

// Cast through `unknown` — Primer components have strict required props that
// don't match our generic signature. The LLM provides correct props at runtime.
const c = (x: any): ComponentType<any> => x as ComponentType<any>;

const COMPONENT_MAP: Record<string, ComponentType<any>> = {
  // Layout
  Stack: c(Stack),
  "Stack.Item": c(Stack.Item),
  PageLayout: c(PageLayout),
  PageHeader: c(PageHeader),

  // Typography
  Heading: c(Heading),
  Text: c(Text),

  // Actions
  Button: c(Button),
  IconButton: c(IconButton),
  ButtonGroup: c(ButtonGroup),
  LinkButton: c(LinkButton),

  // Navigation
  Breadcrumbs: c(Breadcrumbs),
  "Breadcrumbs.Item": c(Breadcrumbs.Item),
  Link: c(Link),
  Pagination: c(Pagination),
  UnderlineNav: c(UnderlineNav),
  "UnderlineNav.Item": c((UnderlineNav as any).Item),

  // Data display
  Avatar: c(Avatar),
  AvatarStack: c(AvatarStack),
  BranchName: c(BranchName),
  CounterLabel: c(CounterLabel),
  Label: c(Label),
  StateLabel: c(StateLabel),
  Token: c(Token),
  RelativeTime: c(RelativeTime),
  Timeline: c(Timeline),
  "Timeline.Item": c(Timeline.Item),
  "Timeline.Badge": c(Timeline.Badge),

  // Feedback
  Banner: c(Banner),
  Spinner: c(Spinner),
  ProgressBar: c(ProgressBar),

  // Forms
  TextInput: c(TextInput),
  Textarea: c(Textarea),
  Select: c(Select),
  Checkbox: c(Checkbox),
  Radio: c(Radio),
  FormControl: c(FormControl),
  "FormControl.Label": c(FormControl.Label),
  "FormControl.Caption": c(FormControl.Caption),
  "FormControl.Validation": c(FormControl.Validation),
  ToggleSwitch: c(ToggleSwitch),
  SegmentedControl: c(SegmentedControl),
  "SegmentedControl.Button": c(SegmentedControl.Button),

  // Overlays
  ActionList: c(ActionList),
  "ActionList.Item": c(ActionList.Item),
  "ActionList.LeadingVisual": c(ActionList.LeadingVisual),
  "ActionList.TrailingVisual": c(ActionList.TrailingVisual),
  "ActionList.Description": c(ActionList.Description),
  "ActionList.Divider": c(ActionList.Divider),
  "ActionList.GroupHeading": c(ActionList.GroupHeading),
  ActionMenu: c(ActionMenu),
  "ActionMenu.Button": c(ActionMenu.Button),
  "ActionMenu.Overlay": c(ActionMenu.Overlay),
  Dialog: c(Dialog),

  // Misc
  Truncate: c(Truncate),
  Tooltip: c(Tooltip),
  Popover: c(Popover),
  "Popover.Content": c(Popover.Content),
  TreeView: c(TreeView),
  "TreeView.Item": c(TreeView.Item),
  "TreeView.SubTree": c(TreeView.SubTree),
  NavList: c(NavList),
  "NavList.Item": c(NavList.Item),
  "NavList.SubNav": c(NavList.SubNav),
};

export function resolveComponent(name: string): ComponentType<any> | undefined {
  return COMPONENT_MAP[name];
}

export function getComponentNames(): string[] {
  return Object.keys(COMPONENT_MAP);
}
