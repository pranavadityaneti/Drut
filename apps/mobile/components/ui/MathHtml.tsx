import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathHtmlProps {
    /**
     * A full HTML body — may contain markup (divs/spans) AND inline ($...$) or
     * display ($$...$$) math. The ENTIRE block is rendered in ONE WebView.
     */
    body: string;
    fontSize?: number;
    color?: string;
    minHeight?: number;
}

/**
 * Single-WebView math renderer.
 *
 * Renders an entire block — a whole Quick Method, a whole Full Solution, a question +
 * its parts — in ONE WebView, instead of one WebView per line/equation (the old
 * per-snippet `LatexText` approach). This fixes two issues at once:
 *   1. Line-by-line pop-in: many independent WebViews each revealed on their own KaTeX
 *      timeline. One WebView renders the whole block in a single pass.
 *   2. Clipped text: each per-snippet WebView self-measured its height racily and
 *      sometimes too short. One WebView measures the whole block's height once (and
 *      re-measures after fonts settle), so nothing is cut off.
 *
 * KaTeX still loads from the CDN (cached). Bundling KaTeX in-app for offline/instant
 * render is a tracked follow-up — it is NOT what fixes the two issues above.
 */
export const MathHtml: React.FC<MathHtmlProps> = ({ body, fontSize = 15, color = '#1f2937', minHeight = 24 }) => {
    const [height, setHeight] = useState(minHeight);
    const [isReady, setIsReady] = useState(false);

    // Reset on body change. FALLBACK: if KaTeX never reports back (offline — CDN can't
    // load), reveal the content anyway after a delay so it shows as raw text rather than
    // a permanent blank gap.
    useEffect(() => {
        setIsReady(false);
        setHeight(minHeight);
        const t = setTimeout(() => setIsReady(true), 3000);
        return () => clearTimeout(t);
    }, [body, minHeight]);

    const safeBody = typeof body === 'string' ? body : '';

    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="
            try {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\\\(', right: '\\\\)', display: false},
                        {left: '\\\\[', right: '\\\\]', display: true}
                    ],
                    throwOnError: false
                });
            } catch (e) {}
            function postH(){ try { window.ReactNativeWebView.postMessage(String(document.body.scrollHeight)); } catch(e){} }
            postH();
            // Re-measure once fonts/layout settle so the last line is never clipped.
            setTimeout(postH, 350);
        "></script>
        <style>
            html, body { margin: 0; padding: 0; background: transparent !important; }
            body {
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: ${fontSize}px;
                line-height: 1.55;
                color: ${color} !important;
                -webkit-text-size-adjust: 100%;
            }
            p { margin: 0 0 8px; }
            p:last-child { margin-bottom: 0; }
            .katex { font-size: 1.05em; }
            .katex-display { margin: 10px 0; overflow-x: auto; overflow-y: hidden; }
            .drut-approach { background:#f0fdf4; border-left:3px solid #22c55e; border-radius:8px; padding:12px; margin-bottom:12px; }
            .drut-chunk { margin-bottom:10px; }
            .drut-chunk:last-child { margin-bottom:0; }
            .drut-answer { margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0; }
            .drut-answer-label { font-size:12px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
            .drut-step { display:flex; align-items:flex-start; gap:10px; margin-bottom:12px; }
            .drut-step:last-child { margin-bottom:0; }
            .drut-num { flex:0 0 auto; width:22px; height:22px; border-radius:11px; background:#e0f2fe; color:#0284c7; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:1px; }
            .drut-step-text { flex:1; min-width:0; }
        </style>
    </head>
    <body>${safeBody}</body>
    </html>`;

    return (
        <View style={{ height, opacity: isReady ? 1 : 0, width: '100%' }}>
            <WebView
                originWhitelist={['*']}
                source={{ html }}
                style={{ backgroundColor: 'transparent' }}
                scrollEnabled={false}
                onMessage={(event) => {
                    const h = parseInt(event.nativeEvent.data, 10);
                    if (!isNaN(h) && h > 0) {
                        setHeight(h + 8); // small buffer so descenders never clip
                        setIsReady(true);
                    }
                }}
                onError={() => setIsReady(true)}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};
