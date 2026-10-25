/* ==========================================================================
   countdown.js — 正 / 倒计时卡片（{% countdown %}）

   两种样子：
     day  —— 「离高考还有 123 天」，数字是主角（46px 主色）；
             过了日期反过来计「高考已经过去 N 天」，当天之内整句放大成
             「高考就是今天」；
     time —— 翻牌时钟（时:分:秒，牌缝 + 单位标签）+ 左边一枚「N 天」。
             只显示时:分:秒的话，高考这种几个月外的目标会变成四位数的
             「小时」，读不出来，所以天单独挂一枚。
   过了目标时间，时钟改为正计时（数字往上走），文案同步换成「已经过去」。

   翻牌结构、动画时长、以及「对齐整秒再跳」的节奏都照搬设计稿 test.html，
   配色与尺寸在 css/countdown.css 里按主题令牌重写。

   脚本挂在 #content 之外（layout.ejs），pjax 换页不会重放，所以自己监听
   restart:page 重新收集卡片；整页共用一只定时器，不随卡片数量增长。
   ========================================================================== */
(function () {
	'use strict';

	var DAY = 86400000;
	var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	var timer = 0;
	var live = [];
	var UNITS = ['时', '分', '秒'];

	function pad2(n) { return (n < 10 ? '0' : '') + n; }

	function esc(s) {
		return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
	}

	/* "YYYY-MM-DD" 或 "YYYY-MM-DDTHH:MM" → 本地时间戳。
	   不能直接 new Date(字符串)：纯日期按 UTC 解析，东八区会差 8 小时。 */
	function parseTarget(s) {
		var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s || '');
		if (!m) return null;
		return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0, 0).getTime();
	}

	/* ---------- day 模式：一句话（数字当主角） ---------- */
	function setSentence(el, event, diff) {
		var future = diff > 0;
		var today = !future && -diff < DAY;

		if (today) {
			if (el._key !== 'today') {
				el._key = 'today';
				el._num = null;
				el.textContent = event + '就是今天';
			}
			return 'today';
		}

		var lead = future ? '离' + event + '还有' : event + '已经过去';
		var num = future ? Math.ceil(diff / DAY) : Math.floor(-diff / DAY);

		if (el._key !== lead) {
			el._key = lead;
			el.innerHTML = esc(lead) + '<b class="cd-num">' + num + '</b>' +
				'<span class="cd-unit">天</span>';
			el._num = el.querySelector('.cd-num');
		} else if (el._num && el._num.textContent !== String(num)) {
			el._num.textContent = num;
		}
		return future ? 'future' : 'past';
	}

	/* ---------- 翻牌：结构与节奏照搬设计稿 ---------- */
	function createDigit() {
		var d = document.createElement('span');
		d.className = 'cd-digit';
		d.dataset.value = '';
		d.innerHTML =
			'<span class="cd-face cd-upper"><span class="cd-digit-num">0</span></span>' +
			'<span class="cd-face cd-lower"><span class="cd-digit-num">0</span></span>' +
			'<span class="cd-face cd-upper cd-flip-upper"><span class="cd-digit-num">0</span></span>' +
			'<span class="cd-face cd-lower cd-flip-lower"><span class="cd-digit-num">0</span></span>';
		d._c = {
			sUpper: d.querySelector('.cd-upper:not(.cd-flip-upper) .cd-digit-num'),
			sLower: d.querySelector('.cd-lower:not(.cd-flip-lower) .cd-digit-num'),
			fUp: d.querySelector('.cd-flip-upper'),
			fDown: d.querySelector('.cd-flip-lower'),
			fUpNum: d.querySelector('.cd-flip-upper .cd-digit-num'),
			fDownNum: d.querySelector('.cd-flip-lower .cd-digit-num')
		};
		return d;
	}

	/* 无动画直接设值：首屏与 prefers-reduced-motion 用 */
	function setImmediate(el, val) {
		var c = el._c;
		clearTimeout(el._t);
		el.dataset.value = val;
		c.fUp.classList.remove('go');
		c.fDown.classList.remove('go');
		c.sUpper.textContent = val;
		c.sLower.textContent = val;
		c.fUpNum.textContent = val;
		c.fDownNum.textContent = val;
	}

	function flipTo(el, val) {
		if (el.dataset.value === val) return;
		var cur = el.dataset.value;
		var c = el._c;
		el.dataset.value = val;
		clearTimeout(el._t);

		/* 复位翻转层（同一帧完成，不会画出中间态），再布置四个面 */
		c.fUp.classList.remove('go');
		c.fDown.classList.remove('go');
		c.fUpNum.textContent = cur;      /* 上翻页片：带旧数字翻下去 */
		c.sUpper.textContent = val;      /* 静态上半：立刻换新数字，被翻页片盖住 */
		c.fDownNum.textContent = val;    /* 下翻页片：带新数字翻下来 */

		void el.offsetWidth;             /* 强制回流，动画才重新触发 */
		c.fUp.classList.add('go');
		c.fDown.classList.add('go');

		el._t = setTimeout(function () {
			c.sLower.textContent = val;    /* 静态下半静默换新数字 */
			c.fUpNum.textContent = val;    /* 归位前先同步，免得旧数字闪一下 */
			c.fUp.classList.remove('go');
			c.fDown.classList.remove('go');
		}, 560);
	}

	/* 时:分:秒 三列，每列两位数字 + 底下一枚单位标签 */
	function buildClock(box) {
		box.textContent = '';
		box._digits = [];
		for (var g = 0; g < 3; g++) {
			var col = document.createElement('span');
			col.className = 'cd-unit-col';

			var group = document.createElement('span');
			group.className = 'cd-group';
			for (var i = 0; i < 2; i++) {
				var d = createDigit();
				group.appendChild(d);
				box._digits.push(d);
			}

			var lab = document.createElement('em');
			lab.textContent = UNITS[g];

			col.appendChild(group);
			col.appendChild(lab);
			box.appendChild(col);

			if (g < 2) {
				var colon = document.createElement('span');
				colon.className = 'cd-colon';
				colon.innerHTML = '<i></i><i></i>';
				box.appendChild(colon);
			}
		}
	}

	/* ---------- time 模式：翻牌时钟 ---------- */
	function setClock(card, diff) {
		var box = card.querySelector('.cd-clock-body');
		if (!box) return 'future';
		if (!box._digits) buildClock(box);

		var past = diff <= 0;
		var left = Math.abs(diff);
		var days = Math.floor(left / DAY);
		var str = pad2(Math.floor(left % DAY / 3600000)) +
			pad2(Math.floor(left % 3600000 / 60000)) +
			pad2(Math.floor(left % 60000 / 1000));

		var lead = card.querySelector('.cd-lead');
		if (lead) {
			var text = (past ? card._event + '已经过去' : '离' + card._event + '还有');
			if (lead.textContent !== text) lead.textContent = text;
		}

		var dayEl = card.querySelector('.cd-days b');
		if (dayEl && dayEl.textContent !== String(days)) dayEl.textContent = days;

		for (var i = 0; i < 6; i++) {
			/* 首屏与「不许动」都直接落值：翻牌动画只在秒数真的变化时播 */
			if (reduce || !box._built) setImmediate(box._digits[i], str[i]);
			else flipTo(box._digits[i], str[i]);
		}
		box._built = true;

		/* 无障碍：只播报到「分」，且只在变化时改 —— 否则读屏软件每秒被刷一次 */
		var label = (past ? card._event + '已经过去 ' : '离' + card._event + '还有 ') +
			days + ' 天 ' + Number(str.slice(0, 2)) + ' 小时 ' + Number(str.slice(2, 4)) + ' 分';
		if (box.getAttribute('aria-label') !== label) box.setAttribute('aria-label', label);

		return past ? 'past' : 'future';
	}

	/* ---------- 主循环 ---------- */
	function update() {
		var now = Date.now();
		live.forEach(function (card) {
			var diff = card._target - now;
			var state = card._mode === 'time'
				? setClock(card, diff)
				: setSentence(card.querySelector('.cd-sentence'), card._event, diff);
			card.classList.toggle('is-today', state === 'today');
			card.classList.toggle('is-past', state === 'past');
		});
	}

	function boot() {
		clearTimeout(timer);
		timer = 0;
		live = [];

		Array.prototype.forEach.call(document.querySelectorAll('.countdown[data-date]'), function (card) {
			var t = parseTarget(card.getAttribute('data-date'));
			if (t === null) return;
			card._target = t;
			card._mode = card.getAttribute('data-mode') === 'time' ? 'time' : 'day';
			card._event = card.getAttribute('data-event') || '';
			live.push(card);
		});

		if (!live.length) return;
		update();
		/* 对齐到整秒再跳：否则每秒飘几十毫秒，跑久了数字会跳格 */
		(function loop() {
			timer = setTimeout(function () {
				update();
				loop();
			}, 1000 - (Date.now() % 1000) + 8);
		})();
	}

	boot();
	document.addEventListener('restart:page', boot);
})();
