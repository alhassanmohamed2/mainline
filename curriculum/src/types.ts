/** Each chapter is drawn as a transit line with its own colour. */
export type LineColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

/** One piece of a command line and what it means. */
export interface Anatomy {
  part: string;
  note: string;
}

/** A real command the learner runs. */
export interface RunAction {
  kind: 'run';
  /** Exact command line. May contain {{ghUser}} and {{repoName}}. */
  run: string;
  anatomy: Anatomy[];
  /** The lesson expects a non-zero exit code here (an error is the point). */
  failsOnPurpose?: boolean;
  /** The command changes something on GitHub; the app asks before running it. */
  changesRemote: boolean;
}

/** A change the learner makes by hand in the file editor. */
export interface EditAction {
  kind: 'edit';
  file: string;
  goal: string;
  /** File content that fulfils the goal, used by "do it for me". */
  solution: string;
}

export type StepAction = RunAction | EditAction;

export interface Step {
  id: string;
  title: string;
  /** Paragraphs. Supports `code` and **bold**. */
  body: string[];
  actions: StepAction[];
  /** What to look at on screen once the actions ran. */
  notice: string[];
  /** A term worth remembering from this step. */
  term?: { name: string; text: string };
}

export type ChapterNeed = 'github-login' | 'github-remote';

/** What the playground must look like for the chapter's commands to make sense. */
export interface StartRequirement {
  repo?: 'absent' | 'present';
  /** Files that must exist in the last commit. */
  files?: string[];
  branches?: string[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  tagline: string;
  color: LineColor;
  intro: string;
  /** Plain-language description of the state the chapter starts from. */
  startingPoint: string;
  /**
   * Commands that rebuild the starting state in an empty playground.
   * null when the chapter continues from the one before it (GitHub state
   * cannot be recreated locally).
   */
  setup: string[] | null;
  needs?: ChapterNeed;
  requires?: StartRequirement;
  steps: Step[];
}
