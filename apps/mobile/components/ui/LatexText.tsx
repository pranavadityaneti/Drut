import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface LatexTextProps {
    text: string;
    style?: any; // Pass formatting explicitly if needed, though WebView handles most
    fontSize?: number;
    color?: string;
    inline?: boolean;
}

/**
 * Mobile Latex Renderer
 * Uses a lightweight cached WebView to render math.
 */
export const LatexText: React.FC<LatexTextProps> = ({ text, fontSize = 16, color = '#1f2937', inline = false }) => {
    const [height, setHeight] = useState(fontSize * 2);
    const [isReady, setIsReady] = useState(false);

    // Reset state when text changes to prevent stale height/visibility
    useEffect(() => {
        setIsReady(false);
        setHeight(fontSize * 2);
    }, [text]);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\\\(', right: '\\\\)', display: false},
                {left: '\\\\[', right: '\\\\]', display: true}
            ],
            throwOnError: false
        }); window.ReactNativeWebView.postMessage(document.body.scrollHeight);"></script>
        <style>
            body { 
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                font-size: ${fontSize}px; 
                line-height: 1.5; 
                color: ${color} !important; 
                padding: 0; 
                margin: 0;
                background: transparent !important;
                overflow: hidden;
            }
            .katex { font-size: 1.1em; }
            p { margin: 0; }
        </style>
    </head>
    <body>
        ${text}
    </body>
    </html>
    `;

    return (
        <View style={{ height: height, opacity: isReady ? 1 : 0, minWidth: inline ? 50 : '100%' }}>
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={{ backgroundColor: 'transparent' }}
                scrollEnabled={false}
                onMessage={(event) => {
                    const h = parseInt(event.nativeEvent.data);
                    if (!isNaN(h) && h > 0) {
                        setHeight(h + 8); // Add slight buffer
                        setIsReady(true);
                    }
                }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};
