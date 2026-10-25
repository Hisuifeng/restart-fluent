/* ==========================================================================
   restart-fluent · fluent.js
   明暗 / 主题色 / 紧凑 / 光效偏好，侧栏抽屉，Fluent Reveal 与方向性按压。

   原则：
   - 所有偏好只写 localStorage，不改构建产物；
   - 触摸与键盘用户不应被光效干扰，reduced-motion 下不启用；
   - 任何一步失败都不能影响阅读与导航。
   ========================================================================== */
(function () {
	'use strict';

	var root = document.documentElement;
	var body = document.body;
	var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function read(key) {
		try { return localStorage.getItem(key); } catch (e) { return null; }
	}

	function write(key, value) {
		try { localStorage.setItem(key, value); } catch (e) { /* 隐私模式忽略 */ }
	}

	function remove(key) {
		try { localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
	}

	function setPressed(el, on) {
		if (!el) return;
		el.classList.toggle('on', !!on);
		el.setAttribute('aria-checked', on ? 'true' : 'false');
	}

	/* ---------- 明暗：跟随系统 / 浅色 / 深色 ---------- */
	var metaTheme = document.querySelector('meta[name="theme-color"]');
	var themeModeBtns = Array.prototype.slice.call(document.querySelectorAll('[data-theme-mode]'));
	var systemLight = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

	var savedTheme = read('restart-fluent:theme');
	var themeMode = (savedTheme === 'auto' || savedTheme === 'light' || savedTheme === 'dark')
		? savedTheme
		: (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

	function systemTheme() {
		return systemLight && systemLight.matches ? 'light' : 'dark';
	}

	function syncThemeUi() {
		var actual = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
		themeModeBtns.forEach(function (btn) {
			var on = btn.getAttribute('data-theme-mode') === themeMode;
			btn.classList.toggle('is-active', on);
			btn.setAttribute('aria-pressed', on ? 'true' : 'false');
		});
		if (metaTheme) {
			metaTheme.setAttribute('content', actual === 'light' ? '#eef4fb' : '#06101f');
		}
	}

	function applyThemeMode(mode, persist) {
		if (mode !== 'auto' && mode !== 'light' && mode !== 'dark') return;
		themeMode = mode;
		root.setAttribute('data-theme', mode === 'auto' ? systemTheme() : mode);
		if (persist) write('restart-fluent:theme', mode);
		syncThemeUi();
	}

	themeModeBtns.forEach(function (btn) {
		btn.addEventListener('click', function () {
			applyThemeMode(btn.getAttribute('data-theme-mode'), true);
		});
	});

	if (systemLight) {
		var onSystemThemeChange = function () {
			if (themeMode === 'auto') applyThemeMode('auto', false);
		};
		if (systemLight.addEventListener) systemLight.addEventListener('change', onSystemThemeChange);
		else if (systemLight.addListener) systemLight.addListener(onSystemThemeChange);
	}

	applyThemeMode(themeMode, false);

	/* ---------- 侧栏当前项（pjax 换页后也要重算） ---------- */
	function markNav(pathname) {
		var here = (pathname || location.pathname).replace(/\/+$/, '') || '/';
		/* 站点根路径：取顶栏返回键的 data-home（即 url_for('/')），
		   不在 JS 里硬编码，换域名/根路径时模板会自动带对。 */
		var dashBack = document.getElementById('dash-back');
		var rootPath = ((dashBack && dashBack.getAttribute('data-home')) || '/')
			.replace(/\/+$/, '') || '/';
		Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (a) {
			var href = a.getAttribute('href') || '';
			if (href.charAt(0) !== '/' || href.charAt(1) === '/') return;
			var target = href.replace(/\/+$/, '') || '/';
			var hit;
			if (target === rootPath) {
			/* 首页项：只认根路径本身与分页，绝不能前缀匹配——
			   否则根路径下的所有子页面都会把首页按钮点亮。 */
				var pagePrefix = rootPath === '/' ? '/page/' : rootPath + '/page/';
				hit = here === rootPath
					|| here === rootPath + '/index.html'
					|| here.indexOf(pagePrefix) === 0;
			} else {
				hit = here === target || here === target + '.html' || here.indexOf(target + '/') === 0;
			}
			a.classList.toggle('active', hit);
			if (hit) a.setAttribute('aria-current', 'page');
			else a.removeAttribute('aria-current');
		});
	}
	markNav();
	window.__restartMarkNav = markNav;

	/* ---------- 主题色 ---------- */
	var swatches = Array.prototype.slice.call(document.querySelectorAll('[data-accent]'));

	function applyAccent(color, persist) {
		if (!/^#[0-9a-f]{6}$/i.test(color || '')) return;
		root.style.setProperty('--accent', color);
		swatches.forEach(function (sw) {
			var on = sw.getAttribute('data-accent').toLowerCase() === color.toLowerCase();
			sw.classList.toggle('active', on);
			sw.setAttribute('aria-pressed', on ? 'true' : 'false');
		});
		if (persist) write('restart-fluent:accent', color);
	}

	swatches.forEach(function (sw) {
		sw.addEventListener('click', function () {
			applyAccent(sw.getAttribute('data-accent'), true);
		});
	});

	var savedAccent = read('restart-fluent:accent');
	if (savedAccent) applyAccent(savedAccent, false);

	/* ---------- 紧凑 / 光效 ---------- */
	var compactSwitch = document.querySelector('[data-toggle="compact"]');
	var effectsSwitch = document.querySelector('[data-toggle="effects"]');

	function syncPreferenceUi() {
		setPressed(compactSwitch, root.classList.contains('is-compact'));
		setPressed(effectsSwitch, !root.classList.contains('no-effects'));
	}

	if (compactSwitch) {
		compactSwitch.addEventListener('click', function () {
			var on = !root.classList.contains('is-compact');
			root.classList.toggle('is-compact', on);
			write('restart-fluent:compact', on ? '1' : '0');
			syncPreferenceUi();
		});
	}

	if (effectsSwitch) {
		effectsSwitch.addEventListener('click', function () {
			var on = root.classList.toggle('no-effects');
			write('restart-fluent:effects', on ? '0' : '1');
			syncPreferenceUi();
			if (!on) initEffects();
			updateEdgeLight();
		});
	}

	syncPreferenceUi();

	/* ---------- 侧栏折叠 ---------- */
	var dashToggle = document.getElementById('dash-toggle');

	function syncDashToggle() {
		if (!dashToggle) return;
		var collapsed = root.classList.contains('dash-collapsed');
		var label = collapsed ? '展开侧栏' : '折叠侧栏';
		dashToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
		dashToggle.setAttribute('aria-label', label);
		dashToggle.setAttribute('title', label);
	}

	if (dashToggle) {
		dashToggle.addEventListener('click', function () {
			var collapsed = root.classList.toggle('dash-collapsed');
			write('restart-fluent:sidebar', collapsed ? '1' : '0');
			syncDashToggle();

			/* 展开时栏宽还在 56px → 260px 过渡，外观区此时布局会把色板挤成两行；
			   先标记 expanding，CSS 把它藏到宽度到位再淡入。 */
			if (!collapsed) {
				root.classList.add('dash-expanding');
				window.setTimeout(function () {
					root.classList.remove('dash-expanding');
				}, 220);
			}

			window.setTimeout(scheduleEdgeUpdate, 220);
		});
	}
	syncDashToggle();

	/* ---------- 返回上一页 ----------
	   走 history.back()，pjax 的 popstate 会把换页方向标成 back，
	   于是新页面从左往右推入。没有站内历史的（直接打开/收藏进入）回首页。 */
	var dashBack = document.getElementById('dash-back');
	if (dashBack) {
		dashBack.addEventListener('click', function () {
			var home = dashBack.getAttribute('data-home') || '/';
			var fromSite = false;
			try {
				fromSite = !!document.referrer && new URL(document.referrer).origin === location.origin;
			} catch (err) { fromSite = false; }
			if (history.state || fromSite) history.back();
			else location.href = home;
		});
	}

	/* 折叠态的搜索按钮：先展开，再把焦点交给输入框 */
	var dashSearchBtn = document.getElementById('dash-search-btn');
	if (dashSearchBtn) {
		dashSearchBtn.addEventListener('click', function () {
			if (root.classList.contains('dash-collapsed')) {
				root.classList.remove('dash-collapsed');
				write('restart-fluent:sidebar', '0');
				syncDashToggle();
				root.classList.add('dash-expanding');
				window.setTimeout(function () {
					root.classList.remove('dash-expanding');
				}, 220);
				window.setTimeout(scheduleEdgeUpdate, 240);
			}
			window.setTimeout(function () {
				var input = document.getElementById('side-search-input');
				if (!input) return;
				input.focus();
				if (input.select) input.select();
			}, 260);
		});
	}

	/* ---------- 首页视图 ---------- */
	var viewButtons = [];
	var postList = null;

	function applyView(view, persist) {
		if (view !== 'grid' && view !== 'list') return;
		if (postList) postList.classList.toggle('list-view', view === 'list');
		viewButtons.forEach(function (btn) {
			var on = btn.getAttribute('data-view') === view;
			btn.classList.toggle('is-active', on);
			btn.setAttribute('aria-pressed', on ? 'true' : 'false');
		});
		if (persist) write('restart-fluent:view', view);
	}

	function initViewControls() {
		viewButtons = Array.prototype.slice.call(document.querySelectorAll('[data-view]'));
		postList = document.getElementById('post-list');

		viewButtons.forEach(function (btn) {
			if (btn.dataset.viewBound) return;
			btn.dataset.viewBound = '1';
			btn.addEventListener('click', function () {
				applyView(btn.getAttribute('data-view'), true);
			});
		});

		var savedView = read('restart-fluent:view');
		if (savedView && viewButtons.length) applyView(savedView, false);
	}

	initViewControls();

	/* ---------- 侧栏抽屉（≤900px） ---------- */
	var app = document.getElementById('app');
	var scrim = document.getElementById('scrim');
	var sidebar = document.getElementById('sidebar');

	function drawerOpen() {
		return !!(app && app.classList.contains('drawer-open'));
	}

	function setDrawer(open) {
		if (!app) return;
		app.classList.toggle('drawer-open', open);
		if (scrim) {
			scrim.hidden = !open;
			/* 让 opacity 过渡有机会从 0 开始 */
			requestAnimationFrame(function () {
				scrim.classList.toggle('is-open', open);
			});
		}
		var btn = document.getElementById('drawer-btn');
		if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		body.classList.toggle('drawer-locked', open);
		if (open && sidebar) {
			window.setTimeout(function () { sidebar.focus(); }, 230);
		} else if (!open && btn) {
			btn.focus();
		}
	}

	/* 抽屉按钮随 pjax 换页重建，用委托而不是一次性绑定 */
	document.addEventListener('click', function (e) {
		var btn = e.target && e.target.closest ? e.target.closest('#drawer-btn') : null;
		if (!btn) return;
		e.preventDefault();
		setDrawer(!drawerOpen());
	});
	if (scrim) {
		scrim.addEventListener('click', function () { setDrawer(false); });
	}
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && drawerOpen()) setDrawer(false);
	});
	if (sidebar) {
		sidebar.addEventListener('click', function (e) {
			if (window.innerWidth <= 900 && e.target.closest('a')) setDrawer(false);
		});
	}
	var resizeTimer;
	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function () {
			if (window.innerWidth > 900 && drawerOpen()) setDrawer(false);
			scheduleEdgeUpdate();
		}, 120);
	});

	/* ---------- 回到顶部 ---------- */
	var toTop = document.getElementById('to-top');
	var scrollTicking = false;

	function onScroll() {
		if (toTop) toTop.classList.toggle('show', window.scrollY > 320);
		scrollTicking = false;
	}

	if (toTop) {
		toTop.addEventListener('click', function () {
			window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
		});
	}

	window.addEventListener('scroll', function () {
		if (!scrollTicking) {
			requestAnimationFrame(onScroll);
			scrollTicking = true;
		}
	}, { passive: true });
	onScroll();

	/* ---------- Fluent Reveal + 边缘光 + 按压 ---------- */
	var revealEls = [];
	var pointerX = null;
	var pointerY = null;
	var rafPending = false;
	var edgeThreshold = 26;
	var effectsBound = false;

	function effectsEnabled() {
		return !root.classList.contains('no-effects') && !reduceMotion;
	}

	function buildReveal() {
		Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
			if (!el.querySelector(':scope > .edge-glow')) {
				var glow = document.createElement('span');
				glow.className = 'edge-glow';
				glow.setAttribute('aria-hidden', 'true');
				el.appendChild(glow);
			}
			if (revealEls.indexOf(el) === -1) revealEls.push(el);
		});
	}

	function bindReveal() {
		Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
			if (el.dataset.revealBound) return;
			el.dataset.revealBound = '1';
			el.addEventListener('pointermove', function (e) {
				var r = el.getBoundingClientRect();
				el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
				el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
			}, { passive: true });
		});
	}

	function pressTargets() {
		return document.querySelectorAll(
			'.btn, .icon-btn, .theme-mode, .chip, .seg-btn, ' +
			'.nav-item, .home-more, .pager-btn, .to-top, .tag, .cat-links a, ' +
			'.topnav-menu, .dash-toggle, .side-social a, .code-copy, .code-fold, ' +
			'.code-folder, .viewer-btn, .viewer-close, .share-btn, .archive-item, ' +
			'.player-main, .player-ctrl, .player-mute, .player-fold, ' +
			'.music-play, .cal-day, .cal-bar, .cal-step, .cal-title, ' +
			'.cal-posts a, .post-nav-item, .term-card, .friend-card, ' +
			'.post-card, .featured, .ghcard, .hero-nav, .hero-dot, ' +
			'.tk-button:not(.tk-button--text), .tk-expand, ' +
			'.tk-action-link, .tk-sort-item, .tk-comments-title .tk-icon.__comments, ' +
			'.tk-pagination-pager, .tk-submit-action-icon'
		);
	}

	function releasePress(el) {
		if (!el.classList.contains('pressing')) return;
		el.classList.remove('pressing');
		window.setTimeout(scheduleEdgeUpdate, 340);
	}

	/* 卡片只要 Reveal 光效，不要按压缩放 */
	function cardTargets() {
		return document.querySelectorAll(
			'.side-card, .post-card, .featured, .page-card, .about-card, .about-profile, ' +
			'.search-panel, .notfound, .empty-state, .toc-box, .share-poster, ' +
			'.music-card, .countdown, .ghcard, .term-card, ' +
			'.friend-card, .cal-card, .player, .home-hero, .hero-post, ' +
			'.archive-stats, .tk-comments-container > .tk-comment'
		);
	}

	function markCardReveals() {
		Array.prototype.forEach.call(cardTargets(), function (el) {
			el.classList.add('reveal');
		});
	}

	function bindPress() {
		Array.prototype.forEach.call(pressTargets(), function (el) {
			if (el.dataset.pressBound) return;
			el.dataset.pressBound = '1';
			/* 所有可点击控件都拿到 Reveal 内部高光与边缘光；
			   .post-card / .featured / .nav-item 在模板里已经带了 reveal。 */
			el.classList.add('pressable', 'reveal');

			el.addEventListener('pointerdown', function (e) {
				if (e.button !== 0 || !effectsEnabled()) return;
				/* 拖音乐卡/播放器滑块时不要触发外层的磁贴按压 */
				if (e.target.closest && e.target.closest('.music-bar, .player-bar')) return;
				var r = el.getBoundingClientRect();
				if (!r.width || !r.height) return;

				el.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
				el.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');

				var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
				var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
				el.style.setProperty('--px', (-nx * 4).toFixed(2) + 'px');
				el.style.setProperty('--py', (-ny * 4).toFixed(2) + 'px');
				/* 方向性倾斜：点左侧向左倾，点右侧向右倾 */
				el.style.setProperty('--rx', (nx * 2.2).toFixed(2) + 'deg');
				el.style.setProperty('--ry', (ny * 2.2).toFixed(2) + 'deg');
				el.classList.add('pressing');
			});

			el.addEventListener('pointerup', function () { releasePress(el); });
			el.addEventListener('pointerleave', function () { releasePress(el); });
			el.addEventListener('pointercancel', function () { releasePress(el); });
		});
	}

	function scheduleEdgeUpdate() {
		if (rafPending) return;
		rafPending = true;
		requestAnimationFrame(function () {
			rafPending = false;
			updateEdgeLight();
		});
	}

	function updateEdgeLight() {
		if (!revealEls.length) return;
		var disabled = !effectsEnabled() || pointerX === null;

		revealEls.forEach(function (el) {
			var glow = el.querySelector(':scope > .edge-glow');
			if (!glow) return;

			if (disabled || !el.isConnected) {
				glow.style.opacity = '0';
				return;
			}

			var r = el.getBoundingClientRect();
			if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight) {
				glow.style.opacity = '0';
				return;
			}

			var dx = Math.max(r.left - pointerX, 0, pointerX - r.right);
			var dy = Math.max(r.top - pointerY, 0, pointerY - r.bottom);
			var dist = Math.sqrt(dx * dx + dy * dy);

			if (dist >= edgeThreshold) {
				glow.style.opacity = '0';
				return;
			}

			var op = 1 - dist / edgeThreshold;
			op *= op;

			glow.style.setProperty('--bx', (((pointerX - r.left) / r.width) * 100).toFixed(1) + '%');
			glow.style.setProperty('--by', (((pointerY - r.top) / r.height) * 100).toFixed(1) + '%');
			glow.style.opacity = op.toFixed(3);
		});
	}

	function initEffects() {
		if (effectsBound) return;
		effectsBound = true;
		/* 顺序很重要：先给卡片补 reveal（只发光、不按压），
		   bindPress 再给按钮补 reveal，最后统一建光效。 */
		markCardReveals();
		bindPress();
		buildReveal();
		bindReveal();
		scheduleEdgeUpdate();
	}

	if (effectsEnabled()) initEffects();
	else buildReveal();

	document.addEventListener('pointermove', function (e) {
		pointerX = e.clientX;
		pointerY = e.clientY;
		if (effectsEnabled()) scheduleEdgeUpdate();
	}, { passive: true });

	document.documentElement.addEventListener('mouseleave', function () {
		pointerX = pointerY = null;
		scheduleEdgeUpdate();
	}, { passive: true });

	/* 页面里动态插入的卡片（后续的搜索 / 归档）也能拿到效果 */
	if (window.MutationObserver) {
		var mo = new MutationObserver(function (records) {
			var changed = false;
			records.forEach(function (rec) {
				rec.addedNodes.forEach(function (node) {
					if (node.nodeType === 1 && (node.classList.contains('reveal') || node.querySelector('.reveal'))) changed = true;
				});
			});
			if (changed && effectsEnabled()) {
				initEffects();
				markCardReveals();
				bindPress();
				buildReveal();
				bindReveal();
				scheduleEdgeUpdate();
			}
		});
		if (document.body) mo.observe(document.body, { childList: true, subtree: true });
	}

	/* pjax 换页后：标题栏、首页视图按钮、卡片都是新节点，重新绑定一遍 */
	document.addEventListener('restart:page', function (e) {
		initViewControls();
		var nextPath = e && e.detail && e.detail.url
			? new URL(e.detail.url, location.href).pathname
			: location.pathname;
		markNav(nextPath);
		if (drawerOpen()) setDrawer(false);
		syncPreferenceUi();
		syncDashToggle();
		if (window.__fluentRefresh) window.__fluentRefresh();
	});

	/* 供后续 pjax / 动态内容复用 */
	window.__fluentRefresh = function () {
		if (effectsEnabled()) {
			initEffects();
			markCardReveals();
			bindPress();
			buildReveal();
			bindReveal();
		}
		updateEdgeLight();
	};
})();
