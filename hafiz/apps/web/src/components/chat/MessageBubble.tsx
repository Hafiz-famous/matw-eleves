import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end" data-role="user">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-electric-500 px-4 py-2.5 text-[15px] leading-7 text-white sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = message.streaming && !message.content;
  return (
    <div className="flex gap-3" data-role="assistant">
      <img src="/logo.svg" alt="HAFIZ" className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 pt-0.5 text-night-900">
        {waiting ? (
          <div className="flex h-7 items-center gap-1" aria-label="HAFIZ réfléchit">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-electric-400" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : (
          <div className={`markdown ${message.streaming ? "typing-cursor" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
});
