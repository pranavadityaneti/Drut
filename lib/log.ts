const PREFIX = '[drut]';

export const log = {
  warn: (...args: any[]) => {
    console.warn(PREFIX, ...args);
  },
  error: (...args: any[]) => {
    console.error(PREFIX, ...args);
  },
  info: (...args: any[]) => {
    console.info(PREFIX, ...args);
  }
};