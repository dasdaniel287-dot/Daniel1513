import React, { useState } from 'react';
import { Brain, X, Check, Copy, Shield, AlertTriangle, Cpu, Terminal, ArrowRight } from 'lucide-react';
import { AiIncidentAnalysis } from '../types';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AiIncidentAnalysis | null;
  loading: boolean;
  incidentTitle: string;
  onApplyMitigation?: (policy: AiIncidentAnalysis['recommendedMitigationPolicy']) => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  loading,
  incidentTitle,
  onApplyMitigation
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (analysis && onApplyMitigation) {
      onApplyMitigation(analysis.recommendedMitigationPolicy);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">Gemini 3.8 Flash Forensic Intelligence</h3>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  AI SOC Commander
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Target: {incidentTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs">Synthesizing forensic telemetry via Gemini 3.8 Flash...</span>
            </div>
          ) : analysis ? (
            <>
              {/* Executive Summary Card */}
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-100 leading-relaxed font-mono">
                <span className="font-bold text-cyan-300 block mb-1">EXECUTIVE SUMMARY:</span>
                {analysis.executiveSummary}
              </div>

              {/* Diagnosis Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Attack Classification</span>
                  <span className="font-bold text-slate-100 text-sm">{analysis.attackClassification}</span>
                  <span className="text-[11px] font-mono text-cyan-400 block mt-1">
                    AI Confidence: {analysis.confidence}%
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">False-Positive Assessment</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${analysis.falsePositiveLikelihood === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {analysis.falsePositiveLikelihood} LIKELIHOOD
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {analysis.falsePositiveReasoning}
                  </span>
                </div>
              </div>

              {/* Root cause and blast radius */}
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Forensic Root Cause</span>
                  <p className="text-slate-300 leading-relaxed">{analysis.rootCauseHypothesis}</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/50">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Blast Radius Impact</span>
                  <p className="text-slate-300 leading-relaxed">{analysis.blastRadius}</p>
                </div>
              </div>

              {/* Recommended Mitigation Rules */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-slate-200 text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-400" /> Prescribed Defensive Remediation
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Automated Policy Candidate</span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Immediate Action: </span>
                    <span className="text-slate-200 font-semibold">{analysis.recommendedMitigationPolicy.immediateAction}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Rate Limit Adjustment: </span>
                    <span className="text-cyan-400">{analysis.recommendedMitigationPolicy.rateLimitAdjustment}</span>
                  </div>
                </div>

                {/* Suggested WAF snippet with copy */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Suggested Edge WAF / Reverse Proxy Rule</span>
                    <button
                      onClick={() => handleCopy(analysis.recommendedMitigationPolicy.suggestedWafRule)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Rule'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto">
                    {analysis.recommendedMitigationPolicy.suggestedWafRule}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              No analysis data available.
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            {analysis ? `Analyzed at ${new Date(analysis.analyzedAt).toLocaleTimeString()}` : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-mono text-xs"
            >
              Close
            </button>
            {analysis && onApplyMitigation && (
              <button
                onClick={handleApply}
                disabled={applied}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950"
              >
                {applied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Policy Enforced!</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Enforce AI Recommendation</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
