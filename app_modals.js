/* ═══════════════════════════════════════════════════════════════════════
   GEMINI TRANSLATOR - STANDALONE MODAL COMPONENTS (v8.17.56)
   Extracted modular components for overlay dialogs and inspection modals
   ═══════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const getH = () => (typeof React !== 'undefined' ? React.createElement : window.React?.createElement);
  const h = (typeof React !== 'undefined' ? React.createElement : (typeof window !== 'undefined' ? window.React?.createElement : null));
  const getToast = () => (window.toast || function() {});
  const ic = (name, size = 18, cls = 'shrink-0') => (typeof window.ic === 'function' ? window.ic(name, size, cls) : null);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DIAGNOSTICS & TELEMETRY LOGS MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function DiagnosticsLogsModal(props) {
    const { isOpen, onClose, liveLogs, copyLogsWithReport } = props;
    if (!isOpen) return null;
    const h = getH();
    const toast = getToast();

    return h('div', { className: 'gloss-overlay', style: { zIndex: 9999 } },
      h('div', { className: 'gloss-box', style: { maxWidth: 700, height: '85vh', display: 'flex', flexDirection: 'column' } },
        h('div', { className: 'gloss-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 } }, ic('FileText', 16), 'Live Diagnostics & API Logs'),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'chip-act', style: { background: 'var(--accent, #6366f1)', color: '#fff' }, onClick: copyLogsWithReport }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Copy', 13), 'Copy All')),
            h('button', {
              type: 'button',
              className: 'chip-act',
              title: 'Send all buffered logs to PC Agent over Wi-Fi',
              onClick: () => {
                const logs = window.AppLogger ? window.AppLogger.getFormattedText() : '';
                window.sendTelemetry?.('MANUAL_DUMP', 'Manual log buffer dump requested by user', logs);
                toast('Log buffer sent to PC Agent!', 'success');
              }
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Send', 13), 'Send to Agent')),
            h('button', { type: 'button', className: 'chip-act', onClick: () => { window.AppLogger?.clear(); toast('Logs cleared', 'info'); } }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Trash2', 13), 'Clear')),
            h('button', { type: 'button', className: 'icon-btn', onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
          )
        ),
        h('div', {
          style: {
            flex: 1,
            overflowY: 'auto',
            background: '#090a0f',
            color: '#e2e8f0',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            lineHeight: 1.5,
            padding: 12,
            borderRadius: 8,
            margin: '10px 0',
            border: '1px solid var(--hairline)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }
        },
          (!liveLogs || liveLogs.length === 0)
            ? h('div', { style: { color: '#64748b', textAlign: 'center', marginTop: 40 } }, 'No diagnostic events recorded yet. Run a translation to see live telemetry.')
            : liveLogs.map((l, idx) => {
                const color = l.level === 'warn' ? '#f59e0b' : (l.level === 'error' ? '#ef4444' : '#38bdf8');
                let det = '';
                if (l.details) {
                  if (typeof l.details === 'object' && l.details.matchedTerms) {
                    det = ` (${l.details.matchedCount || l.details.matchedTerms.length} terms matched)`;
                  } else {
                    const raw = typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details);
                    det = raw.length > 180 ? ' ' + raw.slice(0, 180) + '…' : ' ' + raw;
                  }
                }
                return h('div', { key: idx, style: { padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' } },
                  h('span', { style: { color: '#64748b' } }, `[${l.time}] `),
                  h('span', { style: { color, fontWeight: 700 } }, `[${(l.tag || 'INFO').toUpperCase()}] `),
                  h('span', { style: { color: '#cbd5e1' } }, l.message),
                  det && h('span', { style: { color: '#94a3b8', fontSize: 10 } }, det)
                );
              })
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--paper-dim)' } },
          h('span', null, `${(liveLogs || []).length} events logged (buffer: ${window.AppLogger?.maxLogs || 250})`),
          h('button', { type: 'button', className: 'mini-btn', onClick: onClose }, 'Done')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. BULK API KEY IMPORT MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function BulkApiKeyImportModal(props) {
    const { isOpen, onClose, provider, bulkKeyText, setBulkKeyText, onImport } = props;
    if (!isOpen) return null;
    const h = getH();
    const toast = getToast();

    return h('div', { className: 'gloss-overlay', style: { zIndex: 9999 } },
      h('div', { className: 'gloss-box', style: { maxWidth: 520 } },
        h('div', { className: 'gloss-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 } }, ic('Key', 16), `Bulk Paste ${(provider || '').toUpperCase()} Keys`),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' } },
          h('p', { style: { fontSize: 12, color: 'var(--paper-dim)', margin: 0 } }, 'Paste keys below (one per line or comma-separated):'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 6 },
            onClick: async () => {
              try {
                const clipText = await navigator.clipboard.readText();
                if (clipText && clipText.trim()) {
                  setBulkKeyText(clipText.trim());
                  toast('Pasted from clipboard!', 'success');
                } else {
                  toast('Clipboard is empty', 'info');
                }
              } catch(e) {
                toast('Clipboard access denied', 'error');
              }
            }
          }, ic('Clipboard', 13), 'Paste from Clipboard')
        ),
        h('textarea', {
          value: bulkKeyText,
          onChange: e => setBulkKeyText(e.target.value),
          placeholder: "AIzaSyAr12345...\nAIzaSyBc67890...\nAIzaSyCd11223...",
          style: {
            width: '100%',
            height: 160,
            background: 'var(--void)',
            color: 'var(--paper)',
            border: '1px solid var(--hairline)',
            borderRadius: 8,
            padding: 10,
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            outline: 'none',
            resize: 'vertical'
          }
        }),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 } },
          h('button', { type: 'button', className: 'mini-btn ghost', onClick: onClose }, 'Cancel'),
          h('button', { type: 'button', className: 'mini-btn', style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 }, onClick: onImport }, 'Import All Keys')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. GLOSSARY FULL-SCREEN EDITOR MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function GlossaryEditorModal(props) {
    const {
      isOpen, onClose, terminology, setTerminology, glossaryTermCount,
      activeGlossaryId, handleSaveGlossary, applyGlossaryPreset,
      handleAiOptimizeGlossary, isOptimizingGlossary, importGlossaryFile,
      exportGlossaryTxt, smartGlossary, setSmartGlossary
    } = props;
    if (!isOpen) return null;
    const h = getH();

    return h('div', {
      className: 'gloss-overlay',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '8px 16px'
      }
    },
      h('div', {
        className: 'tl-head-inner',
        style: {
          width: '100%',
          maxWidth: '880px',
          margin: '0 auto',
          padding: '12px 16px',
          boxSizing: 'border-box'
        }
      },
        h('div', null,
          h('div', { className: 'tl-title' }, 'Glossary'),
          h('div', { className: 'tl-subtitle' }, `${glossaryTermCount} terms · full-screen editor`)
        ),
        h('div', { className: 'pane-acts' },
          h('button', {
            type: 'button',
            className: 'chip-act accent',
            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700, padding: '4px 10px' },
            onClick: async () => {
              await handleSaveGlossary(activeGlossaryId);
            }
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Save', 13), activeGlossaryId ? `Save "${activeGlossaryId}"` : 'Save Profile')),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('ri') }, 'Cultivation'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('lotm') }, 'Fantasy'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('cote') }, 'School'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('xianxia') }, 'Xianxia'),
          h('button', { type: 'button', className: 'chip-act accent', disabled: isOptimizingGlossary, onClick: handleAiOptimizeGlossary }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Sparkles', 13), isOptimizingGlossary ? 'Optimizing…' : 'AI Optimize')),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        )
      ),
      h('div', {
        className: 'gloss-editor',
        style: {
          width: '100%',
          maxWidth: '880px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box'
        }
      },
        h('textarea', {
          value: terminology,
          onChange: e => { setTerminology(e.target.value); localStorage.setItem('terminology', e.target.value); },
          placeholder: 'Enter character names and lore terms (e.g. - Character Name -> Character Name (Protagonist))',
          style: {
            width: '100%',
            height: '100%',
            minHeight: '380px',
            margin: '0 auto',
            boxSizing: 'border-box'
          }
        })
      ),
      h('div', {
        className: 'gloss-foot',
        style: {
          width: '100%',
          maxWidth: '880px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }
      },
        h('span', null, `${glossaryTermCount} terms · ${(terminology || '').split(/\s+/).filter(Boolean).length} words`),
        h('div', { className: 'pane-acts' },
          h('button', {
            type: 'button',
            className: 'chip-act accent',
            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700 },
            onClick: async () => {
              await handleSaveGlossary(activeGlossaryId);
              onClose();
            }
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Save', 13), 'Save & Close')),
          h('label', { className: 'chip-act', style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 } },
            ic('Upload', 13),
            'Import',
            h('input', { type: 'file', accept: '.txt', style: { display: 'none' }, onChange: importGlossaryFile })
          ),
          h('button', { type: 'button', className: 'chip-act', onClick: exportGlossaryTxt }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('Download', 13), 'Export')),
          h('button', { type: 'button', className: `chip-act ${smartGlossary ? '' : 'ghost'}`, onClick: () => { setSmartGlossary(!smartGlossary); localStorage.setItem('smartGlossary', !smartGlossary); } }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('Sparkles', 13), `Smart ${smartGlossary ? 'On' : 'Off'}`))
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. NOVEL HEALTH & TRANSLATION QA REPORT MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function QaReportModal(props) {
    const {
      isOpen, onClose, qaAuditResult, qaFilterCategory, setQaFilterCategory,
      qaCheckGaps, setQaCheckGaps,
      qaCheckCorrupt, setQaCheckCorrupt,
      qaCheckCjk, setQaCheckCjk,
      qaCheckAntiMtl, setQaCheckAntiMtl,
      qaCheckLoops, setQaCheckLoops,
      qaCheckDuplicates, setQaCheckDuplicates,
      qaAuditNovelRef, runNovelHealthAudit,
      onInspectChapterInReader
    } = props;
    if (!isOpen) return null;
    const h = getH();
    const toast = getToast();

    const score = qaAuditResult?.score ?? 100;
    const grade = qaAuditResult?.grade || 'A+';
    const total = qaAuditResult?.totalChapters || 0;
    const healthy = qaAuditResult?.healthyCount || 0;
    const scoreColor = score >= 85 ? '#10b981' : (score >= 70 ? '#f59e0b' : '#ef4444');
    const issues = qaAuditResult?.issues || [];
    const summary = qaAuditResult?.summary || { gaps: 0, corrupt: 0, cjkLeaks: 0, refusals: 0, loops: 0, duplicates: 0 };

    const filteredIssues = issues.filter(iss => {
      if (qaFilterCategory === 'all') return true;
      if (qaFilterCategory === 'gap') return iss.category === 'gap';
      if (qaFilterCategory === 'corrupt') return iss.category === 'corrupt';
      if (qaFilterCategory === 'cjk_leak') return iss.category === 'cjk_leak';
      if (qaFilterCategory === 'refusal') return iss.category === 'refusal';
      if (qaFilterCategory === 'loop') return iss.category === 'loop';
      if (qaFilterCategory === 'duplicate') return iss.category === 'duplicate';
      return true;
    });

    const handleToggleRule = (ruleKey, newVal) => {
      let updatedOverrides = {};
      if (ruleKey === 'gaps') { setQaCheckGaps(newVal); updatedOverrides.checkGaps = newVal; }
      if (ruleKey === 'corrupt') { setQaCheckCorrupt(newVal); updatedOverrides.checkCorrupt = newVal; }
      if (ruleKey === 'cjk') { setQaCheckCjk(newVal); updatedOverrides.checkCjkLeaks = newVal; }
      if (ruleKey === 'refusal') { setQaCheckAntiMtl(newVal); updatedOverrides.checkAntiMtl = newVal; }
      if (ruleKey === 'loop') { setQaCheckLoops(newVal); updatedOverrides.checkLoops = newVal; }
      if (ruleKey === 'duplicates') { setQaCheckDuplicates(newVal); updatedOverrides.checkDuplicates = newVal; }
      runNovelHealthAudit(qaAuditNovelRef, updatedOverrides);
    };

    const handleCopyReport = () => {
      const reportText = [
        `# Novel Health & Translation QA Audit`,
        `Novel: ${qaAuditResult?.title || 'Unknown'}`,
        `Health Score: ${score}% (Grade ${grade})`,
        `Chapters: ${healthy} / ${total} Healthy`,
        `Date: ${new Date().toLocaleString()}`,
        `\n## Findings Summary:`,
        `- Missing Gaps: ${summary.gaps}`,
        `- Corrupt / Empty: ${summary.corrupt}`,
        `- CJK Untranslated Leaks: ${summary.cjkLeaks}`,
        `- Anti-MTL AI Refusals: ${summary.refusals}`,
        `- Hallucination Loops: ${summary.loops}`,
        `- Duplicates: ${summary.duplicates}`,
        `\n## Flagged Issues (${issues.length}):`,
        ...issues.map((iss, i) => `${i + 1}. [${iss.category.toUpperCase()}] ${iss.chapterTitle}: ${iss.description}${iss.snippet ? `\n   Snippet: "${iss.snippet}"` : ''}`)
      ].join('\n');

      const copyFn = window.copyText || ((t) => navigator.clipboard?.writeText(t));
      Promise.resolve(copyFn(reportText)).then(() => toast('Health audit report copied to clipboard!', 'success'));
    };

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 660, maxHeight: '90vh' }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Activity', 20, 'text-indigo-400'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Novel Health & Translation QA Report'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, qaAuditResult?.title || 'Active Document')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd custom-scrollbar', style: { overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', {
            style: {
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
              h('div', {
                style: {
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  border: `3px solid ${scoreColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${scoreColor}18`,
                  color: scoreColor,
                  fontWeight: 800,
                  lineHeight: 1
                }
              },
                h('span', { style: { fontSize: 16 } }, `${score}%`),
                h('span', { style: { fontSize: 10, marginTop: 2, opacity: 0.85 } }, grade)
              ),
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 14, color: 'var(--paper)' } },
                  score >= 95 ? 'Excellent Health' : (score >= 80 ? 'Good Condition' : (score >= 60 ? 'Needs Attention' : 'Critical Issues Detected'))
                ),
                h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 2 } },
                  `${healthy} of ${total} chapters 100% healthy (${issues.length} issue${issues.length === 1 ? '' : 's'} flagged)`
                )
              )
            ),
            h('button', {
              type: 'button',
              className: 'chip-act',
              style: { fontWeight: 600, padding: '6px 12px' },
              onClick: handleCopyReport
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Copy', 13), 'Copy Report'))
          ),

          h('div', {
            style: {
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 6,
              padding: '10px 12px'
            }
          },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--iris)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 } },
              'Active Heuristic Rules (Toggle On/Off)'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              [
                { key: 'gaps', label: 'Sequence Gaps', val: qaCheckGaps },
                { key: 'corrupt', label: 'Corrupt / Empty', val: qaCheckCorrupt },
                { key: 'cjk', label: 'CJK Leaks', val: qaCheckCjk },
                { key: 'refusal', label: 'Anti-MTL Refusal', val: qaCheckAntiMtl },
                { key: 'loop', label: 'Repetition Loops', val: qaCheckLoops },
                { key: 'duplicates', label: 'Duplicates', val: qaCheckDuplicates }
              ].map(r => h('button', {
                key: r.key,
                type: 'button',
                className: `seg-btn ${r.val ? 'active' : ''}`,
                style: {
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: r.val ? 'var(--iris)' : 'var(--void)',
                  color: r.val ? '#fff' : 'var(--slate)',
                  border: r.val ? '1px solid var(--iris)' : '1px solid var(--hairline)',
                  fontWeight: r.val ? 600 : 400
                },
                onClick: () => handleToggleRule(r.key, !r.val)
              }, `${r.val ? 'Active: ' : 'Off: '} ${r.label}`))
            )
          ),

          h('div', { className: 'seg', style: { overflowX: 'auto', display: 'flex', gap: 4, paddingBottom: 2 } },
            [
              { id: 'all', label: `All (${issues.length})` },
              summary.gaps > 0 && { id: 'gap', label: `Gaps (${summary.gaps})` },
              summary.corrupt > 0 && { id: 'corrupt', label: `Corrupt (${summary.corrupt})` },
              summary.cjkLeaks > 0 && { id: 'cjk_leak', label: `CJK Leaks (${summary.cjkLeaks})` },
              summary.refusals > 0 && { id: 'refusal', label: `AI Refusal (${summary.refusals})` },
              summary.loops > 0 && { id: 'loop', label: `Loops (${summary.loops})` },
              summary.duplicates > 0 && { id: 'duplicate', label: `Duplicates (${summary.duplicates})` }
            ].filter(Boolean).map(tab => h('button', {
              key: tab.id,
              type: 'button',
              className: `seg-btn ${qaFilterCategory === tab.id ? 'active' : ''}`,
              style: qaFilterCategory === tab.id ? { background: 'var(--iris)', color: '#fff', fontWeight: 600, fontSize: 11.5 } : { fontSize: 11.5 },
              onClick: () => setQaFilterCategory(tab.id)
            }, tab.label))
          ),

          filteredIssues.length === 0
            ? h('div', {
                style: {
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 8
                }
              },
                h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } }, ic('CheckCircle', 32, 'text-emerald-400')),
                h('div', { style: { fontWeight: 700, fontSize: 14, color: '#10b981' } },
                  issues.length === 0 ? 'Novel is 100% Healthy!' : 'No issues found in this category.'
                ),
                h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 4 } },
                  issues.length === 0 ? 'Zero missing chapters, corrupt text, untranslated CJK leaks, or AI refusals found.' : 'Try selecting "All" to inspect other categories.'
                )
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                filteredIssues.map((iss, i) => {
                  const badgeColor = iss.category === 'gap' ? '#f59e0b'
                    : (iss.category === 'corrupt' ? '#ef4444'
                    : (iss.category === 'cjk_leak' ? '#8b5cf6'
                    : (iss.category === 'refusal' ? '#ec4899'
                    : (iss.category === 'loop' ? '#eab308' : '#3b82f6'))));

                  return h('div', {
                    key: i,
                    style: {
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--hairline)',
                      borderLeft: `3px solid ${badgeColor}`,
                      borderRadius: '0 6px 6px 0',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' } },
                      h('div', { style: { fontWeight: 600, fontSize: 13, color: 'var(--paper)' } },
                        iss.chapterTitle
                      ),
                      h('span', {
                        style: {
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: `${badgeColor}22`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}44`,
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }
                      }, iss.category.replace('_', ' '))
                    ),
                    h('div', { style: { fontSize: 12, color: 'var(--paper-dim)' } }, iss.description),
                    iss.snippet && h('div', {
                      style: {
                        fontSize: 11,
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: 'var(--void)',
                        padding: '6px 8px',
                        borderRadius: 4,
                        color: 'var(--slate)',
                        wordBreak: 'break-all'
                      }
                    }, `Snippet: "${iss.snippet}"`),
                    iss.samples && iss.samples.length > 0 && h('div', {
                      style: {
                        fontSize: 11,
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: 'var(--void)',
                        padding: '6px 8px',
                        borderRadius: 4,
                        color: 'var(--slate)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }
                    }, iss.samples.map((s, si) => h('div', { key: si }, `Sample: "${s}"`))),
                    h('div', { style: { display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end' } },
                      iss.chapterIdx !== undefined && h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { fontSize: 11, padding: '4px 10px' },
                        onClick: () => {
                          if (onInspectChapterInReader) {
                            onInspectChapterInReader(iss);
                          }
                        }
                      }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('BookOpen', 13), 'Inspect in Reader'))
                    )
                  );
                })
              )
        ),
        h('div', { style: { padding: '12px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end' } },
          h('button', {
            type: 'button',
            className: 'btn-primary',
            style: { padding: '6px 18px', fontSize: 12 },
            onClick: onClose
          }, 'Done')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. TRANSLATION DIFF & REVISION HISTORY MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function DiffHistoryModal(props) {
    const {
      isOpen, onClose, activeDiffData, selectedDiffSnapId,
      handleSelectDiffSnapshot, diffSnapshotsList,
      handleManualSnapshot, handleRollbackDiffSnapshot
    } = props;
    if (!isOpen) return null;
    const h = getH();

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 760, maxHeight: '90vh', width: '92vw' }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('GitCompare', 20, 'text-indigo-400'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Translation Diff & Revision History (§8.6)'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, activeDiffData?.title || 'Chapter Revisions')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd custom-scrollbar', style: { overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' } }, 'Compare with Snapshot:'),
              h('select', {
                className: 'field-select',
                style: { fontSize: 12, padding: '4px 8px', minWidth: 160 },
                value: selectedDiffSnapId,
                onChange: (e) => handleSelectDiffSnapshot(e.target.value)
              },
                (diffSnapshotsList || []).map((s, idx) => h('option', { key: s.id, value: s.id },
                  `v${diffSnapshotsList.length - idx}: ${s.model || 'Model'} (${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) · ${s.wordCount || 0}w`
                ))
              ),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { padding: '4px 10px', fontSize: 11.5, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', border: '1px solid rgba(99, 102, 241, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                onClick: handleManualSnapshot,
                title: 'Save a snapshot of current text now'
              }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Camera', 13), 'Snapshot Current Text'))
            ),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, fontWeight: 600 } },
              h('span', { style: { background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', padding: '3px 8px', borderRadius: 4 } }, `+${activeDiffData?.addedWords || 0} words`),
              h('span', { style: { background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '3px 8px', borderRadius: 4 } }, `-${activeDiffData?.removedWords || 0} words`),
              h('span', { style: { background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: 4 } }, `${activeDiffData?.similarityPct ?? 100}% similarity`)
            )
          ),

          h('div', {
            style: {
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#c7d2fe',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8
            }
          },
            ic('HelpCircle', 15, 'text-indigo-400 shrink-0 mt-0.5'),
            h('div', null,
              h('strong', { style: { color: '#ffffff' } }, 'How to test Translation Diffs: '),
              '1) Take a snapshot or let translation run. 2) Switch models, adjust prompt/glossary, or edit text and translate again. 3) Select the revision above to see color-coded additions (green) & deletions (red), or click ',
              h('strong', null, 'Rollback'),
              ' to restore!'
            )
          ),

          h('div', { style: { display: 'flex', gap: 14, fontSize: 11, color: 'var(--slate)', alignItems: 'center' } },
            h('span', null, 'Legend:'),
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
              h('span', { style: { display: 'inline-block', width: 10, height: 10, background: 'rgba(239, 68, 68, 0.5)', borderRadius: 2 } }),
              'Previous Text (Removed)'
            ),
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
              h('span', { style: { display: 'inline-block', width: 10, height: 10, background: 'rgba(16, 185, 129, 0.5)', borderRadius: 2 } }),
              'Current Text (Added)'
            )
          ),

          h('div', {
            className: 'custom-scrollbar',
            style: {
              background: '#090a0f',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px',
              maxHeight: '52vh',
              overflowY: 'auto',
              lineHeight: '1.7',
              fontSize: 13.5,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            },
            dangerouslySetInnerHTML: {
              __html: activeDiffData?.html || '<div style="color: var(--slate); text-align: center; padding: 20px;">Select a revision above or take a translation snapshot to view diffs.</div>'
            }
          })
        ),
        h('div', { style: { padding: '12px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          selectedDiffSnapId ? h('button', {
            type: 'button',
            className: 'btn-secondary',
            style: { color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)', padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 },
            onClick: () => handleRollbackDiffSnapshot(selectedDiffSnapId)
          }, '↺ Rollback Chapter to this Snapshot') : h('div', null),
          h('button', {
            type: 'button',
            className: 'btn-primary',
            style: { padding: '6px 18px', fontSize: 12 },
            onClick: onClose
          }, 'Close')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. AUTO-GLOSSARY & CHARACTER EXTRACTOR MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function AutoGlossaryModal(props) {
    const {
      isOpen, onClose, autoGlossaryTargetNovel, chapters, activeNovelRecord,
      autoGlossaryChapterCount, setAutoGlossaryChapterCount,
      isExtractingGlossary, handleExtractGlossary,
      extractedTerms, setExtractedTerms, handleApplyExtractedTerms
    } = props;
    if (!isOpen) return null;
    const h = getH();

    const targetNovel = autoGlossaryTargetNovel;
    const targetChapters = targetNovel?.chapters || targetNovel?.rawChapters || chapters || [];
    const totalChs = targetChapters.length;
    const novelTitle = (targetNovel?.title || (chapters && chapters[0]?.title) || (activeNovelRecord && activeNovelRecord.title) || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 } },
            ic('Sparkles', 18, 'text-amber-400'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'AI Auto-Glossary & Character Extractor'),
              novelTitle && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--iris)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ic('BookOpen', 12), novelTitle)
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd' },
          h('p', { style: { fontSize: 12, color: 'var(--slate)', marginBottom: 14, lineHeight: 1.5 } },
            'Deeply scans novel text using Gemini to discover character names, aliases, sects, factions, and realm terminology formatted for Smart Glossary with locked character genders.'
          ),
          h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: 12, borderRadius: 4, marginBottom: 16 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
              h('span', { style: { fontSize: 12, fontWeight: 600 } }, 'Chapters to Sample:'),
              h('span', { className: 'badge', style: { fontFamily: "'IBM Plex Mono', monospace" } },
                totalChs > 0
                  ? `${autoGlossaryChapterCount} / ${totalChs} chapters (${autoGlossaryChapterCount === totalChs ? 'ALL' : `Ch. 1 - ${autoGlossaryChapterCount}`})`
                  : 'Single Input Text'
              )
            ),
            totalChs > 1 && h('input', {
              type: 'range',
              min: 1,
              max: totalChs,
              value: autoGlossaryChapterCount,
              onChange: e => setAutoGlossaryChapterCount(parseInt(e.target.value)),
              style: { width: '100%', accentColor: 'var(--iris)' }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate)', marginTop: 4 } },
              h('span', null, '1 Chapter'),
              h('span', null, totalChs > 0 ? `All (${totalChs} Chs)` : 'Input Box')
            )
          ),
          h('div', { style: { display: 'flex', gap: 10, marginBottom: 14 } },
            h('button', {
              type: 'button',
              className: 'btn primary',
              style: { flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
              disabled: isExtractingGlossary,
              onClick: handleExtractGlossary
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Sparkles', 14), isExtractingGlossary ? 'Analyzing Chapters with AI…' : 'Extract Characters & Lore'))
          ),
          extractedTerms && extractedTerms.length > 0 && h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--hairline)' } },
              h('span', { style: { fontSize: 12, fontWeight: 600, color: 'var(--paper)' } }, `Extracted Entities (${extractedTerms.filter(t => t.checked).length}/${extractedTerms.length} selected)`),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 11, padding: '2px 8px' },
                onClick: () => {
                  const allChecked = extractedTerms.every(t => t.checked);
                  setExtractedTerms(extractedTerms.map(t => ({ ...t, checked: !allChecked })));
                }
              }, extractedTerms.every(t => t.checked) ? 'Deselect All' : 'Select All')
            ),
            h('div', { style: { maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 } },
              extractedTerms.map((t, idx) => h('div', {
                key: t.id || idx,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 4,
                  padding: '6px 10px'
                }
              },
                h('input', {
                  type: 'checkbox',
                  checked: !!t.checked,
                  onChange: e => {
                    const checked = e.target.checked;
                    setExtractedTerms(prev => prev.map(item => item.id === t.id ? { ...item, checked } : item));
                  },
                  style: { accentColor: 'var(--iris)' }
                }),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                    h('span', { style: { fontWeight: 600, fontSize: 12, color: 'var(--paper)' } }, t.orig),
                    h('span', { style: { color: 'var(--slate)', fontSize: 11 } }, '→'),
                    h('span', { style: { fontWeight: 600, fontSize: 12, color: 'var(--iris)' } }, t.trans),
                    h('span', { className: 'badge', style: { fontSize: 9, textTransform: 'uppercase', padding: '1px 5px' } }, t.category || 'Term'),
                    t.gender && h('span', {
                      className: 'badge',
                      style: {
                        fontSize: 9,
                        padding: '1px 6px',
                        cursor: 'pointer',
                        background: t.gender === 'female' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: t.gender === 'female' ? '#ec4899' : '#3b82f6',
                        border: `1px solid ${t.gender === 'female' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                      },
                      title: 'Click to toggle gender',
                      onClick: (e) => {
                        e.stopPropagation();
                        const nextGen = t.gender === 'female' ? 'male' : 'female';
                        setExtractedTerms(prev => prev.map(item => item.id === t.id ? { ...item, gender: nextGen, category: `Character (${nextGen})` } : item));
                      }
                    }, t.gender === 'female' ? 'Female' : 'Male')
                  ),
                  t.note && h('div', { style: { fontSize: 11, color: 'var(--slate)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.note)
                )
              ))
            )
          )
        ),
        extractedTerms && extractedTerms.length > 0 && h('div', { className: 'modal-ft' },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            onClick: () => handleApplyExtractedTerms(true)
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Save', 13), targetNovel ? 'Save as Novel Profile' : 'Save as New Profile')),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--iris)', color: '#fff', fontWeight: 600 },
            onClick: () => handleApplyExtractedTerms(false)
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Plus', 13), `Append to Glossary (${extractedTerms.filter(t => t.checked).length})`))
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. NAME CONSISTENCY VERIFIER MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function NameConsistencyModal(props) {
    const {
      isOpen, onClose, consistencyAuditResults, handleBatchFixDrift,
      handleRunConsistencyCheck, isAuditingConsistency
    } = props;
    if (!isOpen) return null;
    const h = getH();

    const totalChecked = consistencyAuditResults ? consistencyAuditResults.length : 0;
    const leakItems = consistencyAuditResults ? consistencyAuditResults.filter(r => r.totalLeaks > 0) : [];
    const driftItems = consistencyAuditResults ? consistencyAuditResults.filter(r => r.driftMatches && r.driftMatches.length > 0) : [];

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 640 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Search', 18, 'text-indigo-400'),
            h('span', { style: { fontWeight: 700, fontSize: 14 } }, 'Name Consistency & Leak Verifier')
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd' },
          h('p', { style: { fontSize: 12, color: 'var(--slate)', marginBottom: 14, lineHeight: 1.5 } },
            'Audits all translated chapters against active glossary rules to detect untranslated source leaks and spelling variations/drift.'
          ),
          !consistencyAuditResults ? null : h(React.Fragment, null,
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 } },
              h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: 10, borderRadius: 4, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Terms Checked'),
                h('div', { style: { fontSize: 16, fontWeight: 700, marginTop: 2 } }, totalChecked)
              ),
              h('div', { style: { background: leakItems.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${leakItems.length > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--hairline)'}`, padding: 10, borderRadius: 4, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: leakItems.length > 0 ? '#f87171' : 'var(--slate)' } }, 'Leaks Detected'),
                h('div', { style: { fontSize: 16, fontWeight: 700, marginTop: 2, color: leakItems.length > 0 ? '#f87171' : 'inherit' } }, leakItems.length)
              ),
              h('div', { style: { background: driftItems.length > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${driftItems.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--hairline)'}`, padding: 10, borderRadius: 4, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: driftItems.length > 0 ? '#fbbf24' : 'var(--slate)' } }, 'Spelling Drift'),
                h('div', { style: { fontSize: 16, fontWeight: 700, marginTop: 2, color: driftItems.length > 0 ? '#fbbf24' : 'inherit' } }, driftItems.length)
              )
            ),
            (leakItems.length === 0 && driftItems.length === 0)
              ? h('div', { style: { padding: 18, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 4, textAlign: 'center', color: '#34d399' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 600, marginBottom: 4 } }, ic('CheckCircle', 16, 'text-emerald-400'), '100% Consistent!'),
                  h('div', { style: { fontSize: 12, color: 'var(--paper-dim)' } }, 'No untranslated source terms or known romanization drift detected across chapters.')
                )
              : h('div', { style: { maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 } },
                  leakItems.map((item, idx) => h('div', {
                    key: 'leak_' + idx,
                    style: { background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 4, padding: '10px 12px' }
                  },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 700, fontSize: 12, color: '#f87171' } }, item.orig),
                        h('span', { style: { color: 'var(--slate)', fontSize: 11 } }, '→ should be'),
                        h('span', { style: { fontWeight: 700, fontSize: 12, color: 'var(--iris)' } }, item.target)
                      ),
                      h('span', { className: 'badge', style: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid currentColor', fontSize: 10 } },
                        `${item.totalLeaks} Untranslated Leak(s)`
                      )
                    ),
                    h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 8 } },
                      `Found in: ${item.leaksFoundIn.map(l => `${l.chName} (${l.count}x)`).join(', ')}`
                    ),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid currentColor', fontSize: 11 },
                      onClick: () => handleBatchFixDrift(item.orig, item.target)
                    }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Check', 12), `Replace All Leaks with "${item.target}"`))
                  )),
                  driftItems.map((item, idx) => h('div', {
                    key: 'drift_' + idx,
                    style: { background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 4, padding: '10px 12px' }
                  },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 700, fontSize: 12, color: '#fbbf24' } }, item.target)
                      ),
                      h('span', { className: 'badge', style: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid currentColor', fontSize: 10 } },
                        'Spelling Variation'
                      )
                    ),
                    item.driftMatches.map((dm, dIdx) => h('div', { key: dIdx, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 } },
                      h('span', { style: { fontSize: 11, color: 'var(--slate)' } },
                        `Found "${dm.found}" (${dm.count}x in ${dm.chName})`
                      ),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn',
                        style: { background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid currentColor', fontSize: 10, padding: '2px 8px' },
                        onClick: () => handleBatchFixDrift(dm.found, dm.shouldBe)
                      }, `Fix to "${dm.shouldBe}"`)
                    ))
                  ))
                )
          )
        ),
        h('div', { className: 'modal-ft' },
          h('button', {
            type: 'button',
            className: 'mini-btn',
            onClick: handleRunConsistencyCheck,
            disabled: isAuditingConsistency
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('RefreshCw', 13), isAuditingConsistency ? 'Auditing…' : 'Re-audit Chapters')),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            onClick: onClose
          }, 'Close')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. GOOGLE DRIVE CONFIGURATION MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function GdriveConfigModal(props) {
    const {
      isOpen, onClose, gdriveClientId, setGdriveClientId,
      gdriveManualToken, setGdriveManualToken,
      setGdriveConnected, testGoogleDriveConnection
    } = props;
    if (!isOpen) return null;
    const h = getH();
    const toast = getToast();

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 540 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Cloud', 18, 'text-sky-400'),
            h('span', { style: { fontWeight: 700, fontSize: 14 } }, 'Google Drive Settings (Mihon/Komikku)')
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', { style: { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '10px 12px' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 4 } }, 'No Developer Account? Use 1-Tap File Backup!'),
            h('div', { style: { fontSize: 10.5, color: 'var(--slate)', lineHeight: 1.45 } },
              'If you don\'t want to configure Google Cloud Console, use ',
              h('strong', { style: { color: 'var(--paper-dim)' } }, '1-Tap Google Drive File Backup'),
              ' in Settings. It uses Android Storage Access Framework to save/restore directly into your Google Drive with zero setup.'
            )
          ),
          h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'GOOGLE OAUTH CLIENT ID (OPTIONAL)'),
              h('label', {
                className: 'mini-btn ghost',
                style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 10, color: 'var(--iris)' }
              },
                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Folder', 13), 'Import client_secrets.json'),
                h('input', {
                  type: 'file',
                  accept: '.json',
                  style: { display: 'none' },
                  onChange: async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const json = JSON.parse(text);
                      const cid = json.web?.client_id || json.installed?.client_id || json.client_id;
                      if (cid) {
                        setGdriveClientId(cid);
                        localStorage.setItem('gdrive_client_id', cid);
                        window.GoogleDriveSync?.setClientId?.(cid);
                        toast('Client ID loaded from ' + file.name + '!', 'success');
                      } else {
                        toast('No client_id found in selected JSON file.', 'warning');
                      }
                    } catch(err) {
                      toast('Failed to read JSON: ' + err.message, 'error');
                    }
                  }
                })
              )
            ),
            h('input', {
              type: 'text',
              placeholder: 'xxxxxxxxxxxx-xxxxxxxxxxxx.apps.googleusercontent.com',
              value: gdriveClientId,
              onChange: e => setGdriveClientId(e.target.value.trim()),
              style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
            }),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 } },
              h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Authorized Origin: ' + (typeof window !== 'undefined' ? window.location.origin : '')),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 10, padding: '2px 8px' },
                onClick: () => {
                  navigator.clipboard?.writeText(window.location.origin);
                  toast('Origin copied: ' + window.location.origin, 'info');
                }
              }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Copy', 12), 'Copy Origin'))
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 } },
              h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Authorized Redirect URI: ' + (window.GoogleDriveSync?.getRedirectUri?.() || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''))),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 10, padding: '2px 8px' },
                onClick: () => {
                  const rUri = window.GoogleDriveSync?.getRedirectUri?.() || (window.location.origin + window.location.pathname);
                  navigator.clipboard?.writeText(rUri);
                  toast('Redirect URI copied: ' + rUri, 'info');
                }
              }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Copy', 12), 'Copy Redirect URI'))
            )
          ),
          h('div', { style: { background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 10.5, color: 'var(--slate)', lineHeight: 1.45 } },
            h('strong', { style: { color: 'var(--paper-dim)' } }, 'Do I need a Client Secret? No! '),
            'Public client-side web apps and mobile apps never use client secrets for security reasons. Google Cloud OAuth Web Clients only require the Client ID and Authorized JavaScript Origins.'
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--slate)', marginBottom: 4, fontWeight: 600 } }, 'DIRECT ACCESS TOKEN (OPTIONAL / TESTING)'),
            h('input', {
              type: 'password',
              placeholder: 'Paste ya29.a0... OAuth token',
              value: gdriveManualToken,
              onChange: e => setGdriveManualToken(e.target.value.trim()),
              style: { width: '100%', background: 'var(--ember-2)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '8px 10px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--paper-dim)', outline: 'none' }
            }),
            h('div', { style: { fontSize: 10, color: 'var(--slate)', marginTop: 3 } }, 'Allows manual token override if OAuth popups are blocked by your environment.')
          )
        ),
        h('div', { className: 'modal-ft' },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            onClick: onClose
          }, 'Cancel'),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
            onClick: async () => {
              if (gdriveClientId) {
                localStorage.setItem('gdrive_client_id', gdriveClientId);
                window.GoogleDriveSync?.setClientId?.(gdriveClientId);
              } else {
                localStorage.removeItem('gdrive_client_id');
                window.GoogleDriveSync?.setClientId?.('');
              }
              if (gdriveManualToken) {
                window.GoogleDriveSync?.setToken?.(gdriveManualToken, 3600);
                setGdriveConnected(true);
                await testGoogleDriveConnection();
              }
              onClose();
              toast('Google Drive settings applied!', 'success');
            }
          }, 'Save & Apply')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. NOVEL RENAME MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function NovelRenameModal(props) {
    const { novel, onClose, value, setValue, onSave } = props;
    if (!novel) return null;
    const h = getH();
    const [isTranslatingTitle, setIsTranslatingTitle] = (typeof React !== 'undefined' && React.useState) ? React.useState(false) : [false, () => {}];

    const handleAiTranslateNovelTitle = async () => {
      const src = novel.originalSourceTitle || novel.title || value;
      if (!src || !src.trim()) return;
      setIsTranslatingTitle(true);
      try {
        const engine = window.TranslationLoopEngine;
        const fn = engine?.Controller?.translateChapterTitle || engine?.translateChapterTitle;
        let trans = '';
        if (typeof fn === 'function') {
          trans = await fn({ rawTitle: src });
        } else if (typeof engine?.safeTranslateWithRotation === 'function') {
          const res = await engine.safeTranslateWithRotation(src, {
            instructions: 'Translate this web novel title accurately into English. Maintain formal title casing. Output ONLY the translated title, without quotes or notes.'
          });
          trans = (res && typeof res === 'object') ? (res.text || '') : (typeof res === 'string' ? res : '');
        }
        if (trans && trans.trim()) {
          setValue(trans.trim());
          if (typeof window !== 'undefined' && window.toast) {
            window.toast('Novel title translated!', 'success');
          }
        }
      } catch (err) {
        if (typeof window !== 'undefined' && window.toast) {
          window.toast(`Title translation failed: ${err.message}`, 'error');
        }
      } finally {
        setIsTranslatingTitle(false);
      }
    };

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 440 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Edit', 20, 'text-indigo-400'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Rename Novel'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Custom title for EPUB export, library, and future updates')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd', style: { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 } },
          novel.originalSourceTitle && novel.originalSourceTitle !== (value || '').trim() && h('div', {
            style: {
              fontSize: 11.5,
              color: 'var(--slate)',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--hairline)'
            }
          },
            h('span', { style: { fontWeight: 600, color: 'var(--paper-dim)' } }, 'Original Source Title: '),
            h('span', { style: { fontStyle: 'italic' } }, novel.originalSourceTitle)
          ),
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--paper)', marginBottom: 6 } }, 'Novel Title:'),
            h('input', {
              type: 'text',
              className: 'url-input',
              style: { width: '100%', boxSizing: 'border-box', fontSize: 13 },
              value: value || '',
              autoFocus: true,
              placeholder: 'Enter novel title...',
              onChange: e => setValue(e.target.value),
              onKeyDown: e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSave(novel, value);
                  onClose();
                }
              }
            })
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              disabled: isTranslatingTitle,
              style: { fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent, #6366f1)' },
              onClick: handleAiTranslateNovelTitle
            }, ic('Sparkles', 12), isTranslatingTitle ? 'Translating…' : 'Translate Title with AI'),
            novel.originalSourceTitle && novel.originalSourceTitle !== (value || '').trim() && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { fontSize: 11, padding: '2px 8px' },
              onClick: () => setValue(novel.originalSourceTitle)
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('RotateCcw', 12), 'Reset to Original'))
          )
        ),
        h('div', { className: 'modal-ft', style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            onClick: onClose
          }, 'Cancel'),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700, padding: '7px 16px' },
            onClick: () => {
              onSave(novel, value);
              onClose();
            }
          }, 'Save Title')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9b. NOVEL ASSIGN WEBSITE MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function NovelAssignWebsiteModal(props) {
    if (!props || !props.novel) return null;
    if (typeof window !== 'undefined' && typeof window.NovelSourceManagerModal === 'function') {
      return getH()(window.NovelSourceManagerModal, props);
    }
    const { novel, onClose, value, setValue, onSave } = props;
    if (!novel) return null;
    const h = getH();
    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 480 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Assign Website'),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd', style: { padding: '16px' } },
          h('input', { type: 'text', className: 'url-input', style: { width: '100%' }, value: value || '', onChange: e => setValue(e.target.value) })
        ),
        h('div', { className: 'modal-ft' },
          h('button', { type: 'button', className: 'mini-btn ghost', onClick: onClose }, 'Cancel'),
          h('button', { type: 'button', className: 'mini-btn primary', onClick: () => { onSave?.(novel, value); onClose(); } }, 'Save Website')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. COST & TIME ESTIMATOR MODAL
  // ─────────────────────────────────────────────────────────────────────────
  function CostEstimatorModal(props) {
    const { isOpen, costEstimatorData, onClose, onProceed } = props;
    if (!isOpen || !costEstimatorData) return null;
    const h = getH();

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 640, width: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Coins', 20, 'text-amber-400'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Translation Cost & Time Estimator'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Pre-translation token economics and multi-stream time projections (§7.2 / §3.6)')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd', style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px' } },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
            h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Chapters'),
              h('div', { style: { fontSize: 16, fontWeight: 700, color: 'var(--paper)', marginTop: 2 } }, costEstimatorData.chapterCount)
            ),
            h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Source Chars'),
              h('div', { style: { fontSize: 15, fontWeight: 700, color: '#38bdf8', marginTop: 2 } }, Number(costEstimatorData.totalChars || 0).toLocaleString())
            ),
            h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Input Tokens'),
              h('div', { style: { fontSize: 15, fontWeight: 700, color: '#a78bfa', marginTop: 2 } }, `~${Number(costEstimatorData.totalPromptTokens || 0).toLocaleString()}`)
            ),
            h('div', { style: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--hairline)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Output Tokens'),
              h('div', { style: { fontSize: 15, fontWeight: 700, color: '#34d399', marginTop: 2 } }, `~${Number(costEstimatorData.totalOutputTokens || 0).toLocaleString()}`)
            )
          ),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'API Cost Projections by AI Model'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              (costEstimatorData.models || []).map(m => h('div', {
                key: m.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: m.recommended ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: m.recommended ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--hairline)'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { fontWeight: 700, fontSize: 13, color: 'var(--paper)' } }, m.name),
                  m.tag && h('span', { className: 'badge', style: { fontSize: 9, padding: '1px 6px', background: m.recommended ? 'rgba(99, 102, 241, 0.25)' : undefined, color: m.recommended ? 'var(--iris)' : undefined } }, m.tag)
                ),
                h('div', { style: { textAlign: 'right' } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: m.recommended ? '#34d399' : 'var(--paper)' } }, m.totalCost),
                  h('div', { style: { fontSize: 10, color: 'var(--slate)', fontFamily: 'monospace' } }, `$${m.inRate} / $${m.outRate} per 1M`)
                )
              ))
            )
          ),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Estimated Translation Duration by Concurrency'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
              (costEstimatorData.timeTiers || []).map(t => h('div', {
                key: t.streams,
                style: {
                  background: t.recommended ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: t.recommended ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--hairline)',
                  borderRadius: 6,
                  padding: '8px 6px',
                  textAlign: 'center'
                }
              },
                h('div', { style: { fontSize: 11, color: t.recommended ? '#34d399' : 'var(--slate)', fontWeight: 600 } }, `${t.streams} ${t.streams === 1 ? 'Stream' : 'Streams'}`),
                h('div', { style: { fontSize: 14, fontWeight: 800, color: 'var(--paper)', marginTop: 2 } }, t.duration),
                t.recommended && h('div', { style: { fontSize: 9, color: '#34d399', fontWeight: 700, marginTop: 2 } }, 'RECOMMENDED')
              ))
            )
          )
        ),
        h('div', { className: 'modal-ft', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            onClick: onClose
          }, 'Close'),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '8px 16px' },
            onClick: onProceed
          }, '▶ Proceed to Translation')
        )
      )
    );
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 11. LIBRARY NOVEL ACTION SHEET (3-DOT MENU)
  // ─────────────────────────────────────────────────────────────────────────
  function LibraryNovelActionSheet(props) {
    const {
      novel,
      onClose,
      getNovelFolderOptions,
      setRenameModalNovel,
      setNewNovelTitleInput,
      setAssignWebsiteModalNovel,
      setNewNovelWebsiteUrlInput,
      getCustomTitle,
      loadFullNovel,
      setActiveTab,
      setStudioSubTab,
      handleCheckNovelUpdate,
      handleOpenContinuationForNovel,
      handleOpenAutoGlossary,
      toggleNovelSavedSpace,
      handleSetNovelFolder,
      handleOpenNovelHealthModal,
      handleOpenDiffModal,
      handleEnrichNovelMetadata,
      handleUpgradeNovelIllustrations,
      handleSplitNovelIntoArcs,
      openSiteRecipeEditor,
      confirmAction,
      deleteNovelFromHistory,
      handleTranslateSingleChapter,
      setWebImportHistory
    } = props;
    if (!novel) return null;
    const h = getH();
    const toast = getToast();

    const mountTimeRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(Date.now()) : { current: Date.now() };
    const hasIntentionalTouchRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(false) : { current: false };

    if (typeof React !== 'undefined' && React.useEffect) {
      React.useEffect(() => {
        mountTimeRef.current = Date.now();
        hasIntentionalTouchRef.current = false;
      }, [novel]);
    }

    const handleActionClick = (actionFn, e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const elapsed = Date.now() - mountTimeRef.current;
      // Guard against ghost clicks from long-press release:
      // 1. Must be at least 450ms since modal opened
      // 2. If touch interaction, must have had an intentional touch-down on the sheet itself
      if (elapsed < 450) return;
      if (!hasIntentionalTouchRef.current && elapsed < 750) return;

      if (onClose) onClose();
      actionFn();
    };

    const handleOverlayClick = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const elapsed = Date.now() - mountTimeRef.current;
      if (elapsed < 450) return;
      if (onClose) onClose();
    };

    const item = novel;
    const fOpts = typeof getNovelFolderOptions === 'function' ? getNovelFolderOptions(item) : {};
    const dispPath = item.folderPath || fOpts.folderPath || '';
    const hasFolder = !!(dispPath || item.folderTreeUri || fOpts.treeUri);

    const menuRow = (icon, title, desc, onClick, isDanger = false, badgeText = null) => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        background: 'rgba(255, 255, 255, 0.03)',
        border: isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--hairline)',
        marginBottom: 8,
        transition: 'background 0.15s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      },
      onTouchStart: () => { hasIntentionalTouchRef.current = true; },
      onPointerDown: () => { hasIntentionalTouchRef.current = true; },
      onMouseDown: () => { hasIntentionalTouchRef.current = true; },
      onClick: (e) => handleActionClick(onClick, e)
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
        h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, flexShrink: 0, color: isDanger ? '#ef4444' : 'var(--iris)' } }, typeof icon === 'string' ? (ic(icon, 18) || icon) : icon),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div', { style: { fontWeight: 600, fontSize: 13.5, color: isDanger ? '#ef4444' : 'var(--paper)' } }, title),
          desc && h('div', { style: { fontSize: 11, color: isDanger ? 'rgba(239, 68, 68, 0.8)' : 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, desc)
        )
      ),
      badgeText && h('span', { className: 'badge', style: { marginLeft: 8, fontSize: 11, padding: '3px 8px', flexShrink: 0 } }, badgeText)
    );

    return h('div', { className: 'modal-overlay', onClick: handleOverlayClick },
      h('div', {
        className: 'modal-box',
        style: { maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
        onTouchStart: () => { hasIntentionalTouchRef.current = true; },
        onPointerDown: () => { hasIntentionalTouchRef.current = true; },
        onClick: e => e.stopPropagation()
      },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 } },
            item.cover
              ? h('img', { src: item.cover, style: { width: 32, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0 } })
              : h('span', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 42, background: 'rgba(255,255,255,0.05)', borderRadius: 4, flexShrink: 0, color: 'var(--iris)' } }, ic('BookOpen', 18)),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title || 'Novel Options'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, `${item.chapterCount || 0} chapters · ${item.author || 'Author'}`)
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: handleOverlayClick, 'aria-label': 'Close', title: 'Close' }, ic('X', 16))
        ),
        h('div', { className: 'modal-bd custom-scrollbar', style: { overflowY: 'auto', padding: '14px 16px' } },
          (() => {
            const badges = props.novelUpdateBadges;
            const badge = badges ? (badges[item.id] || badges[item.sourceUrl] || badges[item.title]) : null;
            const newCount = badge ? (badge.newCount ?? badge.count ?? 0) : 0;
            if (newCount <= 0) return null;
            return [
              menuRow('Download', `Download New Chapters (${newCount})`, 'Fetch and append newly released chapters to local library', () => {
                if (props.handleDownloadNewChapters) props.handleDownloadNewChapters(item);
              }, false, `+${newCount}`),
              menuRow('Languages', `Translate New Chapters & Make EPUB (${newCount})`, 'Translate new chapters directly and compile complete EPUB', () => {
                if (props.handleUpdateTranslateAndMakeEpub) props.handleUpdateTranslateAndMakeEpub(item);
              }, false, 'Translate')
            ];
          })(),
          menuRow('Edit', 'Rename Novel', 'Set a custom title for EPUB export, library, and future updates', () => {
            if (setRenameModalNovel) setRenameModalNovel(item);
            if (setNewNovelTitleInput) setNewNovelTitleInput(item.customTitle || (getCustomTitle ? getCustomTitle(item) : '') || item.title || '');
          }),
          menuRow('Sparkles', 'Heal All Chapters (Save Tokens)', 'Scan entire book for untranslated lines or errors and heal them without retranslating', async () => {
            try {
              const full = loadFullNovel ? await loadFullNovel(item) : null;
              if (!full) { toast('Novel data not found in local store.', 'error'); return; }
              const chs = (full.translatedChapters && full.translatedChapters.length > 0) ? full.translatedChapters : (full.chapters || []);
              if (!chs || chs.length === 0) { toast('No chapters found in this book.', 'warning'); return; }

              const hasCjkOrError = (text) => typeof text === 'string' && (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text) || /\[Error:.*?\]/i.test(text));
              const targets = [];
              chs.forEach((ch, idx) => {
                const body = ch.content || ch.text || '';
                if (hasCjkOrError(body) || (ch.originalTitle && hasCjkOrError(ch.title))) {
                  targets.push(idx);
                }
              });

              if (targets.length === 0) {
                toast('Every chapter in this book is already 100% translated and healthy!', 'success');
                return;
              }

              toast(`Found ${targets.length} chapter(s) with untranslated lines. Starting token-saving healing…`, 'info');

              const singleChapterFn = handleTranslateSingleChapter || props.handleTranslateSingleChapter || (typeof window !== 'undefined' && window.TranslationLoopEngine?.Controller?.executeTranslateSingleChapter);
              if (!singleChapterFn) {
                toast('Translation loop engine not available.', 'error');
                return;
              }

              let healedCount = 0;
              for (let i = 0; i < targets.length; i++) {
                const chIdx = targets[i];
                const chap = chs[chIdx];
                toast(`Healing chapter ${chIdx + 1} (${i + 1}/${targets.length})…`, 'info');
                try {
                  const res = await singleChapterFn(chIdx, chap, null, 'heal');
                  if (res && res.content) {
                    chs[chIdx] = { ...chs[chIdx], content: res.content, text: res.content, title: res.title || chs[chIdx].title, isTranslated: true };
                    healedCount++;
                  }
                } catch (err) {
                  console.warn(`[ActionSheet] Failed to heal chapter ${chIdx + 1}:`, err);
                }
              }

              full.translatedChapters = chs;
              full.epubBlob = undefined;
              full.updatedAt = Date.now();
              if (typeof window !== 'undefined' && window.GeminiNovelDB?.updateNovel) {
                await window.GeminiNovelDB.updateNovel(full);
              }
              toast(`Successfully healed ${healedCount} chapter(s)! Zero wasted tokens.`, 'success');
            } catch (err) {
              toast('Batch chapter healing stopped: ' + (err.message || err), 'warning');
            }
          }),
          menuRow('Image', 'Generate Smart Cover', 'Generate a clean typography cover image and assign it to this book', async () => {
            try {
              const full = loadFullNovel ? await loadFullNovel(item) : null;
              const bookTitle = (full && full.title) || item.title || 'Web Novel';
              const bookAuthor = (full && full.author) || item.author || 'Author';
              const genCoverFn = (typeof window !== 'undefined' && window.EpubEngine?.generateCoverDataUrl) || (typeof window !== 'undefined' && window.generateCoverDataUrl);
              if (!genCoverFn) {
                toast('Cover generator engine not ready.', 'warning');
                return;
              }
              const newCover = await genCoverFn(bookTitle, bookAuthor);
              if (!newCover) {
                toast('Could not generate cover image.', 'error');
                return;
              }
              item.cover = newCover;
              item.epubBlob = undefined;
              if (full) {
                full.cover = newCover;
                full.epubBlob = undefined;
              }
              if (typeof window !== 'undefined' && window.GeminiNovelDB) {
                try {
                  const dbRec = full || (item.id ? await window.GeminiNovelDB.getNovel(item.id) : null);
                  if (dbRec) {
                    dbRec.cover = newCover;
                    dbRec.epubBlob = undefined;
                    await (window.GeminiNovelDB.updateNovel ? window.GeminiNovelDB.updateNovel(dbRec) : window.GeminiNovelDB.saveNovel(dbRec));
                  } else if (item.id) {
                    await window.GeminiNovelDB.saveNovel({ ...item, cover: newCover });
                  }
                } catch (dbErr) {
                  console.warn('[SmartCover] IndexedDB save warning:', dbErr);
                }
              }
              const setHist = setWebImportHistory || props.setWebImportHistory;
              if (typeof setHist === 'function') {
                setHist(prev => (prev || []).map(b => (b.id === item.id || b.title === item.title) ? { ...b, cover: newCover } : b));
              }
              try {
                const rawMeta = localStorage.getItem('gemini_web_import_history_meta');
                if (rawMeta) {
                  const mList = JSON.parse(rawMeta);
                  if (Array.isArray(mList)) {
                    const uList = mList.map(b => (b.id === item.id || (b.title && item.title && b.title.trim().toLowerCase() === item.title.trim().toLowerCase())) ? { ...b, cover: newCover } : b);
                    localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(uList));
                  }
                }
              } catch (_) {}
              if (props.setCurrentDocCover && (item.id === props.activeNovelRecord?.id || item.title === props.currentDocTitle)) {
                props.setCurrentDocCover(newCover);
              }
              if (typeof window !== 'undefined' && (item.id === window.activeNovelRecord?.id || item.title === window.currentDocTitle)) {
                window.currentDocCover = newCover;
              }
              if (typeof localStorage !== 'undefined' && (item.id === props.activeNovelRecord?.id || item.title === props.currentDocTitle)) {
                localStorage.setItem('gemini_current_doc_cover', newCover);
              }
              toast(`Generated smart typography cover for "${bookTitle}"!`, 'success');
            } catch (err) {
              toast('Failed to generate cover: ' + (err.message || err), 'error');
            }
          }),
          menuRow('Download', 'Download / Export EPUB', 'Export novel as clean, packaged EPUB ebook with latest translations', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (!full) { toast('Novel data not found in local store.', 'error'); return; }
            const chs = (full.translatedChapters && full.translatedChapters.length > 0) ? full.translatedChapters : (full.chapters || []);
            const exportOpts = {
              chaptersToExport: chs,
              rawBaseTitle: full.title || item.title,
              author: full.author || item.author,
              resolvedCover: full.cover || item.cover,
              fileName: full.title || item.title
            };
            if (typeof props.handleDownloadEPUB === 'function') {
              props.handleDownloadEPUB(chs, exportOpts);
            } else if (typeof props.onExportEpub === 'function') {
              props.onExportEpub(chs);
            } else if (typeof window !== 'undefined' && window.ExportEngine?.Controller?.export) {
              window.ExportEngine.Controller.export('epub', exportOpts, { toast });
            }
          }),
          menuRow('BookOpen', 'Edit in Ebook Studio', 'Edit chapters, prose, covers, and table of contents', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (!full) { toast('Novel data not found in local store.', 'error'); return; }
            if (setActiveTab) setActiveTab('studio');
            if (setStudioSubTab) setStudioSubTab('edit');
            try {
              localStorage.setItem('activeTab', 'studio');
              localStorage.setItem('studioSubTab', 'edit');
            } catch(e) {}
            if (window.loadEpubForEditing) window.loadEpubForEditing(full);
            toast(`Opened "${item.title || 'Novel'}" in Ebook Studio!`, 'success');
          }),
          menuRow('RefreshCw', 'Check Online Updates', 'Check online web source for newly published chapters', () => {
            if (handleCheckNovelUpdate) handleCheckNovelUpdate(item);
          }),
          menuRow('Download', 'Continue Fetching Online', 'Fetch new chapters from web and append to this EPUB with same Book ID', () => {
            if (handleOpenContinuationForNovel) handleOpenContinuationForNovel(item);
          }),
          menuRow('Globe', (item.sourceUrl || item.url) ? 'Change Website Source' : 'Assign Website Source', (item.sourceUrl || item.url) ? `Current: ${(item.sourceUrl || item.url).replace(/^https?:\/\//i, '').slice(0, 32)}…` : 'Bind novel to an online website (Royal Road, etc.) to fetch ongoing chapters', () => {
            if (setAssignWebsiteModalNovel) setAssignWebsiteModalNovel(item);
            else if (props.setAssignWebsiteModalNovel) props.setAssignWebsiteModalNovel(item);
            if (setNewNovelWebsiteUrlInput) setNewNovelWebsiteUrlInput(item.sourceUrl || item.url || '');
            else if (props.setNewNovelWebsiteUrlInput) props.setNewNovelWebsiteUrlInput(item.sourceUrl || item.url || '');
          }),
          (item.sourceUrl || item.url) && /^https?:\/\//i.test(item.sourceUrl || item.url) && menuRow('Settings', "Site Settings for Book's Website", 'Customize how chapters are extracted from this website', () => {
            const u = item.sourceUrl || item.url;
            if (typeof openSiteRecipeEditor === 'function') {
              openSiteRecipeEditor({ url: u });
            } else if (typeof props.openSiteRecipeEditor === 'function') {
              props.openSiteRecipeEditor({ url: u });
            } else if (typeof window !== 'undefined' && window.SiteRecipeEngine?.Controller?.open) {
              window.SiteRecipeEngine.Controller.open({ url: u });
            }
          }),
          menuRow('Sparkles', 'Auto-Build Glossary', 'Extract character cast and lore into a locked Smart Glossary', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (!full) { toast('Novel data not found in local store.', 'error'); return; }
            if (handleOpenAutoGlossary) handleOpenAutoGlossary(full);
          }),
          menuRow('Star', item.inSavedSpace ? 'Remove from Saved Space' : 'Save to Space', item.inSavedSpace ? 'Remove priority star bookmark' : 'Pin to personal Saved Space shelf', () => {
            if (toggleNovelSavedSpace) toggleNovelSavedSpace(item.id, item);
          }, false, item.inSavedSpace ? 'In Space' : null),
          menuRow('Folder', 'Designated Device Folder', dispPath ? `Current: ${dispPath.length > 24 ? dispPath.slice(0, 22) + '…' : dispPath}` : 'Set auto-export folder for Moon+ Reader continuity', () => {
            if (handleSetNovelFolder) handleSetNovelFolder(item);
          }, false, hasFolder ? 'Configured' : null),
          menuRow('Activity', 'Novel Health & QA Audit', 'Audit for CJK leaks, empty chapters, and AI loops', () => {
            if (handleOpenNovelHealthModal) handleOpenNovelHealthModal(item);
          }),
          menuRow('GitCompare', 'Translation Diffs & History', 'Inspect chapter changes and rollback revisions', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (full && handleOpenDiffModal) handleOpenDiffModal(0, full);
            else toast('Novel data not found.', 'error');
          }),
          menuRow('Tag', 'Enrich Metadata (AniList)', 'Fetch high-res cover, synopsis, and genres', () => {
            if (handleEnrichNovelMetadata) handleEnrichNovelMetadata(item);
          }),
          menuRow('Image', 'Upgrade Illustrations', 'Replace blurry placeholders with crisp, full-resolution sharp artwork', () => {
            if (handleUpgradeNovelIllustrations) handleUpgradeNovelIllustrations(item);
          }),
          menuRow('Scissors', 'Split into Story Arcs', 'Divide large multi-volume novel into separate books', () => {
            if (handleSplitNovelIntoArcs) handleSplitNovelIntoArcs(item);
          }),
          menuRow('Trash2', 'Remove from Library', 'Delete novel and cached chapters from local library', () => {
            if (confirmAction) {
              confirmAction(`Remove "${item.title}" from the library?`, async () => {
                if (deleteNovelFromHistory) await deleteNovelFromHistory(item.id);
              });
            }
          }, true)
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 12. ONGOING EPUB CONTINUATION & MOON+ READER CONTINUITY FULL-SCREEN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const RealOngoingEpubContinuationModal = (typeof window !== 'undefined' && window.OngoingEpubContinuationModal) ? window.OngoingEpubContinuationModal : null;
  function OngoingEpubContinuationModal(props) {
    const Component = RealOngoingEpubContinuationModal || (typeof window !== 'undefined' && window.OngoingEpubContinuationModal && window.OngoingEpubContinuationModal !== OngoingEpubContinuationModal ? window.OngoingEpubContinuationModal : null);
    return Component ? Component(props) : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 13. SWIFTAUDIO PLAYER (MINI-PLAYER, FULL PLAYER, BACKGROUND PROGRESS, DOWNLOAD MODAL)
  // ─────────────────────────────────────────────────────────────────────────
  const RealSwiftAudioPlayer = (typeof window !== 'undefined' && window.SwiftAudioPlayer) ? window.SwiftAudioPlayer : null;
  function SwiftAudioPlayer(props) {
    const Component = RealSwiftAudioPlayer || (typeof window !== 'undefined' && window.SwiftAudioPlayer && window.SwiftAudioPlayer !== SwiftAudioPlayer ? window.SwiftAudioPlayer : null);
    return Component ? Component(props) : null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 14. SOURCE EXTENSIONS & SOURCES HUB (FULL-SCREEN MIHON-STYLE)
  // ─────────────────────────────────────────────────────────────────────────
  // ── SOURCE EXTENSIONS MODAL (DELEGATED) ──
  const RealSourceExtensionsModal = (typeof window !== "undefined" && window.SourceExtensionsModal) ? window.SourceExtensionsModal : null;
  function SourceExtensionsModal(props) {
    const Component = RealSourceExtensionsModal || (typeof window !== "undefined" && window.SourceExtensionsModal && window.SourceExtensionsModal !== SourceExtensionsModal ? window.SourceExtensionsModal : null);
    if (!Component) return null;
    const h = getH();
    return h ? h(Component, props) : null;
  }

  function ExportToolsSheet(props) {
    const {
      sheetOpen,
      setSheetOpen,
      handleExportRow,
      isTranslating,
      handleAutoDetectSplit,
      setBoxPreset,
      setGlossaryEditorOpen,
      toast = getToast()
    } = props || {};

    if (!sheetOpen) return null;
    const h = getH();

    return h('div', { className: 'sheet-backdrop', onClick: () => setSheetOpen(false) },
      h('div', { className: 'sheet', onClick: (e) => e.stopPropagation() },
        h('div', { className: 'sheet-handle' }),
        h('div', { className: 'sheet-lbl' }, 'Export'),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('epub') }, h('span', { className: 'ic' }, ic('Download', 16)), 'EPUB', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('reader') }, h('span', { className: 'ic' }, ic('BookOpen', 16)), 'Open in Reader', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('pdf') }, h('span', { className: 'ic' }, ic('FileDown', 16)), 'PDF', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('docx') }, h('span', { className: 'ic' }, ic('FileText', 16)), 'DOCX', h('span', { className: 'chev' }, '›')),
        h('div', { className: 'sheet-lbl' }, 'Tools'),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => {
          if (isTranslating) { toast('Cannot split chapters while translation is in progress.', 'warning'); return; }
          setSheetOpen(false);
          handleAutoDetectSplit();
        } }, h('span', { className: 'ic' }, ic('Scissors', 16)), 'Split Chapters', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setBoxPreset('input', 'auto'); setBoxPreset('output', 'auto'); setSheetOpen(false); } }, h('span', { className: 'ic' }, ic('Maximize2', 16)), 'Fit Text Height', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setBoxPreset('input', 'S'); setBoxPreset('output', 'S'); setSheetOpen(false); } }, h('span', { className: 'ic' }, ic('RotateCcw', 16)), 'Reset Box Heights', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setSheetOpen(false); setGlossaryEditorOpen(true); } }, h('span', { className: 'ic' }, ic('BookOpen', 16)), 'Glossary Editor', h('span', { className: 'chev' }, '›'))
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 16. CONFIRM DIALOG
  // ─────────────────────────────────────────────────────────────────────────
  function ConfirmDialog(props) {
    const {
      showModal,
      setShowModal,
      modalMessage,
      modalCallback,
      setModalCallback
    } = props || {};

    if (!showModal) return null;
    const h = getH();

    let displayMessage = '';
    if (modalMessage && typeof modalMessage === 'object') {
      displayMessage = modalMessage.message || modalMessage.title || 'Are you sure?';
    } else {
      displayMessage = String(modalMessage || '');
    }

    return h('div', { className: 'confirm-backdrop', onClick: () => { setShowModal(false); if (setModalCallback) setModalCallback(null); } },
      h('div', { className: 'confirm-box', onClick: (e) => e.stopPropagation() },
        h('p', null, displayMessage),
        h('div', { className: 'confirm-actions' },
          h('button', { type: 'button', className: 'mini-btn', onClick: () => { if (modalCallback) modalCallback(); } }, 'Confirm'),
          h('button', { type: 'button', className: 'mini-btn ghost', onClick: () => { setShowModal(false); if (setModalCallback) setModalCallback(null); } }, 'Cancel')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 17. DOWNLOAD SUCCESS MODAL
  // ─────────────────────────────────────────────────────────────────────────
  // ── DOWNLOAD SUCCESS MODAL (DELEGATED) ──
  const RealDownloadSuccessModal = (typeof window !== "undefined" && window.DownloadSuccessModal) ? window.DownloadSuccessModal : null;
  function DownloadSuccessModal(props) {
    const Component = RealDownloadSuccessModal || (typeof window !== "undefined" && window.DownloadSuccessModal && window.DownloadSuccessModal !== DownloadSuccessModal ? window.DownloadSuccessModal : null);
    if (!Component) return null;
    const h = getH();
    return h ? h(Component, props) : null;
  }
  const RealEpubPackagingProgressDock = (typeof window !== "undefined" && window.EpubPackagingProgressDock) ? window.EpubPackagingProgressDock : null;
  function EpubPackagingProgressDock(props) {
    const Component = RealEpubPackagingProgressDock || (typeof window !== "undefined" && window.EpubPackagingProgressDock && window.EpubPackagingProgressDock !== EpubPackagingProgressDock ? window.EpubPackagingProgressDock : null);
    if (!Component) return null;
    const h = getH();
    return h ? h(Component, props) : null;
  }
  const RealToastItem = (typeof window !== "undefined" && window.ToastItem) ? window.ToastItem : null;
  function ToastItem(props) {
    const Component = RealToastItem || (typeof window !== "undefined" && window.ToastItem && window.ToastItem !== ToastItem ? window.ToastItem : null);
    if (!Component) return null;
    const h = getH();
    return h ? h(Component, props) : null;
  }

  function AppModalsContainer(props) {
    if (!props) return null;
    const h = getH();
    const toast = props.toast || getToast();
    const Fragment = (typeof React !== 'undefined' && React.Fragment)
      ? React.Fragment
      : ((typeof window !== 'undefined' && window.React && window.React.Fragment)
          ? window.React.Fragment
          : 'div');
    const MoonReaderModalComponent = props.MoonReaderModal || (typeof window !== 'undefined' ? window.MoonReaderModal : null);

    return h(Fragment, null,
      // 1. Export Tools Sheet
      h(ExportToolsSheet, {
        sheetOpen: props.sheetOpen,
        setSheetOpen: props.setSheetOpen,
        handleExportRow: props.handleExportRow,
        isTranslating: props.isTranslating,
        handleAutoDetectSplit: props.handleAutoDetectSplit,
        setBoxPreset: props.setBoxPreset,
        setGlossaryEditorOpen: props.setGlossaryEditorOpen,
        toast
      }),

      // 2. Diagnostics & Telemetry Logs Modal
      h(DiagnosticsLogsModal, {
        isOpen: (typeof props.logsModalOpen !== 'undefined') ? props.logsModalOpen : props.isOpen,
        onClose: props.onCloseLogsModal || (() => props.setLogsModalOpen?.(false)),
        liveLogs: props.liveLogs,
        copyLogsWithReport: props.copyLogsWithReport
      }),

      // 3. Bulk API Key Import Modal
      h(BulkApiKeyImportModal, {
        isOpen: (typeof props.bulkKeyModalOpen !== 'undefined') ? props.bulkKeyModalOpen : props.isOpen,
        onClose: props.onCloseBulkKeyModal || (() => props.setBulkKeyModalOpen?.(false)),
        provider: props.provider,
        bulkKeyText: props.bulkKeyText,
        setBulkKeyText: props.setBulkKeyText,
        onImport: props.handleBulkImportKeys || props.onImport
      }),

      // 4. Glossary Full-Screen Editor Modal
      h(GlossaryEditorModal, {
        isOpen: (typeof props.glossaryEditorOpen !== 'undefined') ? props.glossaryEditorOpen : props.isOpen,
        onClose: props.onCloseGlossaryEditor || (() => props.setGlossaryEditorOpen?.(false)),
        terminology: props.terminology,
        setTerminology: props.setTerminology,
        glossaryTermCount: props.glossaryTermCount,
        activeGlossaryId: props.activeGlossaryId,
        handleSaveGlossary: props.handleSaveGlossary,
        applyGlossaryPreset: props.applyGlossaryPreset,
        handleAiOptimizeGlossary: props.handleAiOptimizeGlossary,
        isOptimizingGlossary: props.isOptimizingGlossary,
        importGlossaryFile: props.importGlossaryFile,
        exportGlossaryTxt: props.exportGlossaryTxt,
        smartGlossary: props.smartGlossary,
        setSmartGlossary: props.setSmartGlossary
      }),

      // 5. Toasts (Swipe-to-Dismiss individual toasts & Swipe to Clear All)
      // When checking for updates, toasts are docked to the bottom so top update buttons remain completely unobstructed.
      (() => {
        const toasts = props.toasts || [];
        if (toasts.length === 0) return null;

        const isCheckingAnyUpdate = Boolean(props.isBatchChecking || (props.checkingUpdates && Object.values(props.checkingUpdates).some(Boolean)));
        const isBottomToast = (t) => t.isBottom || t.position === 'bottom' || (isCheckingAnyUpdate && /updat|version|chapter/i.test(t.msg));
        const topToasts = toasts.filter(t => !isBottomToast(t));
        const bottomToasts = toasts.filter(t => isBottomToast(t));

        const renderWrap = (list, isBottom) => {
          if (!list || list.length === 0) return null;
          return h('div', {
            key: isBottom ? 'toast-wrap-bottom' : 'toast-wrap-top',
            className: `toast-wrap ${isBottom ? 'toast-wrap-bottom' : 'toast-wrap-top'}`
          },
            list.length > 1 && h('button', {
              type: 'button',
              className: 'toast-dismiss-all-pill',
              onClick: (e) => {
                e.stopPropagation();
                if (typeof props.setToasts === 'function') {
                  const idsToRemove = new Set(list.map(t => t.id));
                  props.setToasts(p => p.filter(item => !idsToRemove.has(item.id)));
                }
              }
            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('X', 12), `Swipe or tap to clear all (${list.length})`)),
            list.map(t => h(ToastItem, {
              key: t.id,
              toast: t,
              onDismiss: (id) => {
                if (typeof props.setToasts === 'function') {
                  props.setToasts(p => p.filter(item => item.id !== id));
                }
              },
              onDismissAll: () => {
                if (typeof props.setToasts === 'function') {
                  const idsToRemove = new Set(list.map(item => item.id));
                  props.setToasts(p => p.filter(item => !idsToRemove.has(item.id)));
                }
              }
            }))
          );
        };

        return h(Fragment, null,
          renderWrap(topToasts, false),
          renderWrap(bottomToasts, true)
        );
      })(),


      // 7. EPUB Packaging Progress Dock
      h(EpubPackagingProgressDock, {
        epubPackagingModal: props.epubPackagingModal,
        setEpubPackagingModal: props.setEpubPackagingModal
      }),

      // 8. Download Success Modal
      h(DownloadSuccessModal, {
        downloadSuccessModal: props.downloadSuccessModal,
        setDownloadSuccessModal: props.setDownloadSuccessModal
      }),

      // 9. Moon+ Reader Modal
      MoonReaderModalComponent && h(MoonReaderModalComponent, {
        open: props.readerOpen,
        onClose: props.onCloseReader || (() => props.setReaderOpen?.(false)),
        text: props.assembledText,
        chapters: (Array.isArray(props.readerChapters) && props.readerChapters.length > 0)
          ? props.readerChapters
          : (typeof props.getExportChapters === 'function' ? props.getExportChapters() : (props.exportChapters || [])),
        onChaptersChange: props.setReaderChapters,
        currentIdx: props.readerChapterIdx,
        onChapterChange: props.setReaderChapterIdx,
        theme: props.readerTheme,
        setTheme: props.setReaderTheme,
        font: props.readerFont,
        setFont: props.setReaderFont,
        fontSize: props.readerFontSize,
        setFontSize: props.setReaderFontSize,
        tgtLang: props.tgtLang,
        novelId: props.readerNovelId,
        novelTitle: props.readerNovelTitle,
        onVerifyConsistency: props.handleRunConsistencyCheck,
        onOpenHealthAudit: props.handleOpenActiveQaModal,
        onOpenDiff: (idx) => {
          if (typeof props.onOpenDiff === 'function') {
            props.onOpenDiff(idx);
          } else if (typeof props.handleOpenDiffModal === 'function') {
            props.handleOpenDiffModal(idx ?? props.readerChapterIdx);
          }
        },
        onTranslateChapter: props.handleTranslateSingleChapter,
        onExportEpub: props.handleDownloadEPUB,
        activeNovelRecord: props.activeNovelRecord,
        appSettings: {
          provider: props.provider,
          geminiModel: props.geminiModel,
          deepseekModel: props.deepseekModel,
          customModel: props.customModel,
          useCustomModel: props.useCustomModel,
          tgtLang: props.tgtLang,
          concurrency: props.concurrency,
          chunkSizePreset: props.chunkSizePreset,
          enableStreaming: props.enableStreaming,
          enableThinking: props.enableThinking,
          strictModel: props.strictModel,
          terminology: props.terminology,
          customInstructions: props.customInstructions,
          savedGlossaries: props.savedGlossaries,
          activeGlossaryId: props.activeGlossaryId
        }
      }),

      // 10. Library Novel Action Sheet
      h(LibraryNovelActionSheet, {
        novel: props.activeBookMenuNovel,
        onClose: props.onCloseBookMenu || (() => props.setActiveBookMenuNovel?.(null)),
        handleDownloadEPUB: props.handleDownloadEPUB,
        getNovelFolderOptions: props.getNovelFolderOptions,
        setRenameModalNovel: props.setRenameModalNovel,
        setNewNovelTitleInput: props.setNewNovelTitleInput,
        setAssignWebsiteModalNovel: props.setAssignWebsiteModalNovel,
        setNewNovelWebsiteUrlInput: props.setNewNovelWebsiteUrlInput,
        getCustomTitle: props.getCustomTitle,
        loadFullNovel: props.loadFullNovel,
        setActiveTab: props.setActiveTab,
        setStudioSubTab: props.setStudioSubTab,
        handleCheckNovelUpdate: props.handleCheckNovelUpdate,
        novelUpdateBadges: props.novelUpdateBadges,
        handleDownloadNewChapters: props.handleDownloadNewChapters,
        handleUpdateTranslateAndMakeEpub: props.handleUpdateTranslateAndMakeEpub,
        handleOpenContinuationForNovel: props.handleOpenContinuationForNovel,
        handleOpenAutoGlossary: props.handleOpenAutoGlossary,
        toggleNovelSavedSpace: props.toggleNovelSavedSpace,
        handleSetNovelFolder: props.handleSetNovelFolder,
        handleOpenNovelHealthModal: props.handleOpenNovelHealthModal,
        handleOpenDiffModal: props.handleOpenDiffModal,
        handleEnrichNovelMetadata: props.handleEnrichNovelMetadata,
        handleUpgradeNovelIllustrations: props.handleUpgradeNovelIllustrations,
        handleSplitNovelIntoArcs: props.handleSplitNovelIntoArcs,
        openSiteRecipeEditor: props.openSiteRecipeEditor,
        confirmAction: props.confirmAction,
        deleteNovelFromHistory: props.deleteNovelFromHistory,
        handleTranslateSingleChapter: props.handleTranslateSingleChapter,
        setWebImportHistory: props.setWebImportHistory
      }),

      // 11. Ongoing EPUB Continuation Modal
      h(OngoingEpubContinuationModal, {
        modalData: props.ongoingEpubModal,
        onClose: props.onCloseOngoingEpubModal || (() => props.setOngoingEpubModal?.(null)),
        setOngoingEpubModal: props.setOngoingEpubModal,
        updateNovelFolderRecord: props.updateNovelFolderRecord,
        handleScanContinuationToc: props.handleScanContinuationToc,
        handleSearchContinuationSources: props.handleSearchContinuationSources,
        handleSelectContinuationSource: props.handleSelectContinuationSource,
        handleExecuteContinuation: props.handleExecuteContinuation
      }),

      // 12. QA Health & Translation Audit Modal
      h(QaReportModal, {
        isOpen: (typeof props.qaModalOpen !== 'undefined') ? props.qaModalOpen : props.isOpen,
        onClose: props.onCloseQaModal || (() => props.setQaModalOpen?.(false)),
        qaAuditResult: props.qaAuditResult,
        qaFilterCategory: props.qaFilterCategory,
        setQaFilterCategory: props.setQaFilterCategory,
        qaCheckGaps: props.qaCheckGaps,
        setQaCheckGaps: props.setQaCheckGaps,
        qaCheckCorrupt: props.qaCheckCorrupt,
        setQaCheckCorrupt: props.setQaCheckCorrupt,
        qaCheckCjk: props.qaCheckCjk,
        setQaCheckCjk: props.setQaCheckCjk,
        qaCheckAntiMtl: props.qaCheckAntiMtl,
        setQaCheckAntiMtl: props.setQaCheckAntiMtl,
        qaCheckLoops: props.qaCheckLoops,
        setQaCheckLoops: props.setQaCheckLoops,
        qaCheckDuplicates: props.qaCheckDuplicates,
        setQaCheckDuplicates: props.setQaCheckDuplicates,
        qaAuditNovelRef: props.qaAuditNovelRef,
        runNovelHealthAudit: props.runNovelHealthAudit,
        onInspectChapterInReader: props.onInspectChapterInReader
      }),

      // 13. Translation Diff & Revision History Modal
      h(DiffHistoryModal, {
        isOpen: (typeof props.diffModalOpen !== 'undefined') ? props.diffModalOpen : props.isOpen,
        onClose: props.onCloseDiffModal || (() => props.setDiffModalOpen?.(false)),
        activeDiffData: props.activeDiffData,
        selectedDiffSnapId: props.selectedDiffSnapId,
        handleSelectDiffSnapshot: props.handleSelectDiffSnapshot,
        diffSnapshotsList: props.diffSnapshotsList,
        handleManualSnapshot: props.handleManualSnapshot,
        handleRollbackDiffSnapshot: props.handleRollbackDiffSnapshot
      }),

      // 14. Auto-Glossary & Character Extractor Modal
      h(AutoGlossaryModal, {
        isOpen: (typeof props.autoGlossaryModalOpen !== 'undefined') ? props.autoGlossaryModalOpen : props.isOpen,
        onClose: props.onCloseAutoGlossaryModal || (() => {
          if (typeof props.setAutoGlossaryModalOpen === 'function') props.setAutoGlossaryModalOpen(false);
          if (typeof props.setAutoGlossaryTargetNovel === 'function') props.setAutoGlossaryTargetNovel(null);
        }),
        autoGlossaryTargetNovel: props.autoGlossaryTargetNovel,
        chapters: props.chapters,
        activeNovelRecord: props.activeNovelRecord,
        autoGlossaryChapterCount: props.autoGlossaryChapterCount,
        setAutoGlossaryChapterCount: props.setAutoGlossaryChapterCount,
        isExtractingGlossary: props.isExtractingGlossary,
        handleExtractGlossary: props.handleExtractGlossary,
        extractedTerms: props.extractedTerms,
        setExtractedTerms: props.setExtractedTerms,
        handleApplyExtractedTerms: props.handleApplyExtractedTerms
      }),

      // 15. Name Consistency Verifier Modal
      h(NameConsistencyModal, {
        isOpen: (typeof props.consistencyModalOpen !== 'undefined') ? props.consistencyModalOpen : props.isOpen,
        onClose: props.onCloseConsistencyModal || (() => props.setConsistencyModalOpen?.(false)),
        consistencyAuditResults: props.consistencyAuditResults,
        handleBatchFixDrift: props.handleBatchFixDrift,
        handleRunConsistencyCheck: props.handleRunConsistencyCheck,
        isAuditingConsistency: props.isAuditingConsistency
      }),

      // 16. Google Drive Configuration Modal
      h(GdriveConfigModal, {
        isOpen: (typeof props.gdriveConfigModalOpen !== 'undefined') ? props.gdriveConfigModalOpen : props.isOpen,
        onClose: props.onCloseGdriveConfigModal || (() => props.setGdriveConfigModalOpen?.(false)),
        gdriveClientId: props.gdriveClientId,
        setGdriveClientId: props.setGdriveClientId,
        gdriveManualToken: props.gdriveManualToken,
        setGdriveManualToken: props.setGdriveManualToken,
        setGdriveConnected: props.setGdriveConnected,
        testGoogleDriveConnection: props.testGoogleDriveConnection
      }),

      // 17. SwiftAudio Player
      h(SwiftAudioPlayer, {
        audioPlayerState: props.audioPlayerState,
        amoledMode: props.amoledMode,
        isFullPlayerOpen: props.isFullPlayerOpen,
        setIsFullPlayerOpen: props.setIsFullPlayerOpen,
        isPlayerFullscreen: props.isPlayerFullscreen,
        setIsPlayerFullscreen: props.setIsPlayerFullscreen,
        isAudiobookInLibrary: props.isAudiobookInLibrary,
        saveAudiobookToLibrary: props.saveAudiobookToLibrary,
        removeAudiobookFromLibrary: props.removeAudiobookFromLibrary,
        handleOpenAudioDownload: props.handleOpenAudioDownload,
        downloadingTrackId: props.downloadingTrackId,
        setDownloadingTrackId: props.setDownloadingTrackId,
        audioDownloadModal: props.audioDownloadModal,
        setAudioDownloadModal: props.setAudioDownloadModal,
        getNovelFolderOptions: props.getNovelFolderOptions,
        handleExecuteAudioBatchDownload: props.handleExecuteAudioBatchDownload
      }),

      // 18. Novel Rename Modal
      h(NovelRenameModal, {
        novel: props.renameModalNovel,
        onClose: props.onCloseRenameModal || (() => props.setRenameModalNovel?.(null)),
        value: props.newNovelTitleInput,
        setValue: props.setNewNovelTitleInput,
        onSave: props.onSaveNovelRename || ((novel, val) => {
          if (typeof props.handleSaveNovelRename === 'function') props.handleSaveNovelRename(novel, val);
          if (typeof props.setRenameModalNovel === 'function') props.setRenameModalNovel(null);
        })
      }),

      // 18b. Novel Assign Website Modal
      h(NovelAssignWebsiteModal, {
        novel: props.assignWebsiteModalNovel,
        onClose: props.onCloseAssignWebsiteModal || (() => props.setAssignWebsiteModalNovel?.(null)),
        value: props.newNovelWebsiteUrlInput,
        setValue: props.setNewNovelWebsiteUrlInput,
        onSave: (novel, val) => {
          if (typeof props.handleSaveNovelWebsite === 'function') props.handleSaveNovelWebsite(novel, val, false);
          if (typeof props.setAssignWebsiteModalNovel === 'function') props.setAssignWebsiteModalNovel(null);
        },
        onSaveAndContinue: (novel, val) => {
          if (typeof props.handleSaveNovelWebsite === 'function') props.handleSaveNovelWebsite(novel, val, true);
          if (typeof props.setAssignWebsiteModalNovel === 'function') props.setAssignWebsiteModalNovel(null);
        }
      }),

      // 19. Source Extensions Modal
      h(SourceExtensionsModal, {
        isOpen: (typeof props.sourcePluginsModalOpen !== 'undefined') ? props.sourcePluginsModalOpen : props.isOpen,
        onClose: props.onCloseSourcePluginsModal || (() => props.setSourcePluginsModalOpen?.(false)),
        pluginSelectedTab: props.pluginSelectedTab,
        setPluginSelectedTab: props.setPluginSelectedTab,
        pluginCatalog: props.pluginCatalog,
        isCatalogLoading: props.isCatalogLoading,
        pluginSearchQuery: props.pluginSearchQuery,
        setPluginSearchQuery: props.setPluginSearchQuery,
        pluginSelectedLangFilter: props.pluginSelectedLangFilter,
        setPluginSelectedLangFilter: props.setPluginSelectedLangFilter,
        installingPluginId: props.installingPluginId,
        handleUninstallPlugin: props.handleUninstallPlugin,
        handleInstallPlugin: props.handleInstallPlugin,
        customPluginUrl: props.customPluginUrl,
        setCustomPluginUrl: props.setCustomPluginUrl,
        handleInstallCustomPluginUrl: props.handleInstallCustomPluginUrl
      }),

      // 20. Cost & Time Estimator Modal
      h(CostEstimatorModal, {
        isOpen: (typeof props.costEstimatorModalOpen !== 'undefined') ? props.costEstimatorModalOpen : props.isOpen,
        costEstimatorData: props.costEstimatorData,
        onClose: props.onCloseCostEstimatorModal || (() => props.setCostEstimatorModalOpen?.(false)),
        onProceed: props.onProceedCostEstimator || (() => {
          if (typeof props.setCostEstimatorModalOpen === 'function') props.setCostEstimatorModalOpen(false);
          if (typeof props.handleStartTranslation === 'function') props.handleStartTranslation();
        })
      }),

      // 21. EPUB Studio Preview Modal
      h('div', { dangerouslySetInnerHTML: { __html: (typeof window !== 'undefined' ? window.modalHtml : '') || (typeof modalHtml !== 'undefined' ? modalHtml : (props.modalHtml || '')) } }),

      // 22. Site Recipe Customizer Modal
      Boolean(props.siteRecipeEditor && (typeof window !== 'undefined' && window.SiteRecipeEditor)) && h(window.SiteRecipeEditor, {
        open: true,
        url: props.siteRecipeEditor.url,
        recipeId: props.siteRecipeEditor.recipeId,
        onClose: () => {
          if (typeof props.setSiteRecipeEditor === 'function') props.setSiteRecipeEditor(null);
        },
        toast,
        confirmAction: props.confirmAction
      }),

      // 23. Confirm Dialog (Rendered last so confirmations always stack over any active modal)
      h(ConfirmDialog, {
        showModal: props.showModal,
        setShowModal: props.setShowModal,
        modalMessage: props.modalMessage,
        modalCallback: props.modalCallback,
        setModalCallback: props.setModalCallback
      })
    );
  }

  if (typeof window !== 'undefined') {
    window.AppModalsContainer = AppModalsContainer;
  }

  return {
    DiagnosticsLogsModal,
    BulkApiKeyImportModal,
    GlossaryEditorModal,
    QaReportModal,
    DiffHistoryModal,
    AutoGlossaryModal,
    NameConsistencyModal,
    GdriveConfigModal,
    NovelRenameModal,
    NovelAssignWebsiteModal,
    CostEstimatorModal,
    LibraryNovelActionSheet,
    OngoingEpubContinuationModal: RealOngoingEpubContinuationModal || OngoingEpubContinuationModal,
    SwiftAudioPlayer: RealSwiftAudioPlayer || SwiftAudioPlayer,
    SourceExtensionsModal,
    ExportToolsSheet,
    ConfirmDialog,
    DownloadSuccessModal,
    EpubPackagingProgressDock,
    AppModalsContainer
  };
}));
