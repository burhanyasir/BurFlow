import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ChatDataTool from '../../components/tools/ChatDataTool';

const tool = getToolBySlug('chat-word-data')!;

export default function ChatWordDataPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload a Word document and chat with it — ask questions, get summaries, and extract key FAQs instantly, all in your browser."
    >
      <ChatDataTool
        tool={tool}
        accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        fileLabel="or upload a Word document"
        pasteLabel="Or paste document text"
        placeholder="Upload a .docx file on the left, or paste document text here…"
      />
    </GenericToolWrapper>
  );
}