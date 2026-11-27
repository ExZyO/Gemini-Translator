(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root.React);
  } else {
    var mod = factory(root.React);
    root.OmniFeedback = mod.OmniFeedback;
    root.OmniQuietStrip = mod.OmniQuietStrip;
    root.OmniInlineStrip = mod.OmniInlineStrip;
  }
}(typeof self !== 'undefined' ? self : this, function (React) {
  'use strict';

  var currentItem = null;
  var lastSaveReady = null;
  var timerId = null;
  var listeners = [];
  var saveListeners = [];
  var seq = 0;

  function cleanText(raw) {
    if (raw === null || raw === undefined) return '';
    var s = String(raw);
    try {
      s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '');
    } catch (_) {
      s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
    }
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](currentItem); } catch (_) {}
    }
  }

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function setItem(item, ms) {
    clearTimer();
    if (!item || !item.msg) {
      currentItem = null;
      emit();
      return;
    }
    seq += 1;
    var duration = typeof ms === 'number' && ms > 0 ? ms : 3400;
    currentItem = Object.assign({ id: seq }, item, { msg: cleanText(item.msg) });
    if (!currentItem.msg) {
      currentItem = null;
      emit();
      return;
    }
    emit();
    var capturedId = currentItem.id;
    timerId = setTimeout(function () {
      if (currentItem && currentItem.id === capturedId) {
        currentItem = null;
        emit();
      }
    }, duration);
  }

  function showUndo(msg, onUndo, ms) {
    setItem({
      kind: 'undo',
      msg: msg,
      isError: false,
      actionLabel: 'Undo',
      onAction: typeof onUndo === 'function' ? onUndo : null
    }, ms || 4500);
  }

  function showError(msg, onRetry, ms) {
    setItem({
      kind: 'error',
      msg: msg,
      isError: true,
      actionLabel: typeof onRetry === 'function' ? 'Retry' : '',
      onAction: typeof onRetry === 'function' ? onRetry : null
    }, ms || 5200);
  }

  function showNotice(msg, ms, actionObj) {
    setItem({
      kind: 'notice',
      msg: msg,
      isError: false,
      actionLabel: actionObj && actionObj.label ? cleanText(actionObj.label) : '',
      onAction: actionObj && typeof actionObj.onClick === 'function' ? actionObj.onClick : null
    }, ms || 2200);
  }

  function dismiss() {
    clearTimer();
    currentItem = null;
    emit();
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    try { fn(currentItem); } catch (_) {}
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  function notifySaveReady(info) {
    if (!info) return;
    lastSaveReady = Object.assign({}, info, {
      fileName: cleanText(info.fileName || 'Document'),
      time: Date.now()
    });
    for (var i = 0; i < saveListeners.length; i++) {
      try { saveListeners[i](lastSaveReady); } catch (_) {}
    }
  }

  function subscribeSaveReady(fn) {
    if (typeof fn !== 'function') return function () {};
    saveListeners.push(fn);
    if (lastSaveReady && (Date.now() - lastSaveReady.time) < 25000) {
      try { fn(lastSaveReady); } catch (_) {}
    }
    return function () {
      saveListeners = saveListeners.filter(function (l) { return l !== fn; });
    };
  }

  function shouldSurfaceToast(msg, type, action, opts) {
    var cleaned = cleanText(msg);
    if (!cleaned) return { show: false };
    if (/cancel(?:led|ed)|abort(?:ed)?/i.test(cleaned)) {
      return { show: false };
    }
    if (/press back again|tap back again/i.test(cleaned)) {
      return { show: true, kind: 'notice', cleanMsg: cleaned, action: null, ms: 2000 };
    }
    if (action && typeof action.onClick === 'function') {
      return { show: true, kind: type === 'error' ? 'error' : 'undo', cleanMsg: cleaned, action: action };
    }
    if (opts && opts.force === true) {
      return { show: true, kind: type === 'error' ? 'error' : 'notice', cleanMsg: cleaned, action: null, ms: opts.ms };
    }
    if (type === 'error' && !(opts && opts.inlineShown)) {
      return { show: true, kind: 'error', cleanMsg: cleaned, action: null };
    }
    return { show: false };
  }

  function OmniQuietStrip() {
    var R = React || (typeof window !== 'undefined' ? window.React : null);
    if (!R) return null;
    var h = R.createElement;
    var state = R.useState(currentItem);
    var item = state[0], setItemState = state[1];

    R.useEffect(function () {
      return subscribe(function (next) {
        setItemState(next ? Object.assign({}, next) : null);
      });
    }, []);

    if (!item || !item.msg) return null;

    var closeIcon = typeof window !== 'undefined' && window.Icons && window.Icons.X
      ? h(window.Icons.X, { size: 14 })
      : null;

    return h('div', {
      className: 'omni-quiet-strip' + (item.isError ? ' is-error' : ''),
      role: 'status',
      'aria-live': 'polite'
    },
      h('span', {
        style: {
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, item.msg),
      item.actionLabel && item.onAction
        ? h('button', {
            type: 'button',
            className: 'omni-quiet-action',
            onClick: function () {
              var fn = item.onAction;
              dismiss();
              try { fn(); } catch (_) {}
            }
          }, item.actionLabel)
        : null,
      h('button', {
        type: 'button',
        className: 'p-icon-btn',
        'aria-label': 'Dismiss notification',
        style: { minWidth: 28, minHeight: 28, padding: 4, color: 'var(--p-muted)' },
        onClick: dismiss
      }, closeIcon || h('span', { style: { fontSize: 13, lineHeight: 1 } }, 'Dismiss'))
    );
  }

  function OmniInlineStrip(props) {
    var R = React || (typeof window !== 'undefined' ? window.React : null);
    if (!R || !props || !props.message) return null;
    var h = R.createElement;
    var variantClass = props.tone === 'error'
      ? ' is-error'
      : (props.tone === 'success' ? ' is-success' : '');

    return h('div', {
      className: 'omni-inline-strip' + variantClass,
      role: props.tone === 'error' ? 'alert' : 'status'
    },
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontWeight: 600, fontSize: 13, lineHeight: 1.3 } }, cleanText(props.message)),
        props.subtext
          ? h('div', { style: { fontSize: 11.5, color: 'var(--p-muted)', marginTop: 2 } }, cleanText(props.subtext))
          : null
      ),
      props.actionLabel && props.onAction
        ? h('button', {
            type: 'button',
            className: 'omni-quiet-action',
            onClick: props.onAction
          }, cleanText(props.actionLabel))
        : null,
      props.onDismiss
        ? h('button', {
            type: 'button',
            className: 'p-icon-btn',
            'aria-label': 'Dismiss',
            style: { minWidth: 28, minHeight: 28, color: 'var(--p-muted)' },
            onClick: props.onDismiss
          }, typeof window !== 'undefined' && window.Icons && window.Icons.X ? h(window.Icons.X, { size: 14 }) : null)
        : null
    );
  }

  return {
    OmniFeedback: {
      cleanText: cleanText,
      showUndo: showUndo,
      showError: showError,
      showNotice: showNotice,
      dismiss: dismiss,
      subscribe: subscribe,
      notifySaveReady: notifySaveReady,
      subscribeSaveReady: subscribeSaveReady,
      getLastSaveReady: function () { return lastSaveReady; },
      shouldSurfaceToast: shouldSurfaceToast,
      getCurrent: function () { return currentItem; }
    },
    OmniQuietStrip: OmniQuietStrip,
    OmniInlineStrip: OmniInlineStrip
  };
}));
