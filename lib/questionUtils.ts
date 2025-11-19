
// A simple hash function to create a consistent ID from the question text.
export const createQuestionId = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'qid_' + Math.abs(hash).toString(16);
};
