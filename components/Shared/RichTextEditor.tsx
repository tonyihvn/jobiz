import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, Heading1 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, className = '', placeholder }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
        contentRef.current.focus();
    }
  };

  const ToolbarButton = ({ icon: Icon, command, arg, title }: any) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); execCommand(command, arg); }}
      className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className={`border border-slate-300 rounded-lg overflow-hidden bg-white flex flex-col ${className}`}>
      <div className="bg-slate-50 border-b border-slate-200 p-1 flex gap-1 flex-wrap">
        <ToolbarButton icon={Bold} command="bold" title="Bold" />
        <ToolbarButton icon={Italic} command="italic" title="Italic" />
        <div className="w-px bg-slate-300 mx-1 my-1"></div>
        <ToolbarButton icon={Heading1} command="formatBlock" arg="H3" title="Heading" />
        <div className="w-px bg-slate-300 mx-1 my-1"></div>
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Align Left" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Align Center" />
        <ToolbarButton icon={AlignRight} command="justifyRight" title="Align Right" />
        <div className="w-px bg-slate-300 mx-1 my-1"></div>
        <ToolbarButton icon={List} command="insertUnorderedList" title="List" />
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 p-3 outline-none overflow-y-auto min-h-[150px] prose prose-sm max-w-none"
        data-placeholder={placeholder}
        style={{whiteSpace: 'pre-wrap'}}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
