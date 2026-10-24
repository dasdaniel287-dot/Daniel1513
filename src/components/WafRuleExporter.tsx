import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, Download, Server, Shield } from 'lucide-react';
import { api } from '../services/api';

export const WafRuleExporter: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'nginx' | 'cloudflare' | 'iptables'>('nginx');
  const [codeContent, setCodeContent] = useState<string>('Loading rules...');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRules(selectedFormat);
  }, [selectedFormat]);

  const fetchRules = async (format: 'nginx' | 'cloudflare' | 'iptables') => {
    setLoading(true);
    try {
      const code = await api.exportWaf(format);
      setCodeContent(code);
    } catch (err) {
      setCodeContent('# Error fetching WAF configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions = {
      nginx: 'conf',
      cloudflare: 'json',
      iptables: 'sh'
    };
    const blob = new Blob([codeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ddos_shield_rules.${extensions[selectedFormat]}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" /> Reverse-Proxy & WAF Rule Generator
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Export active rate limiting and quarantine policies into battle-tested infrastructure configurations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Config</span>
          </button>
        </div>
      </div>

      {/* Format Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setSelectedFormat('nginx')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            selectedFormat === 'nginx'
              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>NGINX Reverse Proxy (limit_req)</span>
        </button>

        <button
          onClick={() => setSelectedFormat('cloudflare')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            selectedFormat === 'cloudflare'
              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Cloudflare WAF Expressions (JSON)</span>
        </button>

        <button
          onClick={() => setSelectedFormat('iptables')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            selectedFormat === 'iptables'
              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Linux iptables (Raw Socket Drop)</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs overflow-x-auto relative">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Generating rules...</div>
        ) : (
          <pre className="text-slate-300 leading-relaxed">{codeContent}</pre>
        )}
      </div>
    </div>
  );
};
