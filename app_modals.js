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
  function OngoingEpubContinuationModal(props) {
    const {
      modalData,
      onClose,
      setOngoingEpubModal,
      updateNovelFolderRecord,
      handleScanContinuationToc,
      handleSearchContinuationSources,
      handleSelectContinuationSource,
      handleExecuteContinuation
    } = props;
    if (!modalData || !modalData.isOpen) return null;
    const ongoingEpubModal = modalData;
    const h = getH();
    const toast = getToast();
    const handleClose = onClose || (() => setOngoingEpubModal(null));

    return h('div', {
      className: 'fullscreen-modal-overlay',
      style: {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10050,
        background: 'var(--void, #0a0a0c)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif'
      }
    },
      // Apple-style Top Navigation Bar
      h('div', {
        style: {
          height: 56,
          minHeight: 56,
          borderBottom: '1px solid var(--hairline)',
          background: 'rgba(18, 18, 22, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 2
        }
      },
        h('button', {
          type: 'button',
          style: {
            background: 'transparent',
            border: 'none',
            color: 'var(--accent, #6366f1)',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 8,
            minHeight: 44
          },
          disabled: ongoingEpubModal.isFetching,
          onClick: handleClose
        }, '‹ Back'),
        h('div', { style: { textAlign: 'center' } },
          h('div', { style: { fontWeight: 700, fontSize: 16, color: 'var(--paper)' } }, 'Continue Ongoing Novel'),
          h('div', { style: { fontSize: 11, color: '#10b981', fontWeight: 600 } }, '✓ Moon+ Reader Pro Continuity')
        ),
        !ongoingEpubModal.isFetching ? h('button', {
          type: 'button',
          className: 'icon-btn',
          style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--paper)', cursor: 'pointer', fontSize: 14 },
          onClick: handleClose
        }, '✕') : h('div', { style: { width: 36 } })
      ),

      // Scrollable Content with Apple Spacing & Touch Targets
      h('div', {
        className: 'custom-scrollbar',
        style: {
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px 100px',
          maxWidth: 680,
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }
      },
        // 1. Novel Header Card (Apple Books presentation)
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            gap: 16,
            alignItems: 'center'
          }
        },
          ongoingEpubModal.cover ? h('img', {
            src: ongoingEpubModal.cover,
            alt: 'Cover',
            style: {
              width: 64,
              height: 88,
              borderRadius: 10,
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)'
            }
          }) : h('div', {
            style: {
              width: 64,
              height: 88,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              flexShrink: 0
            }
          }, '📖'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontWeight: 700, fontSize: 16, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 4 } }, ongoingEpubModal.title),
            h('div', { style: { fontSize: 13, color: 'var(--slate)', marginBottom: 8 } }, `by ${ongoingEpubModal.author || 'Unknown'}`),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', {
                style: {
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--iris)',
                  fontWeight: 600,
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }
              }, `📚 ${ongoingEpubModal.existingCount || 0} chapters in EPUB`),
              h('span', {
                style: {
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  fontWeight: 600,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }
              }, '✓ Book ID preserved silently')
            )
          )
        ),

        // 1b. Original EPUB Preservation Card
        h('div', {
          style: {
            background: ongoingEpubModal.file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            border: ongoingEpubModal.file ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14
          }
        },
          ongoingEpubModal.file ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0
              }
            }, '✓'),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#10b981' } }, 'True In-Place Continuation Active'),
              h('div', { style: { fontSize: 12, color: 'var(--paper)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                ongoingEpubModal.file.name || 'Original EPUB file linked'
              ),
              h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                '100% of photos, custom CSS styling, fonts, drop-caps, and reading bookmarks will be preserved.'
              )
            )
          ) : h('div', { style: { flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 } },
              '📷 Preserve 100% Original Photos & Styles'
            ),
            h('div', { style: { fontSize: 12, color: 'var(--slate)', marginTop: 3, lineHeight: 1.4 } },
              'Link your original .epub file from your device so all existing illustrations, drop-caps, and custom formatting remain completely intact.'
            )
          ),
          h('label', {
            className: 'mini-btn',
            style: {
              background: ongoingEpubModal.file ? 'rgba(255, 255, 255, 0.08)' : 'var(--accent, #6366f1)',
              color: ongoingEpubModal.file ? 'var(--paper)' : '#fff',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44
            }
          },
            ongoingEpubModal.file ? '📁 Change File' : '📁 Link Original EPUB',
            h('input', {
              type: 'file',
              accept: '.epub',
              style: { display: 'none' },
              onChange: (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.name.toLowerCase().endsWith('.epub')) {
                  return toast('Please select a valid .epub file.', 'warning');
                }
                setOngoingEpubModal(prev => prev ? { ...prev, file: f } : null);
                toast(`Linked "${f.name}"! Original photos and styling will be preserved.`, 'success');
              }
            })
          )
        ),

        // 1c. Designated Save Location Card
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 } },
            h('div', {
              style: {
                width: 40,
                height: 40,
                borderRadius: 10,
                background: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? '#10b981' : 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0
              }
            }, '📁'),
            h('div', { style: { minWidth: 0 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, 'Save Location:'),
              h('div', { style: { fontSize: 12, color: (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? '#10b981' : 'var(--slate)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } },
                ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.displayPath || (ongoingEpubModal.folderOptions?.treeUri ? 'Designated Device Folder' : 'Default Downloads Folder')
              ),
              h('div', { style: { fontSize: 11, color: 'var(--slate)', marginTop: 2 } },
                'Designated folder on device for Moon+ Reader continuity'
              )
            )
          ),
          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--hairline)',
              color: 'var(--paper)',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              minHeight: 44
            },
            onClick: async () => {
              if (window.NativeBridge && window.NativeBridge.chooseFolder) {
                try {
                  const res = await window.NativeBridge.chooseFolder();
                  if (res && res.treeUri) {
                    const fOpts = { treeUri: res.treeUri, folderPath: res.displayPath || res.treeUri };
                    setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                    if (updateNovelFolderRecord) await updateNovelFolderRecord({ id: ongoingEpubModal.uuid, title: ongoingEpubModal.title }, res.treeUri, res.displayPath || res.treeUri);
                    toast(`Location set to "${res.displayPath || 'chosen folder'}"!`, 'success');
                  }
                } catch (e) {
                  toast('Folder selection error: ' + e.message, 'error');
                }
              } else if (typeof window.showDirectoryPicker === 'function') {
                try {
                  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                  if (handle) {
                    const fOpts = { dirHandle: handle, folderPath: handle.name };
                    setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                    toast(`Location set to "${handle.name}"!`, 'success');
                  }
                } catch (e) {
                  if (e.name !== 'AbortError') toast('Folder selection error: ' + e.message, 'error');
                }
              } else {
                const cur = ongoingEpubModal.folderOptions?.folderPath || '';
                const p = window.prompt('Enter designated device folder path for EPUB:', cur);
                if (p && p.trim()) {
                  const fOpts = { subDir: p.trim(), folderPath: p.trim() };
                  setOngoingEpubModal(prev => prev ? { ...prev, folderOptions: fOpts } : null);
                  if (updateNovelFolderRecord) await updateNovelFolderRecord({ id: ongoingEpubModal.uuid, title: ongoingEpubModal.title }, '', p.trim());
                  toast(`Location set to "${p.trim()}"!`, 'success');
                }
              }
            }
          }, (ongoingEpubModal.folderOptions?.folderPath || ongoingEpubModal.folderOptions?.treeUri) ? '📁 Change Location' : '📁 Select Location')
        ),

        // 2. Online Source Management & Switching Card
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          // Card Header with Active Source Indicator & Switcher Toggle
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Online Chapter Source:'),
              ongoingEpubModal.sourceUrl && h('span', {
                style: {
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }
              }, '🟢 Active')
            ),
            h('button', {
              type: 'button',
              style: {
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: 'var(--accent, #6366f1)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              },
              onClick: () => setOngoingEpubModal(prev => prev ? { ...prev, showSourceSwitcher: !prev.showSourceSwitcher } : null)
            }, ongoingEpubModal.showSourceSwitcher ? '▲ Hide Source Chooser' : '🔀 Switch Source / Search')
          ),

          // Currently Active Source Highlight Card
          ongoingEpubModal.sourceUrl && h('div', {
            style: {
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }
          },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } },
                  ongoingEpubModal.selectedSource?.source || (() => {
                    try { return new URL(ongoingEpubModal.sourceUrl).hostname.replace(/^www\./, ''); } catch(e) { return 'Online Source'; }
                  })()
                ),
                ongoingEpubModal.totalOnlineCount > 0 && h('span', { style: { fontSize: 11.5, color: '#10b981', fontWeight: 600 } },
                  `(${ongoingEpubModal.totalOnlineCount} total chapters)`
                )
              ),
              h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                ongoingEpubModal.sourceUrl
              )
            ),
            h('button', {
              type: 'button',
              className: 'mini-btn',
              style: {
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--hairline)',
                color: 'var(--paper)',
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0
              },
              disabled: ongoingEpubModal.isScanningToc || ongoingEpubModal.isFetching,
              onClick: () => handleScanContinuationToc && handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount)
            }, ongoingEpubModal.isScanningToc ? 'Scanning…' : '🔄 Re-scan')
          ),

          // Source Switcher Tray
          (!ongoingEpubModal.sourceUrl || ongoingEpubModal.showSourceSwitcher) && h('div', {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 4,
              paddingTop: 8,
              borderTop: '1px solid var(--hairline)'
            }
          },
            // Search Input for Alternative Sources
            h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                type: 'text',
                className: 'url-input',
                style: { flex: 1, fontSize: 13, height: 42, borderRadius: 10 },
                placeholder: 'Search novel title across 278+ sources…',
                value: ongoingEpubModal.searchQuery !== undefined ? ongoingEpubModal.searchQuery : (ongoingEpubModal.title || ''),
                disabled: ongoingEpubModal.isSearchingSources || ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, searchQuery: e.target.value } : null),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && handleSearchContinuationSources) {
                    handleSearchContinuationSources(ongoingEpubModal.searchQuery || ongoingEpubModal.title);
                  }
                }
              }),
              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '0 16px', height: 42, borderRadius: 10 },
                disabled: ongoingEpubModal.isSearchingSources || ongoingEpubModal.isFetching,
                onClick: () => handleSearchContinuationSources && handleSearchContinuationSources(ongoingEpubModal.searchQuery || ongoingEpubModal.title)
              }, ongoingEpubModal.isSearchingSources ? 'Searching…' : '🔍 Search Sources')
            ),

            // Matched Sources List
            ongoingEpubModal.isSearchingSources && h('div', {
              style: { padding: '16px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }
            }, 'Searching built-in sources & 278+ extensions by title…'),

            !ongoingEpubModal.isSearchingSources && ongoingEpubModal.continuationSources?.length > 0 && h('div', {
              style: { display: 'flex', flexDirection: 'column', gap: 8 }
            },
              h('div', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600 } }, 'Tap any source below to switch immediately:'),
              ongoingEpubModal.continuationSources.slice(0, 8).map((srcItem, sIdx) => {
                const isSelected = ongoingEpubModal.sourceUrl === (srcItem.url || srcItem.path);
                return h('div', {
                  key: srcItem.url || srcItem.id || sIdx,
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1.5px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: 52
                  },
                  onClick: () => handleSelectContinuationSource && handleSelectContinuationSource(srcItem)
                },
                  h('div', {
                    style: {
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isSelected ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0
                    }
                  }, isSelected ? '✓' : (srcItem.source ? srcItem.source.slice(0, 2).toUpperCase() : '🌐')),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--paper)' } }, srcItem.source || 'Source'),
                      srcItem.chapters && h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, `(${srcItem.chapters} chs)`),
                      isSelected && h('span', { style: { fontSize: 11, color: 'var(--iris)', fontWeight: 600 } }, '• Current')
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, srcItem.title || srcItem.url)
                  ),
                  isSelected && ongoingEpubModal.isScanningToc && h('span', { style: { fontSize: 11.5, color: 'var(--iris)', fontWeight: 600 } }, 'Scanning…')
                );
              })
            ),

            // Direct Custom URL Input
            h('div', { style: { marginTop: 6 } },
              h('div', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, marginBottom: 6 } }, 'Or enter / paste any novel URL directly:'),
              h('div', { style: { display: 'flex', gap: 8 } },
                h('input', {
                  type: 'text',
                  className: 'url-input',
                  style: { flex: 1, fontSize: 13, height: 42, borderRadius: 10 },
                  placeholder: 'Paste web novel URL (https://…)',
                  value: ongoingEpubModal.sourceUrl || '',
                  disabled: ongoingEpubModal.isFetching || ongoingEpubModal.isScanningToc,
                  onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, sourceUrl: e.target.value } : null),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && ongoingEpubModal.sourceUrl?.trim() && handleScanContinuationToc) {
                      handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount);
                    }
                  }
                }),
                h('button', {
                  type: 'button',
                  className: 'mini-btn',
                  style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '0 16px', height: 42, borderRadius: 10 },
                  disabled: !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isFetching || ongoingEpubModal.isScanningToc,
                  onClick: () => handleScanContinuationToc && handleScanContinuationToc(ongoingEpubModal.sourceUrl, ongoingEpubModal.existingCount)
                }, ongoingEpubModal.isScanningToc ? 'Scanning…' : '🔍 Use & Scan')
              )
            )
          ),

          // Scan confirmation badge
          ongoingEpubModal.totalOnlineCount > 0 && h('div', {
            style: {
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontWeight: 600,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }
          }, `✓ Found ${ongoingEpubModal.totalOnlineCount} chapters online (${Math.max(0, ongoingEpubModal.totalOnlineCount - ongoingEpubModal.existingCount)} new chapters ready to fetch)`)
        ),

        // 3. Chapter Range Selector (Apple Touch Form)
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }
        },
          h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Chapter Range to Fetch:'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14 } },
            h('div', { style: { flex: 1 } },
              h('span', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, display: 'block', marginBottom: 6 } }, 'From Chapter:'),
              h('input', {
                type: 'number',
                className: 'mini-input',
                style: { width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center' },
                min: 1,
                max: ongoingEpubModal.totalOnlineCount || 9999,
                value: ongoingEpubModal.startChapter,
                disabled: ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, startChapter: parseInt(e.target.value, 10) || 1 } : null)
              })
            ),
            h('span', { style: { fontSize: 20, color: 'var(--slate)', marginTop: 22 } }, '→'),
            h('div', { style: { flex: 1 } },
              h('span', { style: { fontSize: 12, color: 'var(--slate)', fontWeight: 600, display: 'block', marginBottom: 6 } }, 'To Chapter:'),
              h('input', {
                type: 'number',
                className: 'mini-input',
                style: { width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center' },
                min: ongoingEpubModal.startChapter || 1,
                max: ongoingEpubModal.totalOnlineCount || 9999,
                value: ongoingEpubModal.endChapter,
                disabled: ongoingEpubModal.isFetching,
                onChange: (e) => setOngoingEpubModal(prev => prev ? { ...prev, endChapter: parseInt(e.target.value, 10) || 1 } : null)
              })
            )
          ),
          h('div', { style: { fontSize: 12, color: 'var(--slate)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8 } },
            `💡 Chapters 1 to ${Math.max(0, (ongoingEpubModal.startChapter || 1) - 1)} in your EPUB will be kept completely untouched with identical internal filenames, preserving 100% of your Moon+ Reader bookmarks, highlights, and notes.`
          )
        ),

        // 4. Progress Card during fetch
        ongoingEpubModal.isFetching && h('div', {
          style: {
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 16,
            padding: '16px 18px'
          }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, ongoingEpubModal.progress?.status || 'Fetching chapters…'),
            h('span', { style: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--accent, #6366f1)', fontSize: 13 } }, `${ongoingEpubModal.progress?.pct || 0}%`)
          ),
          h('div', { style: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', margin: '6px 0' } },
            h('div', { style: { height: '100%', width: `${ongoingEpubModal.progress?.pct || 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
          ),
          ongoingEpubModal.progress?.elapsed && h('div', { style: { fontSize: 11, color: 'var(--slate)', textAlign: 'right', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" } },
            `⏱ ${ongoingEpubModal.progress.elapsed}`
          )
        )
      ),

      // Docked Bottom Action Bar (Apple Style)
      h('div', {
        style: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 76,
          background: 'rgba(18, 18, 22, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          zIndex: 3
        }
      },
        h('div', { style: { maxWidth: 680, width: '100%', display: 'flex', gap: 12 } },
          !ongoingEpubModal.isFetching && h('button', {
            type: 'button',
            style: {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--hairline)',
              color: 'var(--paper)',
              fontWeight: 600,
              fontSize: 14,
              height: 48,
              padding: '0 20px',
              borderRadius: 12,
              cursor: 'pointer'
            },
            onClick: handleClose
          }, 'Cancel'),
          h('button', {
            type: 'button',
            style: {
              flex: 1,
              background: 'linear-gradient(90deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              height: 48,
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              cursor: (ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc) ? 'not-allowed' : 'pointer',
              opacity: (ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            },
            disabled: ongoingEpubModal.isFetching || !ongoingEpubModal.sourceUrl?.trim() || ongoingEpubModal.isScanningToc,
            onClick: handleExecuteContinuation
          }, ongoingEpubModal.isFetching ? '⏳ Fetching & Merging…' : `▶ Fetch Ch. ${ongoingEpubModal.startChapter}–${ongoingEpubModal.endChapter} & Update EPUB`)
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 13. SWIFTAUDIO PLAYER (MINI-PLAYER, FULL PLAYER, BACKGROUND PROGRESS, DOWNLOAD MODAL)
  // ─────────────────────────────────────────────────────────────────────────
  function SwiftAudioPlayer(props) {
    const {
      audioPlayerState,
      amoledMode,
      isFullPlayerOpen,
      setIsFullPlayerOpen,
      isPlayerFullscreen,
      setIsPlayerFullscreen,
      isAudiobookInLibrary,
      saveAudiobookToLibrary,
      removeAudiobookFromLibrary,
      handleOpenAudioDownload,
      downloadingTrackId,
      setDownloadingTrackId,
      audioDownloadModal,
      setAudioDownloadModal,
      getNovelFolderOptions,
      handleExecuteAudioBatchDownload
    } = props;
    const h = getH();
    const toast = getToast();
    const ReactComp = typeof React !== 'undefined' ? React : window.React;

    const hasMini = !!(audioPlayerState?.currentBook);
    const hasFull = !!(isFullPlayerOpen && audioPlayerState?.currentBook);
    const hasBgDl = !!(audioDownloadModal?.active && audioDownloadModal?.isMinimized);
    const hasModalDl = !!(audioDownloadModal && !audioDownloadModal.isMinimized);

    if (!hasMini && !hasFull && !hasBgDl && !hasModalDl) return null;

    return h(ReactComp.Fragment, null,
      // 1. Floating Mini-Player
      hasMini && h('div', {
        className: 'swift-mini-player',
        style: {
          position: 'fixed',
          bottom: 58,
          left: 0,
          right: 0,
          height: 60,
          background: amoledMode ? '#000000' : 'rgba(15, 23, 42, 0.96)',
          borderTop: '1px solid var(--hairline)',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          zIndex: 995,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.45)',
          cursor: 'pointer'
        },
        onClick: () => setIsFullPlayerOpen(true)
      },
        audioPlayerState.currentBook.cover ? h('img', {
          src: audioPlayerState.currentBook.cover,
          alt: 'Cover',
          referrerPolicy: 'no-referrer',
          onError: (e) => { e.target.style.display = 'none'; },
          style: { width: 42, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }
        }) : h('div', {
          style: { width: 42, height: 42, borderRadius: 6, background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }
        }, '🎧'),

        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 700, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
            audioPlayerState.currentTrack?.title || audioPlayerState.currentBook.title
          ),
          h('div', { style: { fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', null, `${audioPlayerState.currentTrackIndex + 1}/${audioPlayerState.totalTracks || 1}`),
            h('span', null, '•'),
            h('span', null, `${window.SwiftAudioEngine?.formatDuration(audioPlayerState.currentTime) || '0:00'} / ${window.SwiftAudioEngine?.formatDuration(audioPlayerState.duration) || '0:00'}`)
          )
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 }, onClick: e => e.stopPropagation() },
          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 11, fontWeight: 700 },
            title: 'Skip back 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
          }, '-5s'),

          h('button', {
            type: 'button',
            className: 'mini-btn',
            style: {
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              padding: 0
            },
            title: audioPlayerState.isPlaying ? 'Pause' : 'Play',
            onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
          }, audioPlayerState.isPlaying ? '⏸' : '▶'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 11, fontWeight: 700 },
            title: 'Skip forward 5 seconds',
            onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
          }, '+5s'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 13 },
            title: 'Next Chapter',
            onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
          }, '⏭'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 12 },
            title: 'Open full audiobook player',
            onClick: () => setIsFullPlayerOpen(true)
          }, '▲'),

          h('button', {
            type: 'button',
            className: 'mini-btn ghost',
            style: { padding: '6px 8px', fontSize: 13, color: 'var(--slate)' },
            title: 'Close and stop player',
            onClick: (e) => {
              e.stopPropagation();
              window.SwiftAudioEngine?.Player?.close();
            }
          }, '✕')
        )
      ),

      // 2. Full Player Modal
      hasFull && h('div', {
        className: 'modal-overlay',
        style: {
          zIndex: 1000,
          alignItems: isPlayerFullscreen ? 'center' : 'flex-end',
          padding: 0,
          background: isPlayerFullscreen ? '#0b0f19' : 'rgba(0, 0, 0, 0.75)'
        },
        onClick: () => setIsFullPlayerOpen(false)
      },
        h('div', {
          className: 'modal-box swift-player-drawer',
          style: {
            maxWidth: isPlayerFullscreen ? '100%' : 480,
            width: '100%',
            height: isPlayerFullscreen ? '100%' : 'auto',
            maxHeight: isPlayerFullscreen ? '100vh' : '92vh',
            borderTopLeftRadius: isPlayerFullscreen ? 0 : 18,
            borderTopRightRadius: isPlayerFullscreen ? 0 : 18,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            overflowX: 'hidden',
            boxSizing: 'border-box'
          },
          onClick: e => e.stopPropagation()
        },
          !isPlayerFullscreen && h('div', {
            style: {
              width: 38,
              height: 4,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.25)',
              margin: '10px auto 2px',
              flexShrink: 0,
              cursor: 'pointer'
            },
            title: 'Double-tap to toggle fullscreen',
            onDoubleClick: () => setIsPlayerFullscreen(prev => !prev)
          }),
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid var(--hairline)'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '4px 8px', fontSize: 13, fontWeight: 700 },
                title: 'Minimize player to bottom',
                onClick: () => setIsFullPlayerOpen(false)
              }, '▼'),
              h('div', null,
                h('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--paper)' } }, 'Audiobook Player'),
                h('div', { style: { fontSize: 11, color: 'var(--slate)' } }, isPlayerFullscreen ? 'Fullscreen Mode' : 'Powered by Open-Source Plyr')
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              (() => {
                const inLib = isAudiobookInLibrary ? isAudiobookInLibrary(audioPlayerState.currentBook) : false;
                return h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: {
                    padding: '4px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: inLib ? '#f59e0b' : 'var(--paper)',
                    borderColor: inLib ? '#f59e0b' : 'var(--hairline)'
                  },
                  title: inLib ? 'Saved in Library (tap to remove)' : 'Add audiobook to Library',
                  onClick: () => {
                    if (inLib) {
                      if (removeAudiobookFromLibrary) removeAudiobookFromLibrary(audioPlayerState.currentBook);
                    } else {
                      if (saveAudiobookToLibrary) saveAudiobookToLibrary(audioPlayerState.currentBook);
                    }
                  }
                }, inLib ? '⭐ In Library' : '☆ Add to Library');
              })(),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { padding: '4px 8px', fontSize: 13 },
                title: isPlayerFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player',
                onClick: () => setIsPlayerFullscreen(prev => !prev)
              }, isPlayerFullscreen ? '🗗' : '⛶'),
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { border: 'none', fontSize: 16, color: 'var(--slate)' },
                title: 'Close and stop player',
                onClick: () => {
                  setIsFullPlayerOpen(false);
                  window.SwiftAudioEngine?.Player?.close();
                }
              }, '✕')
            )
          ),

          h('div', { style: { padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', flex: 1, boxSizing: 'border-box' } },
            h('div', { style: { textAlign: 'center', marginBottom: 14 } },
              audioPlayerState.currentBook.cover ? h('img', {
                src: audioPlayerState.currentBook.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: { width: isPlayerFullscreen ? 180 : 160, height: isPlayerFullscreen ? 260 : 230, borderRadius: 12, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', margin: '0 auto' }
              }) : h('div', {
                style: { width: 160, height: 210, borderRadius: 12, background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, margin: '0 auto' }
              }, '🎧')
            ),

            h('div', { style: { textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--paper)', lineHeight: 1.3 } }, audioPlayerState.currentBook.title),
              h('div', { style: { fontSize: 12.5, color: 'var(--slate)', marginTop: 4 } }, audioPlayerState.currentBook.author ? `by ${audioPlayerState.currentBook.author}` : 'SwiftAudiobooks'),
              h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--accent, #6366f1)', marginTop: 4 } },
                audioPlayerState.currentTrack?.title || `Track ${audioPlayerState.currentTrackIndex + 1}`
              )
            ),

            h('div', { style: { marginBottom: 12 } },
              h('input', {
                type: 'range',
                min: 0,
                max: audioPlayerState.duration || 100,
                step: 0.5,
                value: audioPlayerState.currentTime || 0,
                onChange: e => window.SwiftAudioEngine?.Player?.seekTo(parseFloat(e.target.value)),
                style: { width: '100%', accentColor: 'var(--accent, #6366f1)', cursor: 'pointer' }
              }),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 } },
                h('span', null, window.SwiftAudioEngine?.formatDuration(audioPlayerState.currentTime) || '0:00'),
                h('span', null, window.SwiftAudioEngine?.formatDuration(audioPlayerState.duration) || '0:00')
              )
            ),

            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 } },
              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 16, padding: '8px 12px' },
                title: 'Previous Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.previousTrack()
              }, '⏮'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 12, fontWeight: 700, padding: '8px 12px' },
                title: 'Rewind 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipBackward5()
              }, '-5s'),

              h('button', {
                type: 'button',
                className: 'mini-btn',
                style: {
                  background: 'var(--accent, #6366f1)',
                  color: '#fff',
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                },
                title: audioPlayerState.isPlaying ? 'Pause' : 'Play',
                onClick: () => window.SwiftAudioEngine?.Player?.togglePlay()
              }, audioPlayerState.isPlaying ? '⏸' : '▶'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 12, fontWeight: 700, padding: '8px 12px' },
                title: 'Forward 5 seconds',
                onClick: () => window.SwiftAudioEngine?.Player?.skipForward5()
              }, '+5s'),

              h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 16, padding: '8px 12px' },
                title: 'Next Chapter',
                onClick: () => window.SwiftAudioEngine?.Player?.nextTrack()
              }, '⏭')
            ),

            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', gap: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'Speed:'),
                [0.75, 1.0, 1.25, 1.5, 2.0].map(sp => h('button', {
                  key: sp,
                  type: 'button',
                  className: `mini-btn ${audioPlayerState.playbackRate === sp ? '' : 'ghost'}`,
                  style: {
                    padding: '4px 7px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: audioPlayerState.playbackRate === sp ? 'var(--accent, #6366f1)' : 'transparent',
                    color: audioPlayerState.playbackRate === sp ? '#fff' : 'var(--paper-dim)'
                  },
                  onClick: () => window.SwiftAudioEngine?.Player?.setPlaybackRate(sp)
                }, `${sp}x`))
              ),

              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600 } }, 'Sleep:'),
                h('select', {
                  value: audioPlayerState.sleepAtEndOfChapter ? 'end_of_chapter' : (audioPlayerState.sleepTimerRemainingSeconds ? String(Math.ceil(audioPlayerState.sleepTimerRemainingSeconds / 60)) : 'off'),
                  onChange: e => {
                    const val = e.target.value;
                    if (val === 'off') window.SwiftAudioEngine?.Player?.clearSleepTimer();
                    else window.SwiftAudioEngine?.Player?.setSleepTimer(val);
                  },
                  style: { background: 'var(--bg)', color: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '4px 6px', fontSize: 11 }
                },
                  h('option', { value: 'off' }, 'Off'),
                  h('option', { value: '15' }, '15 min'),
                  h('option', { value: '30' }, '30 min'),
                  h('option', { value: '45' }, '45 min'),
                  h('option', { value: '60' }, '60 min'),
                  h('option', { value: 'end_of_chapter' }, 'End of Chapter')
                )
              )
            ),

            h('div', { style: { marginTop: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--paper)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('span', null, `Chapters (${audioPlayerState.totalTracks})`),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { fontSize: 11, padding: '3px 8px' },
                  onClick: () => handleOpenAudioDownload && handleOpenAudioDownload(audioPlayerState.currentBook)
                }, '📥 Download MP3s')
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: isPlayerFullscreen ? 360 : 180, overflowY: 'auto' } },
                (audioPlayerState.currentBook.tracks || []).map((t, idx) => {
                  const isCur = idx === audioPlayerState.currentTrackIndex;
                  return h('div', {
                    key: idx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isCur ? 'rgba(99, 102, 241, 0.15)' : 'var(--panel)',
                      border: isCur ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                      cursor: 'pointer'
                    },
                    onClick: () => window.SwiftAudioEngine?.Player?.playTrack(idx)
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                      h('span', { style: { fontSize: 11, color: isCur ? 'var(--accent, #6366f1)' : 'var(--slate)', width: 22, fontWeight: 700 } }, `${idx + 1}`),
                      h('span', { style: { fontSize: 12, color: isCur ? 'var(--accent, #6366f1)' : 'var(--paper)', fontWeight: isCur ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, t.title)
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
                      t.duration && h('span', { style: { fontSize: 11, color: 'var(--slate)', fontFamily: "'IBM Plex Mono', monospace" } }, t.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '3px 6px', fontSize: 11, color: downloadingTrackId === idx ? '#fbbf24' : 'var(--slate)' },
                        title: `Download Track ${idx + 1}: ${t.title}`,
                        disabled: downloadingTrackId === idx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(idx);
                            toast(`Downloading Track ${idx + 1}: "${t.title}"…`, 'info');
                            const fOpts = getNovelFolderOptions ? getNovelFolderOptions(audioPlayerState.currentBook) : {};
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(t, audioPlayerState.currentBook, fOpts);
                            toast(`Downloaded Track ${idx + 1}: "${t.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === idx ? '⏳' : '📥'),
                      isCur && h('span', { style: { fontSize: 11, color: 'var(--accent, #6366f1)' } }, audioPlayerState.isPlaying ? '▶' : '⏸')
                    )
                  );
                })
              )
            )
          )
        )
      ),

      // 3. Background Download Progress Bar
      hasBgDl && h('div', {
        style: {
          position: 'fixed',
          bottom: audioPlayerState?.currentBook ? 122 : 62,
          left: 12,
          right: 12,
          maxWidth: 480,
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 12,
          padding: '10px 14px',
          zIndex: 998,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        },
        onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: false }))
      },
        h('span', { style: { fontSize: 18 } }, '📥'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--paper)' } },
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, audioDownloadModal.status || 'Downloading audio tracks...'),
            h('span', { style: { fontFamily: 'monospace', color: 'var(--accent, #6366f1)', marginLeft: 8 } }, `${audioDownloadModal.percent || 0}%`)
          ),
          h('div', { style: { width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 6 } },
            h('div', { style: { height: '100%', width: `${audioDownloadModal.percent || 0}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
          )
        ),
        h('span', { style: { fontSize: 11, color: 'var(--accent, #6366f1)', fontWeight: 600, flexShrink: 0 } }, 'Expand ↗')
      ),

      // 4. Batch Download Modal
      hasModalDl && h('div', {
        className: 'modal-overlay',
        style: { zIndex: 1050, background: 'rgba(0, 0, 0, 0.85)' },
        onClick: () => {
          if (audioDownloadModal.active) {
            setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }));
          } else {
            setAudioDownloadModal(null);
          }
        }
      },
        h('div', {
          className: 'modal-box',
          style: { maxWidth: 460, width: '92%', maxHeight: '88vh', boxSizing: 'border-box', overflowX: 'hidden' },
          onClick: e => e.stopPropagation()
        },
          h('div', { className: 'modal-hd' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 20 } }, '📥'),
              h('span', { className: 't' }, 'Download Audiobook MP3s')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              audioDownloadModal.active && h('button', {
                type: 'button',
                className: 'mini-btn ghost',
                style: { fontSize: 11, padding: '3px 8px' },
                title: 'Continue downloading in background',
                onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }))
              }, 'Run in Background ─'),
              h('button', {
                type: 'button',
                className: 'x-btn',
                title: audioDownloadModal.active ? 'Run in background' : 'Close',
                onClick: () => {
                  if (audioDownloadModal.active) {
                    setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }));
                  } else {
                    setAudioDownloadModal(null);
                  }
                }
              }, '✕')
            )
          ),
          h('div', { className: 'modal-bd' },
            h('div', { style: { display: 'flex', gap: 12, marginBottom: 12 } },
              audioDownloadModal.book?.cover && h('img', {
                src: audioDownloadModal.book.cover,
                alt: 'Cover',
                referrerPolicy: 'no-referrer',
                onError: (e) => { e.target.style.display = 'none'; },
                style: { width: 56, height: 80, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }
              }),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--paper)' } }, audioDownloadModal.book?.title || 'Audiobook'),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } }, `Total: ${audioDownloadModal.book?.tracks?.length || 0} tracks`),
                h('div', { style: { fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 } }, 'Direct storage stream • Background safe')
              )
            ),

            h('div', { style: { background: 'var(--panel)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--hairline)', marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--slate)' } }, 'SAVE LOCATION'),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  style: { fontSize: 10.5, padding: '2px 6px' },
                  disabled: audioDownloadModal.active,
                  onClick: async () => {
                    if (window.NativeBridge && window.NativeBridge.chooseFolder) {
                      const res = await window.NativeBridge.chooseFolder();
                      if (res && res.treeUri) {
                        setAudioDownloadModal(prev => ({
                          ...prev,
                          folderOptions: { treeUri: res.treeUri, folderPath: res.displayPath }
                        }));
                        toast(`Bound to ${res.displayPath}!`, 'success');
                      }
                    } else {
                      const cur = audioDownloadModal.folderOptions?.folderPath || `Audiobooks/${audioDownloadModal.book?.title}`;
                      const p = window.prompt('Enter folder path for audiobook:', cur);
                      if (p !== null && p.trim()) {
                        setAudioDownloadModal(prev => ({
                          ...prev,
                          folderOptions: { subDir: p.trim(), folderPath: p.trim() }
                        }));
                      }
                    }
                  }
                }, '📁 Change Folder')
              ),
              h('div', { style: { fontSize: 11.5, fontFamily: 'monospace', color: 'var(--paper)', wordBreak: 'break-all' } },
                audioDownloadModal.folderOptions?.folderPath || `Download/GeminiTranslator/Audiobooks/${audioDownloadModal.book?.title}`
              )
            ),

            // Chapter checklist selector
            h('div', { style: { marginBottom: 12 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                h('span', { style: { fontSize: 11.5, fontWeight: 600, color: 'var(--paper)' } },
                  `Select Chapters (${(audioDownloadModal.selectedIndices || []).length}/${audioDownloadModal.book?.tracks?.length || 0})`
                ),
                !audioDownloadModal.active && h('div', { style: { display: 'flex', gap: 6 } },
                  h('button', {
                    type: 'button',
                    className: 'mini-btn ghost',
                    style: { fontSize: 10.5, padding: '2px 6px' },
                    onClick: () => {
                      const allIdx = (audioDownloadModal.book?.tracks || []).map((_, i) => i);
                      const isAll = (audioDownloadModal.selectedIndices || []).length === allIdx.length;
                      setAudioDownloadModal(prev => ({
                        ...prev,
                        selectedIndices: isAll ? [] : allIdx
                      }));
                    }
                  }, (audioDownloadModal.selectedIndices || []).length === (audioDownloadModal.book?.tracks?.length || 0) ? 'Deselect All' : 'Select All')
                )
              ),
              h('div', { style: { maxHeight: 160, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--hairline)', borderRadius: 6, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2 } },
                (audioDownloadModal.book?.tracks || []).map((track, tIdx) => {
                  const isChecked = (audioDownloadModal.selectedIndices || []).includes(tIdx);
                  return h('div', {
                    key: tIdx,
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      borderRadius: 4,
                      background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      fontSize: 11.5
                    }
                  },
                    h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: audioDownloadModal.active ? 'default' : 'pointer', minWidth: 0, flex: 1 } },
                      h('input', {
                        type: 'checkbox',
                        checked: isChecked,
                        disabled: audioDownloadModal.active,
                        onChange: () => {
                          setAudioDownloadModal(prev => {
                            const cur = prev.selectedIndices || [];
                            const next = isChecked ? cur.filter(i => i !== tIdx) : [...cur, tIdx];
                            return { ...prev, selectedIndices: next };
                          });
                        },
                        style: { accentColor: 'var(--accent, #6366f1)', cursor: audioDownloadModal.active ? 'default' : 'pointer' }
                      }),
                      h('span', { style: { color: isChecked ? 'var(--paper)' : 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        `${tIdx + 1}. ${track.title}`
                      )
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 } },
                      track.duration && h('span', { style: { fontSize: 10.5, color: 'var(--slate)', fontFamily: 'monospace' } }, track.duration),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '2px 5px', fontSize: 10.5, color: downloadingTrackId === tIdx ? '#fbbf24' : 'var(--slate)' },
                        title: `Download ${track.title}`,
                        disabled: audioDownloadModal.active || downloadingTrackId === tIdx,
                        onClick: async (e) => {
                          e.stopPropagation();
                          try {
                            setDownloadingTrackId(tIdx);
                            toast(`Downloading "${track.title}"…`, 'info');
                            const fOpts = audioDownloadModal.folderOptions || (getNovelFolderOptions ? getNovelFolderOptions(audioDownloadModal.book) : {});
                            await window.SwiftAudioEngine.Downloader.downloadSingleTrack(track, audioDownloadModal.book, fOpts);
                            toast(`Downloaded "${track.title}"!`, 'success');
                          } catch (err) {
                            toast(`Download failed: ${err.message}`, 'error');
                          } finally {
                            setDownloadingTrackId(null);
                          }
                        }
                      }, downloadingTrackId === tIdx ? '⏳' : '📥')
                    )
                  );
                })
              )
            ),

            h('div', { style: { marginBottom: 8 } },
              h('div', { style: { fontSize: 11.5, color: 'var(--paper-dim)', marginBottom: 4 } }, audioDownloadModal.status || 'Ready'),
              h('div', { style: { width: '100%', height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' } },
                h('div', { style: { height: '100%', width: `${Math.min(100, Math.max(0, audioDownloadModal.percent || 0))}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
              )
            )
          ),
          h('div', { className: 'modal-ft' },
            audioDownloadModal.active ? [
              h('button', {
                key: 'bg',
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
                onClick: () => setAudioDownloadModal(prev => ({ ...prev, isMinimized: true }))
              }, 'Run in Background ─'),
              h('button', {
                key: 'cancel',
                type: 'button',
                className: 'mini-btn danger',
                onClick: () => {
                  window.SwiftAudioEngine?.Downloader?.cancel();
                  toast('Cancelling download…', 'info');
                }
              }, '✕ Cancel Download')
            ] : [
              h('button', {
                key: 'close',
                type: 'button',
                className: 'mini-btn ghost',
                onClick: () => setAudioDownloadModal(null)
              }, 'Close'),
              h('button', {
                key: 'start',
                type: 'button',
                className: 'mini-btn',
                style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 700 },
                onClick: handleExecuteAudioBatchDownload
              }, `⚡ Download Selected (${(audioDownloadModal.selectedIndices || []).length})`)
            ]
          )
        )
      )
    );
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

    return h('div', { className: 'confirm-backdrop', style: { zIndex: 126 }, onClick: () => setDownloadSuccessModal(null) },
      h('div', { className: 'confirm-box', onClick: (e) => e.stopPropagation() },
        h('p', null, 'File Saved Successfully!'),
        h('p', { style: { fontSize: 12, color: 'var(--slate)', textAlign: 'center', wordBreak: 'break-all', marginBottom: 14, fontWeight: 500 } }, downloadSuccessModal.fileName),
        h('div', { className: 'confirm-actions' },
          h('button', { type: 'button', className: 'mini-btn', onClick: () => setDownloadSuccessModal(null) }, 'OK')
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

      // 5. Toasts
      h('div', { className: 'toast-wrap' },
        (props.toasts || []).map(t => h('div', {
          key: t.id,
          className: `toast ${t.type || 'success'}`,
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }
        },
          h('span', { style: { flex: 1 } }, t.msg),
          t.action && h('button', {
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
              if (typeof t.action.onClick === 'function') t.action.onClick();
              if (typeof props.setToasts === 'function') props.setToasts(p => p.filter(item => item.id !== t.id));
            }
          }, t.action.label || 'Undo')
        ))
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
    OngoingEpubContinuationModal,
    SwiftAudioPlayer,
    SourceExtensionsModal,
    ExportToolsSheet,
    ConfirmDialog,
    DownloadSuccessModal,
    EpubPackagingProgressDock,
    AppModalsContainer
  };
}));
