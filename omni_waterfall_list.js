(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root.React);
  } else {
    var api = factory(root.React);
    root.OmniWaterfallList = api.OmniWaterfallList;
    root.FallbackWaterfallStore = api.FallbackWaterfallStore;
  }
}(typeof self !== 'undefined' ? self : this, function (React) {
  'use strict';

  var STORAGE_KEY = 'omni_fallback_waterfall';
  var LEGACY_KEYS = ['fallback_models', 'fallbackModels'];

  var DEFAULT_MODELS = [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', desc: 'Ultra fast primary fallback', enabled: true, custom: false },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', desc: 'Highest free quota failover', enabled: true, custom: false },
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'Legacy preview failover', enabled: false, custom: false },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Flagship hybrid fast fallback', enabled: false, custom: false },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: 'Official flagship high-quota fallback', enabled: false, custom: false },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: 'High-quota lightweight model', enabled: false, custom: false },
    { id: 'deepseek-chat', name: 'DeepSeek V3 / V4 Chat', desc: 'Cross-provider failover (needs DeepSeek key)', enabled: false, custom: false },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 / V4 Pro', desc: 'Reasoning fallback for heavy idioms', enabled: false, custom: false }
  ];

  function inferModelMeta(id) {
    for (var i = 0; i < DEFAULT_MODELS.length; i++) {
      if (DEFAULT_MODELS[i].id === id) return DEFAULT_MODELS[i];
    }
    return {
      id: id,
      name: id,
      desc: 'Custom fallback endpoint',
      enabled: true,
      custom: true
    };
  }

  function cloneDefaults() {
    return DEFAULT_MODELS.map(function (m) { return Object.assign({}, m); });
  }

  function sanitizeList(rawList) {
    if (!Array.isArray(rawList) || rawList.length === 0) return cloneDefaults();
    var seen = {};
    var out = [];
    for (var i = 0; i < rawList.length; i++) {
      var item = rawList[i];
      var id = typeof item === 'string' ? item.trim() : String((item && item.id) || '').trim();
      if (!id || seen[id]) continue;
      seen[id] = true;
      var meta = inferModelMeta(id);
      out.push({
        id: id,
        name: (item && item.name) ? String(item.name) : meta.name,
        desc: (item && item.desc) ? String(item.desc) : meta.desc,
        enabled: (item && typeof item.enabled === 'boolean') ? item.enabled : true,
        custom: (item && typeof item.custom === 'boolean') ? item.custom : meta.custom
      });
    }
    for (var d = 0; d < DEFAULT_MODELS.length; d++) {
      var def = DEFAULT_MODELS[d];
      if (!seen[def.id]) {
        seen[def.id] = true;
        out.push(Object.assign({}, def, { enabled: false }));
      }
    }
    return out;
  }

  function load(fallbackModels) {
    try {
      var savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        var parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeList(parsed);
        }
      }
    } catch (_) {}

    if (Array.isArray(fallbackModels) && fallbackModels.length > 0) {
      return sanitizeList(fallbackModels);
    }

    for (var k = 0; k < LEGACY_KEYS.length; k++) {
      try {
        var raw = localStorage.getItem(LEGACY_KEYS[k]);
        if (raw) {
          var arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) return sanitizeList(arr);
        }
      } catch (_) {}
    }

    return cloneDefaults();
  }

  function getEnabledIds(list) {
    var safe = Array.isArray(list) ? list : [];
    var ids = [];
    for (var i = 0; i < safe.length; i++) {
      if (safe[i] && safe[i].enabled && safe[i].id) {
        ids.push(safe[i].id);
      }
    }
    return ids;
  }

  function save(list, setFallbackModels) {
    var sanitized = sanitizeList(list);
    var enabledIds = getEnabledIds(sanitized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      localStorage.setItem('fallback_models', JSON.stringify(enabledIds));
      localStorage.setItem('fallbackModels', JSON.stringify(enabledIds));
    } catch (_) {}
    if (typeof setFallbackModels === 'function') {
      setFallbackModels(enabledIds);
    }
    return sanitized;
  }

  function reset(setFallbackModels) {
    return save(cloneDefaults(), setFallbackModels);
  }

  function arrayMove(arr, from, to) {
    var next = arr.slice();
    var moved = next.splice(from, 1)[0];
    next.splice(to, 0, moved);
    return next;
  }

  function getSlotTop(list, idx, heights) {
    var y = 0;
    for (var i = 0; i < idx && i < list.length; i++) {
      y += heights[list[i].id] || 62;
    }
    return y;
  }

  function OmniWaterfallList(props) {
    var R = React || (typeof window !== 'undefined' ? window.React : null);
    if (!R) return null;
    var h = R.createElement;
    var useState = R.useState;
    var useEffect = R.useEffect;
    var useLayoutEffect = R.useLayoutEffect || R.useEffect;
    var useRef = R.useRef;
    var ic = (typeof window !== 'undefined' && window.ic) || function () { return null; };

    var fallbackModels = props && props.fallbackModels;
    var setFallbackModels = props && props.setFallbackModels;
    var externalOnReset = props && props.onReset;

    var _items = useState(function () { return load(fallbackModels); });
    var items = _items[0], setItems = _items[1];

    var _customInput = useState('');
    var customInput = _customInput[0], setCustomInput = _customInput[1];

    var _dragUi = useState({ active: false, dragId: null });
    var dragUi = _dragUi[0], setDragUi = _dragUi[1];

    var _statusMsg = useState('');
    var statusMsg = _statusMsg[0], setStatusMsg = _statusMsg[1];

    var listRef = useRef(null);
    var rowRefs = useRef({});
    var beforeTopsRef = useRef(null);
    var dragRef = useRef({
      active: false,
      dragId: null,
      pointerId: null,
      startY: 0,
      lastDy: 0,
      minDy: 0,
      maxDy: 0,
      origOffsetInList: 0,
      origHeight: 62,
      rowHeights: {},
      itemsSnap: []
    });

    dragRef.current.itemsSnap = items;

    useEffect(function () {
      if (dragRef.current.active) return;
      var currentIds = getEnabledIds(items).join('|');
      var propIds = Array.isArray(fallbackModels) ? fallbackModels.join('|') : '';
      if (propIds && propIds !== currentIds) {
        setItems(load(fallbackModels));
      }
    }, [Array.isArray(fallbackModels) ? fallbackModels.join('|') : '']);

    // Deterministic FLIP sibling transitions + zero-jump finger lock on dragged row
    useLayoutEffect(function () {
      var prevTops = beforeTopsRef.current;
      if (!prevTops) return;
      beforeTopsRef.current = null;

      var movedEls = [];
      var st = dragRef.current;

      for (var i = 0; i < items.length; i++) {
        var id = items[i].id;
        var el = rowRefs.current[id];
        if (!el || prevTops[id] === undefined) continue;
        if (id === st.dragId && st.active) {
          var dragTopInList = st.origOffsetInList + st.lastDy;
          var visualTranslateY = dragTopInList - getSlotTop(items, i, st.rowHeights);
          el.style.transition = 'none';
          el.style.transform = 'translate3d(0, ' + visualTranslateY + 'px, 0) scale(1.015)';
          continue;
        }
        var nowRect = el.getBoundingClientRect();
        var delta = prevTops[id] - nowRect.top;
        if (Math.abs(delta) > 0.5) {
          el.style.transition = 'none';
          el.style.transform = 'translate3d(0, ' + delta + 'px, 0)';
          movedEls.push(el);
        }
      }

      if (movedEls.length > 0 && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            for (var j = 0; j < movedEls.length; j++) {
              var mEl = movedEls[j];
              mEl.style.transition = 'transform 190ms cubic-bezier(0.22, 1, 0.36, 1)';
              mEl.style.transform = 'translate3d(0, 0, 0)';
            }
          });
        });
      }
    }, [items]);

    function commitItems(nextList) {
      var saved = save(nextList, setFallbackModels);
      setItems(saved);
      return saved;
    }

    function toggleEnabled(id, e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      var next = items.map(function (it) {
        return it.id === id ? Object.assign({}, it, { enabled: !it.enabled }) : it;
      });
      commitItems(next);
    }

    function removeCustom(id, e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      var next = items.filter(function (it) { return it.id !== id; });
      commitItems(next);
    }

    function handleAddCustom(e) {
      if (e && e.preventDefault) e.preventDefault();
      var cleaned = String(customInput || '').trim();
      if (!cleaned) return;
      if (items.some(function (it) { return it.id.toLowerCase() === cleaned.toLowerCase(); })) {
        setStatusMsg('Already in waterfall list');
        setTimeout(function () { setStatusMsg(''); }, 1800);
        return;
      }
      var next = items.concat([inferModelMeta(cleaned)]);
      commitItems(next);
      setCustomInput('');
      setStatusMsg('Added ' + cleaned);
      setTimeout(function () { setStatusMsg(''); }, 1800);
    }

    function handleReset() {
      var saved = reset(setFallbackModels);
      setItems(saved);
      if (typeof externalOnReset === 'function') externalOnReset(saved);
      setStatusMsg('Restored default priority');
      setTimeout(function () { setStatusMsg(''); }, 1800);
    }

    function cleanupListeners() {
      if (typeof window === 'undefined') return;
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowEnd);
      window.removeEventListener('pointercancel', onWindowEnd);
    }

    function snapshotTops(currentList) {
      var tops = {};
      for (var i = 0; i < currentList.length; i++) {
        var id = currentList[i].id;
        var el = rowRefs.current[id];
        if (el) tops[id] = el.getBoundingClientRect().top;
      }
      return tops;
    }

    function onWindowMove(moveEvt) {
      var st = dragRef.current;
      if (!st.active) return;
      if (moveEvt.cancelable) moveEvt.preventDefault();

      var list = st.itemsSnap;
      var dragIdx = -1;
      for (var k = 0; k < list.length; k++) {
        if (list[k].id === st.dragId) { dragIdx = k; break; }
      }
      if (dragIdx < 0) return;

      var rawDy = moveEvt.clientY - st.startY;
      var dy = Math.max(st.minDy, Math.min(st.maxDy, rawDy));
      st.lastDy = dy;

      var dragTopInList = st.origOffsetInList + dy;
      var dragCenterInList = dragTopInList + st.origHeight * 0.5;
      var slotTop = getSlotTop(list, dragIdx, st.rowHeights);
      var visualTranslateY = dragTopInList - slotTop;

      var draggedEl = rowRefs.current[st.dragId];
      if (draggedEl) {
        draggedEl.style.transition = 'none';
        draggedEl.style.transform = 'translate3d(0, ' + visualTranslateY + 'px, 0) scale(1.015)';
      }

      // Evaluate sibling midpoints using deterministic resting slot centers in list coords (zero FLIP feedback loop)
      var nextIdx = dragIdx;
      if (dragIdx > 0) {
        var aboveH = st.rowHeights[list[dragIdx - 1].id] || 62;
        var aboveCenter = getSlotTop(list, dragIdx - 1, st.rowHeights) + aboveH * 0.5;
        if (dragCenterInList < aboveCenter) {
          nextIdx = dragIdx - 1;
        }
      }
      if (nextIdx === dragIdx && dragIdx < list.length - 1) {
        var belowH = st.rowHeights[list[dragIdx + 1].id] || 62;
        var belowCenter = getSlotTop(list, dragIdx + 1, st.rowHeights) + belowH * 0.5;
        if (dragCenterInList > belowCenter) {
          nextIdx = dragIdx + 1;
        }
      }

      if (nextIdx !== dragIdx) {
        beforeTopsRef.current = snapshotTops(list);
        var reordered = arrayMove(list, dragIdx, nextIdx);
        st.itemsSnap = reordered;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(4); } catch (_) {}
        }
        setItems(reordered);
      }
    }

    function onWindowEnd() {
      var st = dragRef.current;
      if (!st.active) return;
      st.active = false;
      cleanupListeners();
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = '';
      }
      for (var i = 0; i < st.itemsSnap.length; i++) {
        var el = rowRefs.current[st.itemsSnap[i].id];
        if (el) {
          el.style.transition = '';
          el.style.transform = '';
        }
      }
      commitItems(st.itemsSnap);
      setDragUi({ active: false, dragId: null });
    }

    useEffect(function () {
      return function () {
        cleanupListeners();
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.overflow = '';
        }
      };
    }, []);

    function handleStartDrag(idx, e) {
      if (dragRef.current.active) return;
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      var list = items;
      var item = list[idx];
      if (!item) return;
      var el = rowRefs.current[item.id];
      var listEl = listRef.current;
      if (!el || !listEl) return;

      var listRect = listEl.getBoundingClientRect();
      var lastEl = rowRefs.current[list[list.length - 1].id];
      var lastRect = lastEl ? lastEl.getBoundingClientRect() : el.getBoundingClientRect();
      var origRect = el.getBoundingClientRect();
      var origOffset = origRect.top - listRect.top;
      var listHeight = lastRect.bottom - listRect.top;

      var heights = {};
      for (var i = 0; i < list.length; i++) {
        var rEl = rowRefs.current[list[i].id];
        heights[list[i].id] = rEl ? (rEl.getBoundingClientRect().height || 62) : 62;
      }

      dragRef.current = {
        active: true,
        dragId: item.id,
        pointerId: e.pointerId,
        startY: e.clientY,
        lastDy: 0,
        minDy: -origOffset,
        maxDy: Math.max(0, listHeight - (origOffset + origRect.height)),
        origOffsetInList: origOffset,
        origHeight: origRect.height || 62,
        rowHeights: heights,
        itemsSnap: list
      };

      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = 'hidden';
      }
      setDragUi({ active: true, dragId: item.id });

      if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', onWindowMove, { passive: false });
        window.addEventListener('pointerup', onWindowEnd);
        window.addEventListener('pointercancel', onWindowEnd);
      }
    }

    var rankMap = {};
    var rankCounter = 0;
    for (var r = 0; r < items.length; r++) {
      if (items[r].enabled) {
        rankCounter += 1;
        rankMap[items[r].id] = rankCounter;
      }
    }

    var activeDragIdx = -1;
    if (dragUi.active && dragUi.dragId) {
      for (var di = 0; di < items.length; di++) {
        if (items[di].id === dragUi.dragId) { activeDragIdx = di; break; }
      }
    }

    return h('div', null,
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 6px' } },
        h('div', { style: { fontSize: 12.5, color: 'var(--p-muted)' } },
          rankCounter + ' active • drag handle to reorder'
        ),
        h('button', {
          type: 'button',
          className: 'p-pill-btn',
          style: { height: 28, fontSize: 11.5, padding: '0 10px' },
          onClick: handleReset
        }, ic('RotateCcw', 12), 'Reset')
      ),

      h('div', { className: 'wf-list', ref: listRef },
        items.map(function (item, idx) {
          var rank = rankMap[item.id] || 0;
          var isDragging = dragUi.active && dragUi.dragId === item.id;
          var hideDivider = activeDragIdx > 0 && idx === activeDragIdx - 1;
          return h('div', {
            key: item.id,
            ref: function (node) {
              if (node) rowRefs.current[item.id] = node;
              else delete rowRefs.current[item.id];
            },
            className: 'wf-row' + (isDragging ? ' dragging' : '') + (hideDivider ? ' no-divider' : '') + (!item.enabled ? ' is-disabled' : '')
          },
            h('button', {
              type: 'button',
              className: 'wf-handle',
              'aria-label': 'Drag to reorder ' + item.name,
              onPointerDown: function (e) { handleStartDrag(idx, e); }
            }, ic(window.GripVertical || window.Menu || 'Menu', 18)),

            h('span', { className: 'wf-badge' + (!item.enabled ? ' is-off' : '') },
              item.enabled ? ('#' + rank) : 'OFF'
            ),

            h('div', { className: 'wf-body' },
              h('div', { className: 'wf-name' }, item.name),
              h('div', { className: 'wf-desc' }, item.desc || item.id)
            ),

            item.custom && h('button', {
              type: 'button',
              className: 'p-icon-btn',
              'aria-label': 'Remove custom model',
              style: { color: '#FCA5A5', minWidth: 34, minHeight: 34 },
              onPointerDown: function (e) { e.stopPropagation(); },
              onClick: function (e) { removeCustom(item.id, e); }
            }, ic('Trash2', 15)),

            h('button', {
              type: 'button',
              className: 'p-icon-btn' + (item.enabled ? ' is-active' : ''),
              'aria-label': (item.enabled ? 'Pause ' : 'Enable ') + item.name,
              'aria-pressed': !!item.enabled,
              onPointerDown: function (e) { e.stopPropagation(); },
              onClick: function (e) { toggleEnabled(item.id, e); }
            }, ic(item.enabled ? (window.Eye || 'Eye') : (window.EyeOff || 'EyeOff'), 17))
          );
        })
      ),

      h('form', {
        onSubmit: handleAddCustom,
        style: { display: 'flex', gap: 8, padding: '12px 16px 4px', alignItems: 'center' }
      },
        h('input', {
          type: 'text',
          className: 'p-input',
          style: { flex: 1, height: 40, padding: '8px 12px', fontSize: 13.5 },
          placeholder: 'Add custom model ID (e.g. gemini-3.8-flash)',
          value: customInput,
          onChange: function (e) { setCustomInput(e.target.value); }
        }),
        h('button', {
          type: 'submit',
          className: 'p-pill-btn is-primary',
          style: { height: 40, padding: '0 16px', flexShrink: 0 }
        }, 'Add')
      ),

      statusMsg && h('div', {
        style: { padding: '6px 16px 2px', fontSize: 12, color: 'var(--p-accent)', fontWeight: 600 }
      }, statusMsg)
    );
  }

  return {
    OmniWaterfallList: OmniWaterfallList,
    FallbackWaterfallStore: {
      load: load,
      save: save,
      reset: reset,
      getEnabledIds: getEnabledIds,
      DEFAULT_MODELS: DEFAULT_MODELS
    }
  };
}));
