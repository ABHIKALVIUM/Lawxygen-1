import { useState } from 'react';
import { Scale, LogOut, FileText, Search, Download, Copy, Save } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import { useSSE } from '../hooks/useSSE';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

type DocType = 'legal_notice' | 'nda';
type Tab = 'draft' | 'research';

export default function Workspace() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('draft');
  const [docType, setDocType] = useState<DocType>('legal_notice');
  
  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { content, isStreaming, error: draftError, stream, setContent } = useSSE();
  const [saveStatus, setSaveStatus] = useState('');

  // Research State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = () => {
    stream(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/draft/generate`, {
      docType,
      formData
    });
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError('');
    setResults([]);
    try {
      const { data } = await api.post('/search/query', { query });
      setResults(data.results);
      if (data.results.length === 0) setSearchError(data.message);
    } catch (err: any) {
      setSearchError(err.response?.data?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!content) return;
    
    // Simple parsing of newlines into paragraphs
    const paragraphs = content.split('\n').map(text => 
      new Paragraph({
        children: [new TextRun({ text, font: "Times New Roman", size: 24 })], // 24 half-points = 12pt
        spacing: { after: 200 }
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${docType}_draft.docx`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setSaveStatus('Copied to clipboard!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...');
      await api.post('/draft/save', {
        docType,
        title: `${docType === 'legal_notice' ? 'Legal Notice' : 'NDA'} - ${new Date().toLocaleDateString()}`,
        content,
        formData
      });
      setSaveStatus('Draft saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      setSaveStatus('Failed to save');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background text-textMain overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-surface z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="text-primary h-6 w-6" />
          <span className="font-serif font-bold text-lg tracking-wide">LexCounsel AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-textMuted hidden md:block">Welcome, {user?.name || user?.email}</span>
          <button onClick={logout} className="p-2 hover:bg-white/5 rounded-lg text-textMuted transition-colors" title="Log Out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Two-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: Action/Input Pane */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-white/10 bg-surface/30">
          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            <button 
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'draft' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('draft')}
            >
              <FileText className="h-4 w-4" /> AI Drafting
            </button>
            <button 
              className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'research' ? 'border-b-2 border-accent text-accent bg-accent/5' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab('research')}
            >
              <Search className="h-4 w-4" /> Legal Research
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {activeTab === 'draft' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-textMuted mb-2">Document Type</label>
                  <select 
                    value={docType} 
                    onChange={e => setDocType(e.target.value as DocType)}
                    className="input-field"
                  >
                    <option value="legal_notice">Legal Notice (Demand/Notice)</option>
                    <option value="nda">Non-Disclosure Agreement (NDA)</option>
                  </select>
                </div>

                {docType === 'legal_notice' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-textMuted mb-1">Sender Name (Client)</label>
                        <input name="senderName" onChange={handleFormChange} className="input-field text-sm mb-3" placeholder="John Doe" />
                        <label className="block text-xs text-textMuted mb-1">Sender Address</label>
                        <input name="senderAddress" onChange={handleFormChange} className="input-field text-sm" placeholder="New Delhi" />
                      </div>
                      <div>
                        <label className="block text-xs text-textMuted mb-1">Recipient Name</label>
                        <input name="recipientName" onChange={handleFormChange} className="input-field text-sm mb-3" placeholder="Jane Smith" />
                        <label className="block text-xs text-textMuted mb-1">Recipient Address</label>
                        <input name="recipientAddress" onChange={handleFormChange} className="input-field text-sm" placeholder="Mumbai" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-textMuted mb-1">Facts of Dispute</label>
                      <textarea name="facts" onChange={handleFormChange} className="input-field text-sm h-24 custom-scrollbar" placeholder="Briefly describe the timeline and facts of the breach/dispute..." />
                    </div>
                    <div>
                      <label className="block text-xs text-textMuted mb-1">Relief/Demand</label>
                      <input name="relief" onChange={handleFormChange} className="input-field text-sm" placeholder="E.g. Pay Rs. 5,00,000/- within 15 days" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-textMuted mb-1">NDA Type</label>
                      <select name="ndaType" onChange={handleFormChange} className="input-field text-sm">
                        <option value="mutual">Mutual NDA</option>
                        <option value="one_way">One-Way NDA</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-textMuted mb-1">Disclosing Party Name</label>
                        <input name="disclosingParty" onChange={handleFormChange} className="input-field text-sm mb-3" placeholder="Company A Pvt Ltd" />
                        <label className="block text-xs text-textMuted mb-1">Disclosing Party Address</label>
                        <input name="disclosingPartyAddress" onChange={handleFormChange} className="input-field text-sm" placeholder="Bangalore" />
                      </div>
                      <div>
                        <label className="block text-xs text-textMuted mb-1">Receiving Party Name</label>
                        <input name="receivingParty" onChange={handleFormChange} className="input-field text-sm mb-3" placeholder="Company B Pvt Ltd" />
                        <label className="block text-xs text-textMuted mb-1">Receiving Party Address</label>
                        <input name="receivingPartyAddress" onChange={handleFormChange} className="input-field text-sm" placeholder="Pune" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-textMuted mb-1">Purpose of Disclosure</label>
                      <input name="purpose" onChange={handleFormChange} className="input-field text-sm" placeholder="Evaluating a potential joint venture" />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleGenerate} 
                  disabled={isStreaming}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
                >
                  {isStreaming ? (
                    <><div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"/> Generating...</>
                  ) : (
                    <><FileText className="h-4 w-4"/> Generate Draft</>
                  )}
                </button>
                {draftError && <p className="text-red-400 text-sm text-center">{draftError}</p>}
              </div>
            )}

            {activeTab === 'research' && (
              <div className="space-y-6 animate-fade-in flex flex-col h-full">
                <div className="shrink-0">
                  <label className="block text-sm font-medium text-textMuted mb-2">Legal Query</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      className="input-field flex-1" 
                      placeholder="e.g. Compensation for breach of contract" 
                    />
                    <button 
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="px-4 py-2 bg-accent hover:bg-yellow-500 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  <p className="text-xs text-textMuted mt-2">Searches across our curated corpus of Indian judgments and bare acts.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {searchError && <p className="text-accent text-sm bg-accent/10 p-4 rounded-lg border border-accent/20">{searchError}</p>}
                  
                  {results.map((res, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl hover:border-slate-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium px-2 py-1 bg-primary/20 text-primary-300 rounded text-primary">
                          {res.source_type === 'judgment' ? 'Precedent' : 'Statute'}
                        </span>
                        <span className="text-xs text-slate-400">Score: {(res.score * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                        "{res.chunk_text}"
                      </p>
                      <div className="flex items-center gap-2">
                        <a href={res.source_url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                          {res.citation}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Output/Editor Pane */}
        <div className="hidden md:flex w-1/2 flex-col bg-[#0b1121]">
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-[#0b1121]">
            <span className="text-sm font-medium text-textMuted uppercase tracking-wider">Output Editor</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary mr-2">{saveStatus}</span>
              <button onClick={handleCopy} disabled={!content} className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded transition-colors" title="Copy text">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={handleSave} disabled={!content} className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded transition-colors" title="Save draft">
                <Save className="h-4 w-4" />
              </button>
              <button onClick={handleDownloadDocx} disabled={!content} className="p-1.5 text-textMuted hover:text-white hover:bg-white/10 rounded transition-colors" title="Download DOCX">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your generated draft will appear here..."
              className="w-full h-full bg-transparent text-slate-300 font-serif leading-relaxed resize-none focus:outline-none custom-scrollbar"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
