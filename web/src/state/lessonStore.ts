import { chapters } from '@mainline/curriculum';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** `${chapterId}/${stepId}/${actionIndex}` */
export const actionKey = (chapterId: string, stepId: string, index: number) => `${chapterId}/${stepId}/${index}`;

interface LessonState {
  chapterId: string;
  stepId: string;
  /** Actions the learner has carried out, with the exit code they ended on. */
  done: Record<string, number>;

  openChapter: (chapterId: string) => void;
  openStep: (stepId: string) => void;
  markDone: (key: string, exitCode: number) => void;
  forgetChapter: (chapterId: string) => void;
  forgetAll: () => void;
}

const first = chapters[0]!;

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      chapterId: first.id,
      stepId: first.steps[0]!.id,
      done: {},

      openChapter: (chapterId) => {
        const chapter = chapters.find((entry) => entry.id === chapterId);
        if (chapter) set({ chapterId, stepId: chapter.steps[0]!.id });
      },
      openStep: (stepId) => set({ stepId }),
      markDone: (key, exitCode) => set((state) => ({ done: { ...state.done, [key]: exitCode } })),
      forgetChapter: (chapterId) =>
        set((state) => ({
          done: Object.fromEntries(Object.entries(state.done).filter(([key]) => !key.startsWith(`${chapterId}/`))),
        })),
      forgetAll: () => set({ done: {} }),
    }),
    {
      name: 'mainline.lesson',
      version: 1,
      // A saved position may refer to a chapter or step that no longer exists.
      merge: (saved, current) => {
        const state = { ...current, ...(saved as Partial<LessonState>) };
        const chapter = chapters.find((entry) => entry.id === state.chapterId) ?? first;
        const step = chapter.steps.find((entry) => entry.id === state.stepId) ?? chapter.steps[0]!;
        return { ...state, chapterId: chapter.id, stepId: step.id };
      },
    },
  ),
);

export function useChapter() {
  const chapterId = useLessonStore((state) => state.chapterId);
  return chapters.find((entry) => entry.id === chapterId) ?? first;
}
