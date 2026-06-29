import { QuestionData } from '../types';

// COUNT-ON-SERVE (2026-06-28): the legacy "generate the first question on app load
// and cache it" preloader is DISABLED. It bypassed:
//   (a) the free-tier meter — its question was served to the user but never counted,
//       which under count-on-serve would be a straight quota leak; and
//   (b) the trust gate / live-AI kill switch — it called generateQuestionAndSolutions
//       directly, serving ungrounded legacy-format AI questions (T.A.R./D.E.E.P. label
//       leak risk) straight onto the screen at startup.
// The normal getQuestionsForUser path (metered via serve_unseen_questions + trust
// gated) now serves the first question. The small perf head-start isn't worth the
// bypasses. To restore it, re-implement on top of getQuestionsForUser.

export const preloadFirstQuestion = async (): Promise<void> => {
  // no-op — see note above.
};

export const getPreloadedQuestion = (
  _profile: string,
  _topic: string,
  _subTopic: string,
): QuestionData | null => null;
