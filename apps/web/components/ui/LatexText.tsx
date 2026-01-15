import React from 'react';
import 'katex/dist/katex.min.css'; // Import CSS for math fonts
import Latex from 'react-latex-next';

interface LatexTextProps {
    text: string;
    className?: string;
}

export const LatexText: React.FC<LatexTextProps> = ({ text, className = '' }) => {
    // Safe-guard: If text is null/undefined, return empty
    if (!text) return null;

    return (
        <span className={`latex-content ${className}`}>
            <Latex
                strict={false}
                delimiters={[
                    { left: '$$', right: '$$', display: true },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                ]}
            >
                {text}
            </Latex>
        </span>
    );
};
