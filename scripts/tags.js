/* ==========================================================================
   文章里可用的自定义标签。
   放主题 scripts/ 下，hexo 会自动加载（theme_script_dir），不用改站点配置。
   ========================================================================== */
'use strict';

var FA = '<i class="fa fa-github" aria-hidden="true"></i>';

/* 写进 HTML 前把 & 与 < 转掉：曲名/作者来自主题配置或正文，
   带个 & 之类的字符不至于把页面结构弄坏。 */
function esc(s) {
	return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/* {% heimu 文字 %} —— 萌娘百科那种黑幕。
   默认被一条实心色块盖住，悬停或点击才显出文字（点击切换在 js/extras.js 里）。
   色块用 --c-title：浅色主题下是黑底白字，暗色主题下自动反过来，
   不用为两套主题各写一遍。 */
hexo.extend.tag.register('heimu', function (args) {
	var text = (args || []).join(' ');
	if (!text) return '';
	return '<span class="heimu" title="你知道的太多了">' + text + '</span>';
});

/* {% ghcard owner/repo %} —— GitHub 仓库卡片。
   骨架在构建期就写死（仓库名 + 链接），星标/描述等由前端补：
   构建期去请求 GitHub 会把构建速度绑在别人的可用性上，而且有速率限制。
   前端拿不到数据时卡片依然可点、可读。 */
hexo.extend.tag.register('ghcard', function (args) {
	var repo = ((args || [])[0] || '').trim();
	/* 只接受 owner/repo 形状，避免把任意串拼进 href */
	if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return '';

	return '<a class="ghcard reveal" href="https://github.com/' + repo + '"' +
		' target="_blank" rel="noopener noreferrer" data-repo="' + repo + '">' +
		'<span class="ghcard-head">' + FA + '<span class="ghcard-name">' + repo + '</span></span>' +
		'<span class="ghcard-desc"></span>' +
		'<span class="ghcard-meta"></span>' +
		'</a>';
});

/* {% music <url> | 曲名 | 作者 %} —— 正文里的音乐卡片。
   卡片上只有播放键与进度条，播放本身交给固定播放器（js/player.js）。

   **不必先把歌登记到主题 _config.yml**：写个地址就行 —— 不在歌单里的歌，
   会在第一次点击时被播放器补进播放列表（js/music-card.js 调
   __restartPlayer.toggleUrl），所以它一样能上一首/下一首、一样出现在列表里。
   曲名与作者都可省：省略时优先取 music.songs 里的同名项，再不然用文件名。

   三种写法：
     · {% music /music/song.mp3 %}
     · {% music /music/song.mp3 | 曲名 | 作者 %}
     · {% music 1 %}   第几首 = music.songs 里的序号（曲名、作者从配置取）

   分段用 | 而不是空格：Hexo 会把参数按空格切开（这里再 join 回来，
   所以字段内部带空格没问题，只是不能再带 |）。 */
hexo.extend.tag.register('music', function (args) {
	var want = (args || []).join(' ').trim();
	if (!want) return '';

	var seg = want.split('|');
	var url = (seg[0] || '').trim().replace(/^["']|["']$/g, '');
	var name = (seg[1] || '').trim();
	var artist = (seg[2] || '').trim();
	if (!url) return '';

	var songs = ((hexo.theme.config && hexo.theme.config.music) || {}).songs || [];
	var song = {};
	var i;

	if (/^\d+$/.test(url)) {
		/* 纯数字：music.songs 里第几首，与播放器列表上的编号一致 */
		i = parseInt(url, 10) - 1;
		if (i < 0 || i >= songs.length || !songs[i] || !songs[i].url) return '';
		song = songs[i];
		url = song.url;
	} else {
		/* 地址与配置里某一项相同时，曲名/作者优先取配置里的 */
		for (i = 0; i < songs.length; i++) {
			if (songs[i] && songs[i].url === url) { song = songs[i]; break; }
		}
	}

	if (!name) name = song.name || '';
	if (!artist) artist = song.artist || '';
	if (!name) name = url.split('/').pop() || url;

	/* 卡片上的地址尽量与 player.js 里那份一模一样（它也过了一道 url_for：
	   中文与空格会被编码成 %XX）。这里显式把站点配置交给这个 helper，
	   不依赖标签调用时的 this 上有没有 config。 */
	var urlFor = hexo.extend.helper.get('url_for');
	if (urlFor) {
		try { url = urlFor.call({ config: hexo.config }, url); } catch (e) {}
	}

	return '<figure class="music-card reveal" data-url="' + esc(url) + '"' +
		' data-name="' + esc(name) + '" data-artist="' + esc(artist) + '">' +
		'<button class="music-play" type="button" aria-label="播放" title="播放">' +
			'<i class="fa fa-play music-ico-idle" aria-hidden="true"></i>' +
			'<i class="fa fa-pause music-ico-playing" aria-hidden="true"></i>' +
		'</button>' +
		'<figcaption class="music-meta">' +
			'<span class="music-line">' +
				'<span class="music-name">' + esc(name) + '</span>' +
				(artist ? '<span class="music-artist">' + esc(artist) + '</span>' : '') +
			'</span>' +
			'<span class="music-bar" role="slider" tabindex="0" aria-label="播放进度"' +
				' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="music-fill"></i></span>' +
		'</figcaption>' +
	'</figure>';
});

/* {% countdown 2026-06-07 09:00 "标题" "高考" day %} —— 正 / 倒计时卡片。
   日期过了就反过来计（「高考 已经过去 N 天」），所以叫「正倒计时」。
   最后一个词决定样子，省略即 day：
     day  —— 一句话「离高考还有 123 天」；当天之内说「就是今天」；
     time —— 翻牌时钟，时:分:秒，左边另挂一枚「N 天」（只显示时:分:秒的话，
             高考这种几个月外的目标会变成四位数的「小时」，读不出来）。
   日期可以带时刻：写 2026-06-07 09:00 或 2026-06-07T09:00 都行。
   字段按位置读：标题一个词，事件可以带空格（多出来的词都算事件的）。
   数字、秒针与翻牌都由 js/countdown.js 在浏览器里算 ——
   站点是静态的，构建期算出来的天数第二天就过期了。 */
hexo.extend.tag.register('countdown', function (args) {
	var a = (args || []).map(function (s) {
		return String(s).replace(/^["']|["']$/g, '');
	});
	if (!a.length) return '';

	/* 第一个是日期；紧跟一个 HH:MM 时并进来（Hexo 把参数按空格切开了） */
	var date = (a.shift() || '').trim();
	if (/^\d{1,2}:\d{2}$/.test(a[0] || '')) date += 'T' + a.shift();
	if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(date)) return '';

	/* 末尾的 day / time 是模式 */
	var mode = 'day';
	var last = (a[a.length - 1] || '').toLowerCase();
	if (last === 'day' || last === 'time') {
		mode = last;
		a.pop();
	}

	/* 两个词 → 标题 + 事件；只剩一个 → 当事件（那句话才是主体） */
	var title = a.length > 1 ? a[0] : '';
	var event = a.length > 1 ? a.slice(1).join(' ') : (a[0] || '');
	if (!title && !event) return '';

	var attrs = ' data-date="' + esc(date) + '" data-mode="' + mode + '"' +
		' data-event="' + esc(event) + '"';
	/* 卡片底下那行小字：目标日期（带时刻的把 T 换成空格，好读一些） */
	var meta = '<p class="cd-meta">' + esc(date.replace('T', ' ')) + '</p>';

	if (mode === 'time') {
		return '<div class="countdown reveal"' + attrs + '>' +
			(title ? '<p class="cd-title">' + esc(title) + '</p>' : '') +
			/* 「离新年还有」与「N 天」放同一行，读起来是一句话；钟面在下面 */
			'<div class="cd-head">' +
				'<p class="cd-lead"></p>' +
				'<p class="cd-days"><b>—</b><span>天</span></p>' +
			'</div>' +
			'<div class="cd-clock">' +
				'<div class="cd-clock-body" role="timer" aria-label="倒计时"></div>' +
			'</div>' +
			meta +
		'</div>';
	}

	return '<div class="countdown reveal"' + attrs + '>' +
		(title ? '<p class="cd-title">' + esc(title) + '</p>' : '') +
		'<p class="cd-sentence" role="timer" aria-label="倒计时"></p>' +
		meta +
	'</div>';
});
