import React, { useEffect, useRef } from 'react';

interface MathDisplayProps {
  content: string;
  className?: string;
  inline?: boolean; // New prop to control block/inline rendering
}

const MathDisplay: React.FC<MathDisplayProps> = ({ content, className = '', inline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Set inner content.
    // Replace newlines with <br/> for basic text formatting.
    // We do NOT escape HTML here to allow simple formatting, 
    // but be aware of XSS if content is from untrusted users (here it's from AI/Teacher).
    element.innerHTML = content ? content.replace(/\n/g, '<br/>') : '';

    // Trigger MathJax Typeset
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      // Clear previous typesetting if needed (optional but good for re-renders)
      // (window as any).MathJax.typesetClear([element]);
      
      (window as any).MathJax.typesetPromise([element])
        .catch((err: any) => console.warn('MathJax typesetting failed:', err));
    }
  }, [content]);

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag 
        ref={containerRef} 
        className={`math-content text-slate-800 ${inline ? 'inline-block' : 'block'} ${className}`} 
    />
  );
};

export default MathDisplay;