import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import ChatDataTool from '../../components/tools/ChatDataTool';

const tool = getToolBySlug('chat-document-data')!;

export default function ChatDocumentDataPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Upload any document and chat with it — ask questions, get summaries, and extract key FAQs instantly, all in your browser."
    >
      <ChatDataTool
        tool={tool}
        accept=".txt,.md,.html,.csv,.json,.xml,.rtf,.docx,text/*,application/json,application/xml"
        fileLabel="or upload a document (TXT, MD, HTML, DOCX, RTF…)"
        pasteLabel="Or paste your document text"
        placeholder="Paste your document text here, or upload a file…"
      />
    </GenericToolWrapper>
  );
}