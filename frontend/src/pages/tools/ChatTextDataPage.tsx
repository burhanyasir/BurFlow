import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ChatDataTool from '../../components/tools/ChatDataTool';

const tool = getToolBySlug('chat-text-data')!;

export default function ChatTextDataPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Chat with any text — articles, notes, transcripts, or reports — and get instant answers, summaries, and action items."
    >
      <ChatDataTool
        tool={tool}
        accept=".txt,.md,.csv,.json,text/plain,text/markdown"
        fileLabel="or upload a text file"
        pasteLabel="Your text"
        placeholder="Paste your text here — a report, article, transcript, meeting notes…"
      />
    </GenericToolWrapper>
  );
}