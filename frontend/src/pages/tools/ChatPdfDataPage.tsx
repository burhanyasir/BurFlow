import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ChatDataTool from '../../components/tools/ChatDataTool';

const tool = getToolBySlug('chat-pdf-data')!;

export default function ChatPdfDataPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload a PDF and chat with it — ask questions, get summaries, and extract key points instantly, all in your browser."
    >
      <ChatDataTool
        tool={tool}
        accept=".pdf,application/pdf"
        fileLabel="or upload a PDF"
        pasteLabel="Or paste PDF text"
        placeholder="Upload a PDF on the left, or paste extracted PDF text here…"
      />
    </GenericToolWrapper>
  );
}