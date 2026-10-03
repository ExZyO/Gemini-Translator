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
  const getToast = () => (window.toast || function() {});

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
          h('span', { style: { fontWeight: 600, fontSize: 14 } }, '📜 Live Diagnostics & API Logs'),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'chip-act', style: { background: 'var(--accent, #6366f1)', color: '#fff' }, onClick: copyLogsWithReport }, '📋 Copy All'),
            h('button', {
              type: 'button',
              className: 'chip-act',
              title: 'Send all buffered logs to PC Agent over Wi-Fi',
              onClick: () => {
                const logs = window.AppLogger ? window.AppLogger.getFormattedText() : '';
                window.sendTelemetry?.('MANUAL_DUMP', 'Manual log buffer dump requested by user', logs);
                toast('📡 Log buffer sent to PC Agent!', 'success');
              }
            }, '📡 Send to Agent'),
            h('button', { type: 'button', className: 'chip-act', onClick: () => { window.AppLogger?.clear(); toast('Logs cleared', 'info'); } }, '🗑 Clear'),
            h('button', { type: 'button', className: 'icon-btn', onClick: onClose }, '✕')
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
            wordBreak: 'break-all'
          }
        },
          (!liveLogs || liveLogs.length === 0)
            ? h('div', { style: { color: '#64748b', textAlign: 'center', marginTop: 40 } }, 'No diagnostic events recorded yet. Run a translation to see live telemetry.')
            : liveLogs.map((l, idx) => {
                const color = l.level === 'warn' ? '#f59e0b' : (l.level === 'error' ? '#ef4444' : '#38bdf8');
                const det = l.details ? ' ' + (typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details)) : '';
                return h('div', { key: idx, style: { marginBottom: 4 } },
                  h('span', { style: { color: '#64748b' } }, `[${l.time}] `),
                  h('span', { style: { color, fontWeight: 600 } }, `[${l.tag}] `),
                  h('span', null, l.message),
                  det && h('span', { style: { color: '#94a3b8' } }, det)
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
          h('span', { style: { fontWeight: 600, fontSize: 14 } }, `⚡ Bulk Paste ${(provider || '').toUpperCase()} Keys`),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose }, '✕')
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' } },
          h('p', { style: { fontSize: 12, color: 'var(--paper-dim)', margin: 0 } }, 'Paste keys below (one per line or comma-separated):'),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { fontSize: 11, padding: '3px 8px' },
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
          }, '📥 Paste from Clipboard')
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

    return h('div', { className: 'gloss-overlay' },
      h('div', { className: 'tl-head-inner' },
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
          }, activeGlossaryId ? `💾 Save "${activeGlossaryId}"` : '💾 Save Profile'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('ri') }, 'RI'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('lotm') }, 'LOTM'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('cote') }, 'COTE'),
          h('button', { type: 'button', className: 'chip-act', onClick: () => applyGlossaryPreset('xianxia') }, 'Xianxia'),
          h('button', { type: 'button', className: 'chip-act accent', disabled: isOptimizingGlossary, onClick: handleAiOptimizeGlossary }, isOptimizingGlossary ? 'Optimizing…' : 'AI Optimize ✦'),
          h('button', { type: 'button', className: 'icon-btn', onClick: onClose }, '✕')
        )
      ),
      h('div', { className: 'gloss-editor' },
        h('textarea', {
          value: terminology,
          onChange: e => { setTerminology(e.target.value); localStorage.setItem('terminology', e.target.value); },
          placeholder: 'Enter character names and lore terms (e.g. - Fang Yuan -> Fang Yuan (MC))'
        })
      ),
      h('div', { className: 'gloss-foot' },
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
          }, '💾 Save & Close'),
          h('label', { className: 'chip-act', style: { cursor: 'pointer' } },
            '⇧ Import',
            h('input', { type: 'file', accept: '.txt', style: { display: 'none' }, onChange: importGlossaryFile })
          ),
          h('button', { type: 'button', className: 'chip-act', onClick: exportGlossaryTxt }, '⇩ Export'),
          h('button', { type: 'button', className: `chip-act ${smartGlossary ? '' : 'ghost'}`, onClick: () => { setSmartGlossary(!smartGlossary); localStorage.setItem('smartGlossary', !smartGlossary); } }, `Smart ✦ ${smartGlossary ? 'on' : 'off'}`)
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
        `# 🩺 Novel Health & Translation QA Audit`,
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
            h('span', { style: { fontSize: 20 } }, '🩺'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Novel Health & Translation QA Report'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, qaAuditResult?.title || 'Active Document')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
            }, '📋 Copy Report')
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
              '⚙️ Active Heuristic Rules (Toggle On/Off)'
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
              }, `${r.val ? '✓' : '✗'} ${r.label}`))
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
                h('div', { style: { fontSize: 32, marginBottom: 8 } }, '✨'),
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
                      }, '📖 Inspect in Reader')
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
            h('span', { style: { fontSize: 20 } }, '📜'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Translation Diff & Revision History (§8.6)'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, activeDiffData?.title || 'Chapter Revisions')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
              }, '⚡ Snapshot Current Text')
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
            h('span', { style: { fontSize: 14 } }, '💡'),
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
            h('span', { style: { fontSize: 18, flexShrink: 0 } }, '⚡'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'AI Auto-Glossary & Character Extractor'),
              novelTitle && h('div', { style: { fontSize: 11, color: 'var(--iris)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `📖 ${novelTitle}`)
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
            }, isExtractingGlossary ? 'Analyzing Chapters with AI…' : '⚡ Extract Characters & Lore')
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
                    h('span', { style: { color: 'var(--slate)', fontSize: 11 } }, '➔'),
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
                    }, t.gender === 'female' ? '♀ Female' : '♂ Male')
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
          }, targetNovel ? '💾 Save as Novel Profile' : '💾 Save as New Profile'),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--iris)', color: '#fff', fontWeight: 600 },
            onClick: () => handleApplyExtractedTerms(false)
          }, `➕ Append to Glossary (${extractedTerms.filter(t => t.checked).length})`)
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
            h('span', { style: { fontSize: 18 } }, '🔍'),
            h('span', { style: { fontWeight: 700, fontSize: 14 } }, 'Name Consistency & Leak Verifier')
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
                  h('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 4 } }, '✨ 100% Consistent!'),
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
                        h('span', { style: { color: 'var(--slate)', fontSize: 11 } }, '➔ should be'),
                        h('span', { style: { fontWeight: 700, fontSize: 12, color: 'var(--iris)' } }, item.target)
                      ),
                      h('span', { className: 'badge', style: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid currentColor', fontSize: 10 } },
                        `⚠️ ${item.totalLeaks} Untranslated Leak(s)`
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
                    }, `⚡ Replace All Leaks with "${item.target}"`)
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
          }, isAuditingConsistency ? 'Auditing…' : '🔄 Re-audit Chapters'),
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
            h('span', { style: { fontSize: 18 } }, '☁️'),
            h('span', { style: { fontWeight: 700, fontSize: 14 } }, 'Google Drive Settings (Mihon/Komikku)')
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
        ),
        h('div', { className: 'modal-bd', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', { style: { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '10px 12px' } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 4 } }, '💡 No Developer Account? Use 1-Tap File Backup!'),
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
                h('span', null, '📂 Import client_secrets.json'),
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
              }, '📋 Copy Origin')
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
              }, '📋 Copy Redirect URI')
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

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 440 }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { style: { fontSize: 20 } }, '✏️'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 14 } }, 'Rename Novel'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Custom title for EPUB export, library, and future updates')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
          novel.originalSourceTitle && novel.originalSourceTitle !== (value || '').trim() && h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { fontSize: 11, padding: '2px 8px' },
              onClick: () => setValue(novel.originalSourceTitle)
            }, '↺ Reset to Original')
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
            h('span', { style: { fontSize: 20 } }, '💰'),
            h('div', null,
              h('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Translation Cost & Time Estimator'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Pre-translation token economics and multi-stream time projections (§7.2 / §3.6)')
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
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
      confirmAction,
      deleteNovelFromHistory
    } = props;
    if (!novel) return null;
    const h = getH();
    const toast = getToast();

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
        transition: 'background 0.15s ease'
      },
      onClick: (e) => {
        e?.stopPropagation?.();
        if (onClose) onClose();
        onClick();
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
        h('span', { style: { fontSize: 20, flexShrink: 0 } }, icon),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div', { style: { fontWeight: 600, fontSize: 13.5, color: isDanger ? '#ef4444' : 'var(--paper)' } }, title),
          desc && h('div', { style: { fontSize: 11, color: isDanger ? 'rgba(239, 68, 68, 0.8)' : 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, desc)
        )
      ),
      badgeText && h('span', { className: 'badge', style: { marginLeft: 8, fontSize: 11, padding: '3px 8px', flexShrink: 0 } }, badgeText)
    );

    return h('div', { className: 'modal-overlay', onClick: onClose },
      h('div', { className: 'modal-box', style: { maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-hd' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 } },
            item.cover
              ? h('img', { src: item.cover, style: { width: 32, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0 } })
              : h('span', { style: { fontSize: 22, flexShrink: 0 } }, '📚'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title || 'Novel Options'),
              h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, `${item.chapterCount || 0} chapters · ${item.author || 'Author'}`)
            )
          ),
          h('button', { type: 'button', className: 'icon-btn', style: { width: 30, height: 30 }, onClick: onClose }, '✕')
        ),
        h('div', { className: 'modal-bd custom-scrollbar', style: { overflowY: 'auto', padding: '14px 16px' } },
          menuRow('✏️', 'Rename Novel', 'Set a custom title for EPUB export, library, and future updates', () => {
            if (setRenameModalNovel) setRenameModalNovel(item);
            if (setNewNovelTitleInput) setNewNovelTitleInput(item.customTitle || (getCustomTitle ? getCustomTitle(item) : '') || item.title || '');
          }),
          menuRow('📝', 'Edit in Ebook Studio', 'Edit chapters, prose, covers, and table of contents', async () => {
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
          menuRow('🔄', 'Check Online Updates', 'Check online web source for newly published chapters', () => {
            if (handleCheckNovelUpdate) handleCheckNovelUpdate(item);
          }),
          menuRow('⚡', 'Continue Fetching Online', 'Fetch new chapters from web and append to this EPUB with same Book ID', () => {
            if (handleOpenContinuationForNovel) handleOpenContinuationForNovel(item);
          }),
          menuRow('🧬', 'Auto-Build Glossary', 'Extract character cast and lore into a locked Smart Glossary', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (!full) { toast('Novel data not found in local store.', 'error'); return; }
            if (handleOpenAutoGlossary) handleOpenAutoGlossary(full);
          }),
          menuRow('⭐', item.inSavedSpace ? 'Remove from Saved Space' : 'Save to Space', item.inSavedSpace ? 'Remove priority star bookmark' : 'Pin to personal Saved Space shelf', () => {
            if (toggleNovelSavedSpace) toggleNovelSavedSpace(item.id, item);
          }, false, item.inSavedSpace ? 'In Space' : null),
          menuRow('📁', 'Designated Device Folder', dispPath ? `Current: ${dispPath.length > 24 ? dispPath.slice(0, 22) + '…' : dispPath}` : 'Set auto-export folder for Moon+ Reader continuity', () => {
            if (handleSetNovelFolder) handleSetNovelFolder(item);
          }, false, hasFolder ? 'Configured' : null),
          menuRow('🩺', 'Novel Health & QA Audit', 'Audit for CJK leaks, empty chapters, and AI loops', () => {
            if (handleOpenNovelHealthModal) handleOpenNovelHealthModal(item);
          }),
          menuRow('📜', 'Translation Diffs & History', 'Inspect chapter changes and rollback revisions', async () => {
            const full = loadFullNovel ? await loadFullNovel(item) : null;
            if (full && handleOpenDiffModal) handleOpenDiffModal(0, full);
            else toast('Novel data not found.', 'error');
          }),
          menuRow('🏷️', 'Enrich Metadata (AniList)', 'Fetch high-res cover, synopsis, and genres', () => {
            if (handleEnrichNovelMetadata) handleEnrichNovelMetadata(item);
          }),
          menuRow('🖼️', 'Upgrade Illustrations', 'Replace blurry placeholders with crisp, full-resolution sharp artwork', () => {
            if (handleUpgradeNovelIllustrations) handleUpgradeNovelIllustrations(item);
          }),
          menuRow('✂️', 'Split into Story Arcs', 'Divide large multi-volume novel into separate books', () => {
            if (handleSplitNovelIntoArcs) handleSplitNovelIntoArcs(item);
          }),
          menuRow('🗑️', 'Remove from Library', 'Delete novel and cached chapters from local library', () => {
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
  function SourceExtensionsModal(props) {
    const {
      isOpen,
      onClose,
      pluginSelectedTab,
      setPluginSelectedTab,
      pluginCatalog,
      isCatalogLoading,
      pluginSearchQuery,
      setPluginSearchQuery,
      pluginSelectedLangFilter,
      setPluginSelectedLangFilter,
      installingPluginId,
      handleUninstallPlugin,
      handleInstallPlugin,
      customPluginUrl,
      setCustomPluginUrl,
      handleInstallCustomPluginUrl
    } = props;
    if (!isOpen) return null;
    const h = getH();
    const ReactComp = typeof React !== 'undefined' ? React : window.React;

    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--void, #090d16)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    },
      // Top Full-Screen Navigation Bar (Pinned with Safe Area Insets)
      h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: 'max(14px, env(safe-area-inset-top, 14px)) 16px 10px',
          borderBottom: '1px solid var(--hairline)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          gap: 12,
          flexShrink: 0
        }
      },
        // Row 1: Back button, Title, Sideload & Done buttons
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 } },
            h('button', {
              type: 'button',
              className: 'icon-btn',
              style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--hairline)', color: 'var(--paper)', fontSize: 16, cursor: 'pointer', flexShrink: 0 },
              onClick: onClose,
              title: 'Back to Import'
            }, '←'),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { style: { fontWeight: 800, fontSize: 16, color: 'var(--paper)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', null, 'Extensions & Sources'),
                h('span', { className: 'badge', style: { background: 'rgba(99, 102, 241, 0.2)', color: 'var(--iris)', fontSize: 10, padding: '2px 8px', borderRadius: 12 } },
                  `${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length} Installed`
                )
              ),
              h('div', { style: { fontSize: 11, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                'Mihon & LNReader compatible source extensions and built-in scrapers'
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 } },
            h('button', {
              type: 'button',
              className: `mini-btn ${pluginSelectedTab === 'custom' ? '' : 'ghost'}`,
              style: { fontSize: 11, padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap', borderColor: 'var(--hairline)' },
              onClick: () => setPluginSelectedTab(pluginSelectedTab === 'custom' ? 'installed' : 'custom')
            }, pluginSelectedTab === 'custom' ? '✕ Close Sideload' : '🔗 Sideload'),
            h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { fontSize: 11, padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
              onClick: onClose
            }, 'Done')
          )
        ),
        // Row 2: Pinned Segmented Tabs: Installed & Browse Catalog (Always visible at the top!)
        h('div', { className: 'seg-wide', style: { margin: '2px 0 0', width: '100%', maxWidth: 900, alignSelf: 'center' } },
          h('span', {
            className: (pluginSelectedTab === 'installed' || !pluginSelectedTab) ? 'on' : '',
            onClick: () => setPluginSelectedTab('installed')
          }, `✅ Installed (${((window.sourceRegistry || window.SourceRegistry)?.getAll?.() || []).length})`),
          h('span', {
            className: pluginSelectedTab === 'catalog' ? 'on' : '',
            onClick: () => setPluginSelectedTab('catalog')
          }, `🌐 Browse Catalog (${pluginCatalog?.length || '278+'})`),
          pluginSelectedTab === 'custom' && h('span', {
            className: 'on',
            onClick: () => setPluginSelectedTab('custom')
          }, '🔗 Sideload Custom')
        )
      ),

      // Full-Screen Body Container
      h('div', {
        className: 'custom-scrollbar',
        style: {
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '16px 18px',
          maxWidth: 900,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }
      },
        // ── TAB 1: INSTALLED EXTENSIONS ──
        (pluginSelectedTab === 'installed' || !pluginSelectedTab) && (() => {
          const reg = window.sourceRegistry || window.SourceRegistry;
          const installed = reg && typeof reg.getAll === 'function' ? reg.getAll() : (reg && typeof reg.listPlugins === 'function' ? reg.listPlugins() : []);
          if (installed.length === 0) {
            return h('div', { style: { textAlign: 'center', padding: '60px 16px', color: 'var(--slate)', fontSize: 13.5 } },
              h('div', { style: { fontSize: 36, marginBottom: 10 } }, '🔌'),
              h('div', { style: { fontWeight: 600, color: 'var(--paper)', marginBottom: 4 } }, 'No extensions installed yet'),
              h('div', { style: { fontSize: 12, maxWidth: 360, margin: '0 auto 14px', lineHeight: 1.5 } }, 'Browse the Catalog tab to add from 278+ community light novel and web novel sources!'),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700, padding: '8px 18px' },
                onClick: () => setPluginSelectedTab('catalog')
              }, 'Browse Catalog')
            );
          }
          return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            installed.map(p => {
              const isBuiltin = ['novelfire', 'lnori', 'syosetu', 'kakuyomu', 'novelbuddy', 'royalroad', 'readnovelfull', 'boxnovel', 'novelfull'].includes(p.id);
              return h('div', {
                key: p.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isBuiltin ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                  transition: 'border-color 0.15s ease'
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 } },
                  h('div', {
                    style: {
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: isBuiltin ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0
                    }
                  }, isBuiltin ? '⚡' : '🔌'),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', { style: { fontWeight: 700, fontSize: 14, color: 'var(--paper)' } }, p.name),
                      h('span', {
                        className: 'badge',
                        style: {
                          fontSize: 9.5,
                          padding: '2px 7px',
                          background: isBuiltin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isBuiltin ? 'var(--iris)' : '#10b981',
                          borderRadius: 4
                        }
                      }, isBuiltin ? 'Built-in' : 'Extension'),
                      h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, `v${p.version || '1.0.0'}`)
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } }, `ID: ${p.id}${p.site ? ` · ${p.site}` : ''}`)
                  )
                ),
                !isBuiltin && h('button', {
                  type: 'button',
                  className: 'mini-btn danger',
                  style: { padding: '6px 14px', fontSize: 11.5, borderRadius: 6 },
                  onClick: () => handleUninstallPlugin && handleUninstallPlugin(p.id)
                }, 'Uninstall')
              );
            })
          );
        })(),

        // ── TAB 2: BROWSE CATALOG (278+) ──
        pluginSelectedTab === 'catalog' && h(ReactComp.Fragment, null,
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('input', {
              type: 'text',
              placeholder: 'Search 278+ source plugins by name, site, or tag...',
              value: pluginSearchQuery,
              onChange: e => setPluginSearchQuery(e.target.value),
              style: { flex: 1, padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--void)', color: 'var(--paper)' }
            }),
            pluginSearchQuery && h('button', {
              type: 'button',
              className: 'mini-btn ghost',
              style: { padding: '6px 10px', fontSize: 11.5 },
              onClick: () => setPluginSearchQuery('')
            }, 'Clear'),
            isCatalogLoading && h('span', { style: { fontSize: 12, color: 'var(--iris)', fontWeight: 600 } }, 'Loading…')
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 2px' } },
            [
              { id: 'all', label: '🌐 All' },
              { id: 'en', label: '🇺🇸 English' },
              { id: 'ja', label: '🇯🇵 Japanese' },
              { id: 'zh', label: '🇨🇳 Chinese' },
              { id: 'es', label: '🇪🇸 Spanish' },
              { id: 'ru', label: '🇷🇺 Russian' },
              { id: 'ko', label: '🇰🇷 Korean' }
            ].map(pill => {
              const isSel = (pluginSelectedLangFilter || 'all') === pill.id;
              return h('button', {
                key: pill.id,
                type: 'button',
                className: `mini-btn ${isSel ? '' : 'ghost'}`,
                style: {
                  fontSize: 11.5,
                  padding: '5px 12px',
                  fontWeight: isSel ? 700 : 500,
                  borderRadius: 14,
                  borderColor: isSel ? 'var(--iris)' : 'var(--hairline)',
                  background: isSel ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSel ? 'var(--iris)' : 'var(--paper-dim)'
                },
                onClick: () => setPluginSelectedLangFilter(pill.id)
              }, pill.label);
            })
          ),
          (() => {
            if (isCatalogLoading) {
              return h('div', { style: { textAlign: 'center', padding: '48px 16px', color: 'var(--slate)', fontSize: 13.5 } }, 'Fetching community plugin catalog from GitHub…');
            }
            const q = (pluginSearchQuery || '').trim().toLowerCase();
            const targetLang = (pluginSelectedLangFilter || 'all').toLowerCase();
            const list = (pluginCatalog || []).filter(p => {
              if (targetLang !== 'all') {
                const pLang = (p.lang || '').toLowerCase();
                if (targetLang === 'en' && !pLang.includes('english') && pLang !== 'en') return false;
                if (targetLang === 'ja' && !pLang.includes('日本語') && !pLang.includes('japanese') && pLang !== 'ja') return false;
                if (targetLang === 'zh' && !pLang.includes('中文') && !pLang.includes('chinese') && pLang !== 'zh') return false;
                if (targetLang === 'es' && !pLang.includes('español') && !pLang.includes('spanish') && pLang !== 'es') return false;
                if (targetLang === 'ru' && !pLang.includes('русский') && !pLang.includes('russian') && pLang !== 'ru') return false;
                if (targetLang === 'ko' && !pLang.includes('한국어') && !pLang.includes('korean') && pLang !== 'ko') return false;
              }
              if (!q) return true;
              return (p.name && p.name.toLowerCase().includes(q)) ||
                     (p.id && p.id.toLowerCase().includes(q)) ||
                     (p.lang && p.lang.toLowerCase().includes(q)) ||
                     (p.site && p.site.toLowerCase().includes(q));
            });

            if (list.length === 0) {
              return h('div', { style: { textAlign: 'center', padding: '48px 16px', color: 'var(--slate)', fontSize: 13.5 } }, 'No plugins match your search or language filter.');
            }

            return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              list.slice(0, 100).map(p => {
                const reg = window.sourceRegistry || window.SourceRegistry;
                const isInstalled = reg && typeof reg.isInstalled === 'function' ? reg.isInstalled(p.id) : false;
                const isInstalling = installingPluginId === p.id;
                const iconSrc = p.iconUrl || p.icon;
                return h('div', {
                  key: p.id,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isInstalled ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: isInstalled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--hairline)',
                    transition: 'all 0.15s ease'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 } },
                    iconSrc
                      ? h('img', { src: iconSrc, style: { width: 36, height: 36, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }, onError: e => { e.target.style.display = 'none'; } })
                      : h('div', { style: { width: 36, height: 36, borderRadius: 8, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--iris)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 } }, (p.name || 'P').slice(0, 1).toUpperCase()),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                        h('span', { style: { fontWeight: 600, fontSize: 14, color: 'var(--paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
                        h('span', { className: 'badge', style: { fontSize: 9.5, padding: '1px 6px', textTransform: 'uppercase', borderRadius: 4 } }, p.lang || 'EN'),
                        p.version && h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, `v${p.version}`),
                        isInstalled && h('span', { style: { fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: 4 } }, '✓ Installed')
                      ),
                      p.site && h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 } }, p.site)
                    )
                  ),
                  isInstalled ? h('button', {
                    type: 'button',
                    className: 'mini-btn danger',
                    style: { padding: '6px 14px', fontSize: 11.5, borderRadius: 6 },
                    onClick: () => handleUninstallPlugin && handleUninstallPlugin(p.id)
                  }, 'Uninstall') : h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    disabled: isInstalling,
                    style: {
                      background: isInstalling ? 'var(--hairline)' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: isInstalling ? 'var(--slate)' : '#fff',
                      fontWeight: 700,
                      padding: '6px 16px',
                      fontSize: 12,
                      borderRadius: 6,
                      flexShrink: 0,
                      cursor: isInstalling ? 'wait' : 'pointer'
                    },
                    onClick: () => handleInstallPlugin && handleInstallPlugin(p)
                  }, isInstalling ? '⏳ Installing…' : 'Install')
                );
              }),
              list.length > 100 && h('div', { style: { textAlign: 'center', fontSize: 11.5, color: 'var(--slate)', padding: 8 } }, `Showing top 100 of ${list.length} matching plugins. Refine search query to filter.`)
            );
          })()
        ),

        // ── TAB 3: SIDELOAD CUSTOM PLUGIN ──
        pluginSelectedTab === 'custom' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' } },
          h('div', { style: { fontSize: 12.5, color: 'var(--paper-dim)', lineHeight: 1.5 } },
            'Sideload any compliant LNReader or custom JavaScript source plugin directly from a URL (e.g. GitHub raw link or local dev server).'
          ),
          h('input', {
            type: 'text',
            placeholder: 'https://raw.githubusercontent.com/.../plugin.js',
            value: customPluginUrl,
            onChange: e => setCustomPluginUrl(e.target.value),
            style: { padding: '10px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--void)', color: 'var(--paper)', fontFamily: 'monospace' }
          }),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: { background: 'var(--iris)', color: '#fff', fontWeight: 700, padding: '8px 18px', alignSelf: 'flex-start' },
            onClick: handleInstallCustomPluginUrl
          }, '⚡ Fetch & Register Plugin')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 15. EXPORT / TOOLS SHEET
  // ─────────────────────────────────────────────────────────────────────────
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
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('epub') }, h('span', { className: 'ic' }, '⇩'), 'EPUB', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('reader') }, h('span', { className: 'ic' }, '◈'), 'Open in Reader', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('pdf') }, h('span', { className: 'ic' }, '⇩'), 'PDF', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => handleExportRow('docx') }, h('span', { className: 'ic' }, '⇩'), 'DOCX', h('span', { className: 'chev' }, '›')),
        h('div', { className: 'sheet-lbl' }, 'Tools'),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => {
          if (isTranslating) { toast('Cannot split chapters while translation is in progress.', 'warning'); return; }
          setSheetOpen(false);
          handleAutoDetectSplit();
        } }, h('span', { className: 'ic' }, '✂'), 'Split Chapters', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setBoxPreset('input', 'auto'); setBoxPreset('output', 'auto'); setSheetOpen(false); } }, h('span', { className: 'ic' }, '↕'), 'Fit Text Height', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setBoxPreset('input', 'S'); setBoxPreset('output', 'S'); setSheetOpen(false); } }, h('span', { className: 'ic' }, '↺'), 'Reset Box Heights', h('span', { className: 'chev' }, '›')),
        h('button', { type: 'button', className: 'sheet-row', onClick: () => { setSheetOpen(false); setGlossaryEditorOpen(true); } }, h('span', { className: 'ic' }, '📖'), 'Glossary Editor', h('span', { className: 'chev' }, '›'))
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

    return h('div', { className: 'confirm-backdrop', onClick: () => { setShowModal(false); if (setModalCallback) setModalCallback(null); } },
      h('div', { className: 'confirm-box', onClick: (e) => e.stopPropagation() },
        h('p', null, modalMessage),
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
  function DownloadSuccessModal(props) {
    const {
      downloadSuccessModal,
      setDownloadSuccessModal
    } = props || {};

    if (!downloadSuccessModal) return null;
    const h = getH();
    const isEpub = (downloadSuccessModal.fileName || '').toLowerCase().endsWith('.epub');
    const isContinuation = !!downloadSuccessModal.isContinuation;

    const handleOpenInReader = async () => {
      try {
        if (window.NativeBridge && window.NativeBridge.openWithReader) {
          const opened = await window.NativeBridge.openWithReader(downloadSuccessModal.fileName, downloadSuccessModal.path || '');
          if (opened) {
            setDownloadSuccessModal(null);
            return;
          }
        }
      } catch (e) {
        console.warn('Reader open error:', e);
      }
      if (typeof window.toast === 'function') {
        window.toast('Opening in Moon+ Reader…', 'info');
      }
      setDownloadSuccessModal(null);
    };

    return h('div', { className: 'confirm-backdrop', style: { zIndex: 126 }, onClick: () => setDownloadSuccessModal(null) },
      h('div', { className: 'confirm-box', style: { maxWidth: 440, width: '92%' }, onClick: (e) => e.stopPropagation() },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 } },
          h('span', { style: { fontSize: 24 } }, isContinuation ? '📚' : '🎉'),
          h('h3', { style: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-color, #f1f5f9)' } },
            isContinuation ? 'EPUB Updated Successfully!' : 'File Saved Successfully!'
          )
        ),
        isContinuation && downloadSuccessModal.newChaptersCount ? h('p', {
          style: { fontSize: 13, color: 'var(--primary-color, #818cf8)', textAlign: 'center', fontWeight: 600, margin: '4px 0 8px' }
        }, `Appended ${downloadSuccessModal.newChaptersCount} new chapters (Total: ${downloadSuccessModal.totalChaptersCount || 'Updated'})`) : null,
        h('p', { style: { fontSize: 12, color: 'var(--slate, #94a3b8)', textAlign: 'center', wordBreak: 'break-all', marginBottom: isContinuation ? 12 : 16, fontWeight: 500 } }, downloadSuccessModal.fileName),
        isContinuation ? h('div', {
          style: {
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
            textAlign: 'left',
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--text-secondary, #cbd5e1)'
          }
        },
          h('strong', { style: { color: 'var(--primary-color, #a5b4fc)', display: 'block', marginBottom: 4 } }, '💡 Moon+ Reader Pro Shelf Note:'),
          'Moon+ Reader caches book chapters in its shelf database. Tapping ',
          h('strong', null, 'Open in Moon+ Reader'),
          ' below sends a direct system intent that immediately tells Moon+ Reader to scan the updated file and display all new chapters on your shelf.'
        ) : null,
        h('div', { className: 'confirm-actions', style: { display: 'flex', flexDirection: isEpub ? 'column' : 'row', gap: 8 } },
          isEpub && h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: { width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
            onClick: handleOpenInReader
          },
            h('span', null, '📖 Open in Moon+ Reader')
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: isEpub ? { width: '100%', padding: '8px 14px' } : {},
            onClick: () => setDownloadSuccessModal(null)
          }, isEpub ? 'Done' : 'OK')
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 18. EPUB PACKAGING PROGRESS DOCK
  // ─────────────────────────────────────────────────────────────────────────
  function EpubPackagingProgressDock(props) {
    const {
      epubPackagingModal,
      setEpubPackagingModal
    } = props || {};

    if (!epubPackagingModal) return null;
    const h = getH();

    return h('div', {
      style: {
        position: 'fixed',
        bottom: '76px',
        left: '12px',
        right: '12px',
        maxWidth: '440px',
        margin: '0 auto',
        zIndex: 85,
        pointerEvents: 'auto',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '16px',
        boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        padding: '14px 16px'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 } },
          h('div', {
            style: {
              width: 32,
              height: 32,
              minWidth: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: '0 3px 8px rgba(99, 102, 241, 0.4)'
            }
          }, '📦'),
          h('div', { style: { minWidth: 0, flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#f8fafc', lineHeight: 1.2 } }, 'Packaging EPUB…'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, epubPackagingModal.title || 'Novel Archive')
          )
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', {
            style: {
              fontWeight: 800,
              fontSize: 14,
              color: '#818cf8',
              fontFamily: "'IBM Plex Mono', monospace"
            }
          }, `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`),
          h('button', {
            type: 'button',
            style: {
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              cursor: 'pointer',
              padding: 0
            },
            onClick: () => setEpubPackagingModal(null),
            title: 'Dismiss loading card'
          }, '✕')
        )
      ),

      // Animated Visual Progress Bar
      h('div', {
        style: {
          width: '100%',
          height: 6,
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          margin: '8px 0 10px',
          position: 'relative'
        }
      },
        h('div', {
          style: {
            height: '100%',
            width: `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #10b981 100%)',
            borderRadius: 999,
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        })
      ),

      // Status message and elapsed time
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#94a3b8' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 } },
          h('span', { style: { width: 6, height: 6, minWidth: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' } }),
          h('span', { style: { fontWeight: 500, color: '#cbd5e1', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, epubPackagingModal.status || 'Compiling...')
        ),
        epubPackagingModal.elapsed && h('div', {
          style: {
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            background: 'rgba(255, 255, 255, 0.07)',
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            color: '#cbd5e1'
          }
        }, `⏱ ${epubPackagingModal.elapsed}`)
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 18B. TOAST ITEM (Touch & Pointer Swipe to Dismiss / Swipe Down to Dismiss All)
  // ─────────────────────────────────────────────────────────────────────────
  function ToastItem(props) {
    const { toast, onDismiss, onDismissAll } = props;
    const h = getH();
    const elRef = (typeof React !== 'undefined' && React.useRef) ? React.useRef(null) : { current: null };
    const gestureRef = (typeof React !== 'undefined' && React.useRef)
      ? React.useRef({ startX: 0, startY: 0, deltaX: 0, deltaY: 0, swiping: false })
      : { current: { startX: 0, startY: 0, deltaX: 0, deltaY: 0, swiping: false } };

    const handlePointerDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      const g = gestureRef.current;
      g.startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      g.startY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      g.deltaX = 0;
      g.deltaY = 0;
      g.swiping = true;
      if (elRef.current) {
        elRef.current.style.transition = 'none';
        if (typeof elRef.current.setPointerCapture === 'function' && e.pointerId !== undefined) {
          try { elRef.current.setPointerCapture(e.pointerId); } catch (_) {}
        }
      }
    };

    const handlePointerMove = (e) => {
      const g = gestureRef.current;
      if (!g.swiping || !elRef.current) return;
      const curX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const curY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      g.deltaX = curX - g.startX;
      g.deltaY = curY - g.startY;

      // Downward swipe (gesture to clear all toasts)
      if (g.deltaY > 10 && Math.abs(g.deltaY) > Math.abs(g.deltaX) * 1.1) {
        elRef.current.style.transform = `translateY(${g.deltaY}px)`;
        elRef.current.style.opacity = String(Math.max(0.08, 1 - g.deltaY / 160));
      } else {
        // Horizontal swipe (gesture to dismiss individual toast)
        elRef.current.style.transform = `translateX(${g.deltaX}px)`;
        elRef.current.style.opacity = String(Math.max(0.08, 1 - Math.abs(g.deltaX) / 200));
      }
    };

    const handlePointerEnd = (e) => {
      const g = gestureRef.current;
      if (!g.swiping || !elRef.current) return;
      g.swiping = false;

      // Downward swipe -> Dismiss ALL toasts
      if (g.deltaY > 45 && Math.abs(g.deltaY) > Math.abs(g.deltaX)) {
        elRef.current.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        elRef.current.style.transform = 'translateY(120px)';
        elRef.current.style.opacity = '0';
        setTimeout(() => {
          if (typeof onDismissAll === 'function') onDismissAll();
        }, 160);
        return;
      }

      // Horizontal swipe -> Dismiss this single toast
      if (Math.abs(g.deltaX) > 55) {
        elRef.current.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
        elRef.current.style.transform = `translateX(${g.deltaX > 0 ? 350 : -350}px)`;
        elRef.current.style.opacity = '0';
        setTimeout(() => {
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }, 160);
        return;
      }

      // Snap back if threshold was not reached
      elRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      elRef.current.style.transform = 'translate(0px, 0px)';
      elRef.current.style.opacity = '1';
    };

    return h('div', {
      key: toast.id,
      ref: elRef,
      className: `toast ${toast.type || 'success'}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        textAlign: 'left'
      },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd
    },
      h('span', { style: { flex: 1, pointerEvents: 'none' } }, toast.msg),
      toast.action && h('button', {
        type: 'button',
        className: 'mini-btn',
        style: {
          background: '#ffffff',
          color: '#111827',
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 800,
          borderRadius: 6,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          flexShrink: 0
        },
        onClick: (e) => {
          e.stopPropagation();
          if (typeof toast.action.onClick === 'function') toast.action.onClick();
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }
      }, toast.action.label || 'Undo'),
      h('button', {
        type: 'button',
        className: 'toast-dismiss-btn',
        title: 'Dismiss toast',
        onClick: (e) => {
          e.stopPropagation();
          if (typeof onDismiss === 'function') onDismiss(toast.id);
        }
      }, '✕')
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 19. APP MODALS CONTAINER (Consolidated Root Modal Container)
  // ─────────────────────────────────────────────────────────────────────────
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

      // 5. Toasts (Swipe-to-Dismiss individual toasts & Swipe Down to Clear All)
      (props.toasts && props.toasts.length > 0) && h('div', { className: 'toast-wrap' },
        props.toasts.length > 1 && h('button', {
          type: 'button',
          className: 'toast-dismiss-all-pill',
          onClick: (e) => {
            e.stopPropagation();
            if (typeof props.setToasts === 'function') props.setToasts([]);
          }
        }, `✕ Swipe down or tap to clear all (${props.toasts.length})`),
        props.toasts.map(t => h(ToastItem, {
          key: t.id,
          toast: t,
          onDismiss: (id) => {
            if (typeof props.setToasts === 'function') {
              props.setToasts(p => p.filter(item => item.id !== id));
            }
          },
          onDismissAll: () => {
            if (typeof props.setToasts === 'function') {
              props.setToasts([]);
            }
          }
        }))
      ),

      // 6. Confirm Dialog
      h(ConfirmDialog, {
        showModal: props.showModal,
        setShowModal: props.setShowModal,
        modalMessage: props.modalMessage,
        modalCallback: props.modalCallback,
        setModalCallback: props.setModalCallback
      }),

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
        chapters: typeof props.getExportChapters === 'function' ? props.getExportChapters() : (props.exportChapters || []),
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
        }
      }),

      // 10. Library Novel Action Sheet
      h(LibraryNovelActionSheet, {
        novel: props.activeBookMenuNovel,
        onClose: props.onCloseBookMenu || (() => props.setActiveBookMenuNovel?.(null)),
        getNovelFolderOptions: props.getNovelFolderOptions,
        setRenameModalNovel: props.setRenameModalNovel,
        setNewNovelTitleInput: props.setNewNovelTitleInput,
        getCustomTitle: props.getCustomTitle,
        loadFullNovel: props.loadFullNovel,
        setActiveTab: props.setActiveTab,
        setStudioSubTab: props.setStudioSubTab,
        handleCheckNovelUpdate: props.handleCheckNovelUpdate,
        handleOpenContinuationForNovel: props.handleOpenContinuationForNovel,
        handleOpenAutoGlossary: props.handleOpenAutoGlossary,
        toggleNovelSavedSpace: props.toggleNovelSavedSpace,
        handleSetNovelFolder: props.handleSetNovelFolder,
        handleOpenNovelHealthModal: props.handleOpenNovelHealthModal,
        handleOpenDiffModal: props.handleOpenDiffModal,
        handleEnrichNovelMetadata: props.handleEnrichNovelMetadata,
        handleUpgradeNovelIllustrations: props.handleUpgradeNovelIllustrations,
        handleSplitNovelIntoArcs: props.handleSplitNovelIntoArcs,
        confirmAction: props.confirmAction,
        deleteNovelFromHistory: props.deleteNovelFromHistory
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
      h('div', { dangerouslySetInnerHTML: { __html: (typeof window !== 'undefined' ? window.modalHtml : '') || (typeof modalHtml !== 'undefined' ? modalHtml : (props.modalHtml || '')) } })
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
