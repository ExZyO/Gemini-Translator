(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root.React);
  } else {
    var api = factory(root.React);
    root.OmniFloatingNav = api;
    root.LiquidGlassDock = api.LiquidGlassDock;
    root.OmniBackStack = api.OmniBackStack;
    if (root.NavigationEngine) {
      root.NavigationEngine.LiquidGlassDock = api.LiquidGlassDock;
      root.NavigationEngine.OmniBackStack = api.OmniBackStack;
    }
  }
}(typeof self !== 'undefined' ? self : this, function (React) {
  'use strict';

  var backHandlers = [];

  var OmniBackStack = {
    push: function (id, fn) {
      if (!id || typeof fn !== 'function') return function () {};
      backHandlers = backHandlers.filter(function (item) { return item.id !== id; });
      backHandlers.push({ id: id, fn: fn });
      return function () { OmniBackStack.remove(id); };
    },
    remove: function (id) {
      backHandlers = backHandlers.filter(function (item) { return item.id !== id; });
    },
    pop: function () {
      for (var i = backHandlers.length - 1; i >= 0; i--) {
        var entry = backHandlers[i];
        try {
          if (entry && typeof entry.fn === 'function' && entry.fn() === true) {
            return true;
          }
        } catch (_) {}
      }
      return false;
    },
    clear: function () {
      backHandlers = [];
    },
    size: function () {
      return backHandlers.length;
    }
  };

  function getHooks() {
    var R = React || (typeof window !== 'undefined' ? window.React : null);
    if (!R) return null;
    return R;
  }

  function OmniLiquidGlassDock(props) {
    var R = getHooks();
    if (!R) return null;
    var h = R.createElement;
    var useState = R.useState;
    var useEffect = R.useEffect;
    var useRef = R.useRef;

    var activeTab = props && props.activeTab ? props.activeTab : 'history';
    var navItems = Array.isArray(props && props.navItems) ? props.navItems : [];
    var onSelectTab = props && props.onSelectTab ? props.onSelectTab : function () {};
    var externalHidden = !!(props && props.hidden);

    var pillRef = useRef(null);
    var _compact = useState(false);
    var isCompact = _compact[0], setIsCompact = _compact[1];

    var _bodyHidden = useState(false);
    var bodyHidden = _bodyHidden[0], setBodyHidden = _bodyHidden[1];

    var _pillW = useState(348);
    var pillW = _pillW[0], setPillW = _pillW[1];

    var _drag = useState({ active: false, thumbLeft: null, hoverIdx: -1 });
    var drag = _drag[0], setDrag = _drag[1];

    var gestureRef = useRef({
      down: false,
      moved: false,
      startX: 0,
      startY: 0,
      pointerId: null,
      hoverIdx: -1
    });

    var lastScrollYRef = useRef(typeof window !== 'undefined' ? (window.scrollY || 0) : 0);

    var count = navItems.length || 5;
    var activeIdx = Math.max(0, navItems.findIndex(function (it) { return it && it[0] === activeTab; }));

    // Track pill geometry cleanly for responsive thumb sizing
    useEffect(function () {
      function measure() {
        if (!pillRef.current) return;
        var rect = pillRef.current.getBoundingClientRect();
        if (rect && rect.width > 40) setPillW(rect.width);
      }
      measure();
      window.addEventListener('resize', measure);
      return function () { window.removeEventListener('resize', measure); };
    }, [count, activeTab]);

    // Scroll-responsive morph (54px <-> 42px) + always expand near top
    useEffect(function () {
      function onScroll() {
        var y = window.scrollY || window.pageYOffset || 0;
        var prev = lastScrollYRef.current;
        var dy = y - prev;
        if (y < 40) {
          setIsCompact(false);
        } else if (dy > 14 && y > 90) {
          setIsCompact(true);
        } else if (dy < -12) {
          setIsCompact(false);
        }
        lastScrollYRef.current = y;
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      return function () { window.removeEventListener('scroll', onScroll); };
    }, []);

    // Expand pill cleanly when switching tabs
    useEffect(function () {
      setIsCompact(false);
    }, [activeTab]);

    // Hide navbar automatically when Multi-Select Dock or Fullscreen Reader is active
    useEffect(function () {
      if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
      function syncBodyFlags() {
        var cl = document.body.classList;
        var hide = cl.contains('is-multi-select') || cl.contains('is-fullscreen-reader') || cl.contains('is-fullscreen-editor');
        setBodyHidden(hide);
      }
      syncBodyFlags();
      var obs = new MutationObserver(syncBodyFlags);
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return function () { obs.disconnect(); };
    }, []);

    var pad = 4;
    var usableW = Math.max(60, pillW - pad * 2);
    var slotW = usableW / count;
    var restingLeft = pad + activeIdx * slotW;
    var thumbLeft = drag.active && drag.thumbLeft !== null ? drag.thumbLeft : restingLeft;

    function clientXToState(clientX) {
      var el = pillRef.current;
      if (!el) return { left: restingLeft, idx: activeIdx };
      var rect = el.getBoundingClientRect();
      var w = rect.width || pillW;
      var innerW = Math.max(60, w - pad * 2);
      var sW = innerW / count;
      var rel = clientX - rect.left - pad;
      var clampedLeft = Math.max(pad, Math.min(pad + (count - 1) * sW, pad + rel - sW * 0.5));
      var idx = Math.max(0, Math.min(count - 1, Math.floor(rel / sW)));
      return { left: clampedLeft, idx: idx };
    }

    function handlePointerDown(e) {
      if (e.button && e.button !== 0) return;
      gestureRef.current = {
        down: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        hoverIdx: activeIdx
      };
    }

    function handlePointerMove(e) {
      var g = gestureRef.current;
      if (!g.down) return;
      var dx = Math.abs(e.clientX - g.startX);
      var dy = Math.abs(e.clientY - g.startY);
      if (!g.moved && dx > 8 && dx >= dy * 0.9) {
        g.moved = true;
        try {
          if (pillRef.current && pillRef.current.setPointerCapture && g.pointerId != null) {
            pillRef.current.setPointerCapture(g.pointerId);
          }
        } catch (err) {}
      }
      if (!g.moved) return;
      var st = clientXToState(e.clientX);
      if (st.idx !== g.hoverIdx) {
        g.hoverIdx = st.idx;
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(4); } catch (err) {}
        }
      }
      setDrag({ active: true, thumbLeft: st.left, hoverIdx: st.idx });
    }

    function finishDrag(commit) {
      var g = gestureRef.current;
      if (!g.down) return;
      var wasMoved = g.moved;
      var finalIdx = g.hoverIdx;
      g.down = false;
      g.moved = false;
      try {
        if (pillRef.current && pillRef.current.releasePointerCapture && g.pointerId != null) {
          pillRef.current.releasePointerCapture(g.pointerId);
        }
      } catch (err) {}
      setDrag({ active: false, thumbLeft: null, hoverIdx: -1 });
      if (commit && wasMoved && finalIdx >= 0 && navItems[finalIdx]) {
        onSelectTab(navItems[finalIdx][0]);
      }
    }

    function handleItemClick(key, idx) {
      if (gestureRef.current.moved) return;
      if (key === activeTab) {
        setIsCompact(false);
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          window.scrollTo(0, 0);
        }
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(4); } catch (err) {}
      }
      onSelectTab(key, idx);
    }

    var isHidden = externalHidden || bodyHidden;
    var highlightedIdx = drag.active && drag.hoverIdx >= 0 ? drag.hoverIdx : activeIdx;

    return h('nav', {
      className: 'omni-nav-wrap' + (isHidden ? ' is-hidden' : ''),
      'aria-label': 'Main navigation'
    },
      h('div', {
        ref: pillRef,
        className: 'omni-nav-pill' + (isCompact ? ' is-compact' : '') + (drag.active ? ' is-dragging' : ''),
        style: { '--nav-count': count },
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: function () { finishDrag(true); },
        onPointerCancel: function () { finishDrag(false); }
      },
        h('div', { className: 'omni-nav-glint', 'aria-hidden': 'true' }),
        h('div', { className: 'omni-nav-sheen', 'aria-hidden': 'true' }),
        h('div', {
          className: 'omni-nav-thumb',
          'aria-hidden': 'true',
          style: {
            width: Math.max(36, slotW) + 'px',
            transform: 'translate3d(' + thumbLeft + 'px, 0, 0)'
          }
        }),
        navItems.map(function (item, idx) {
          var key = item[0];
          var label = item[1];
          var IconComp = item[2];
          var isActive = idx === highlightedIdx;
          return h('button', {
            key: key,
            type: 'button',
            className: 'omni-nav-btn' + (isActive ? ' is-active' : ''),
            'data-nav-tab': key,
            'aria-current': key === activeTab ? 'page' : undefined,
            onClick: function () { handleItemClick(key, idx); }
          },
            h('span', { className: 'omni-nav-icon' },
              typeof IconComp === 'function' ? h(IconComp, { size: isCompact ? 20 : 19 }) : null
            ),
            h('span', { className: 'omni-nav-label' }, label)
          );
        })
      )
    );
  }

  return {
    LiquidGlassDock: OmniLiquidGlassDock,
    OmniFloatingNav: OmniLiquidGlassDock,
    OmniBackStack: OmniBackStack
  };
}));
