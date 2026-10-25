(function () {
	'use strict';

	var root = document.querySelector('[data-hero-slider]');
	if (!root) return;

	var slides = Array.prototype.slice.call(root.querySelectorAll('[data-hero-slide]'));
	var dots = Array.prototype.slice.call(root.querySelectorAll('[data-hero-to]'));
	var prev = root.querySelector('[data-hero-prev]');
	var next = root.querySelector('[data-hero-next]');
	if (slides.length < 2) return;

	var index = 0;
	var autoTimer = null;
	var hoverTimer = null;
	var hovering = false;
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function paint() {
		slides.forEach(function (slide, i) {
			var on = i === index;
			slide.classList.toggle('is-active', on);
			slide.setAttribute('aria-hidden', on ? 'false' : 'true');
			if ('inert' in slide) slide.inert = !on;
		});
		dots.forEach(function (dot, i) {
			var on = i === index;
			dot.classList.toggle('is-active', on);
			if (on) dot.setAttribute('aria-current', 'true');
			else dot.removeAttribute('aria-current');
		});
	}

	function go(i) {
		index = (i + slides.length) % slides.length;
		paint();
	}

	function schedule() {
		window.clearTimeout(autoTimer);
		if (reduce) return;
		autoTimer = window.setTimeout(function () {
			go(index + 1);
			schedule();
		}, 6000);
	}

	function resetHover() {
		window.clearTimeout(hoverTimer);
		if (reduce || !hovering) return;
		window.clearTimeout(autoTimer);
		hoverTimer = window.setTimeout(function () {
			go(index + 1);
			schedule();
		}, 3000);
	}

	/* 手动切换也算一次交互：悬停计时从这个动作重新开始 */
	function manualGo(i) {
		go(i);
		schedule();
		resetHover();
	}

	if (prev) prev.addEventListener('click', function () { manualGo(index - 1); });
	if (next) next.addEventListener('click', function () { manualGo(index + 1); });

	dots.forEach(function (dot) {
		dot.addEventListener('click', function () {
			manualGo(parseInt(dot.getAttribute('data-hero-to'), 10) || 0);
		});
	});

	/* 悬停几秒后切到下一页；离开后恢复自动播放 */
	root.addEventListener('mouseenter', function () {
		hovering = true;
		window.clearTimeout(autoTimer);
		resetHover();
	});

	root.addEventListener('mouseleave', function () {
		hovering = false;
		window.clearTimeout(hoverTimer);
		schedule();
	});

	root.addEventListener('focusin', function () { window.clearTimeout(autoTimer); });
	root.addEventListener('focusout', function () { schedule(); });

	paint();
	schedule();

	document.addEventListener('restart:page', function () {
		/* 只清理已经被 pjax 换掉的旧 hero */
		if (document.documentElement.contains(root)) return;
		window.clearTimeout(autoTimer);
		window.clearTimeout(hoverTimer);
	});
})();
