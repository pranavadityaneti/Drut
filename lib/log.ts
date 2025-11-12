const PREFIX = '[drut]';

// This custom serializer handles cases where the error object might have circular references
// or be a complex object from a library like Supabase.
const safeErrorSerializer = (error: any) => {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
            name: error.name,
        };
    }
    // For Supabase errors or other objects that are not standard Error instances
    if (typeof error === 'object' && error !== null) {
        try {
            // A simple way to get the most useful info from Supabase errors
            return JSON.parse(JSON.stringify(error));
        } catch (e) {
            return 'Could not serialize error object';
        }
    }
    return error;
};

export const log = {
  warn: (...args: any[]) => {
    console.warn(PREFIX, ...args);
  },
  error: (...args: any[]) => {
    // Process each argument to ensure errors are properly serialized
    const serializedArgs = args.map(arg => safeErrorSerializer(arg));
    console.error(PREFIX, ...serializedArgs);
  },
  info: (...args: any[]) => {
    console.info(PREFIX, ...args);
  }
};
