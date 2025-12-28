import React, { Suspense } from 'react';

// Dynamically import the Editor component, which is equivalent to `{ ssr: false }` in Next.js
const Editor = React.lazy(() => import('@monaco-editor/react'));

interface CodeEditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, language = 'javascript', onChange }) => {
  return (
    <div className="border rounded-md">
        <Suspense fallback={
            <div className="h-[40vh] w-full bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Loading Editor...</p>
            </div>
        }>
        <Editor
            height="40vh"
            language={language}
            value={value}
            onChange={onChange}
            options={{
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
            }}
        />
        </Suspense>
    </div>
  );
};

export default CodeEditor;
