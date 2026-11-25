import React, { useState } from 'react';
import { ArrowRight, Headphones, Send, X } from 'lucide-react';
import type { LanguageCode } from '../i18n';

interface SupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
  onTrackReport: (reportId: string) => void;
  onStartGuidedReport: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  matchedReportId?: string;
}

export const SupportChatDrawer: React.FC<SupportChatDrawerProps> = ({
  isOpen,
  onClose,
  lang,
  onTrackReport,
  onStartGuidedReport,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        lang === 'tl'
          ? 'Kumusta! Ako ang e-Sumbong Mo San Mateo Assistant. Magtanong tungkol sa pag-uulat o tracking ID (hal. ESM-SM-0106).'
          : 'Hello! I am the e-Sumbong Mo San Mateo Support Assistant. Ask about filing a report or checking a tracking ID (e.g. ESM-SM-0106).',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/ai/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, lang }),
      });
      const data = (await res.json()) as { reply?: string; matchedReportId?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'Please try asking again or file your report directly.',
          matchedReportId: data.matchedReportId,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach assistant right now. You can still submit reports or check Live Status.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#154792]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="San Mateo Support Assistant"
    >
      <div className="w-full max-w-md bg-[#FEFFFE] h-full flex flex-col shadow-2xl border-l border-[#d6e4f7]">
        <div className="bg-[#154792] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FBE95C] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-[#154792]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">
                {lang === 'tl' ? 'Suporta ng San Mateo (AI)' : 'San Mateo Support Desk'}
              </h2>
              <p className="text-[11px] text-[#BFD9FA]">
                {lang === 'tl' ? 'Gabay sa ulat at pagsubaybay' : 'Reporting & live status help'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="p-1.5 rounded-lg text-[#BFD9FA] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-2.5 bg-[#F3F7FD] border-b border-[#d6e4f7] flex flex-wrap gap-1.5">
          {[
            lang === 'tl' ? 'Katayuan ng ESM-SM-0106' : 'Status of ESM-SM-0106',
            lang === 'tl' ? 'Paano mag-ulat?' : 'How do I report?',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-[#FEFFFE] border border-[#c8daf3] hover:border-[#1177F0] text-[11px] font-bold text-[#154792] transition-colors"
            >
              {prompt}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartGuidedReport();
            }}
            className="px-2.5 py-1 rounded-full bg-[#FBE95C] text-[11px] font-extrabold text-[#154792] hover:bg-[#f7e135] transition-colors"
          >
            {lang === 'tl' ? 'Buksan ang Guided Chat' : 'AI Guided Intake'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F3F7FD]/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#1177F0] text-white'
                    : 'bg-[#FEFFFE] border border-[#d6e4f7] text-[#154792] shadow-2xs'
                }`}
              >
                <p>{msg.text}</p>
                {msg.matchedReportId && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTrackReport(msg.matchedReportId!);
                    }}
                    className="mt-2 inline-flex items-center gap-1 font-extrabold text-[#1177F0] hover:underline"
                  >
                    View {msg.matchedReportId}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-[#FEFFFE] border border-[#d6e4f7] rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#4679C0]">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="p-3.5 bg-[#FEFFFE] border-t border-[#d6e4f7] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lang === 'tl' ? 'Magtanong dito...' : 'Ask a question or paste tracking ID...'
            }
            className="flex-1 px-3.5 py-2.5 text-xs bg-[#F3F7FD] border border-[#d6e4f7] rounded-xl text-[#154792] focus:outline-none focus:ring-2 focus:ring-[#1177F0]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-xl bg-[#1177F0] hover:bg-[#145EC1] disabled:opacity-50 text-white transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
