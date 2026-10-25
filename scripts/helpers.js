/* ==========================================================================
   restart-fluent 的模板辅助函数。

   fluent_digest(post, maxLength)
   把正文转成信息流摘要。除了剥 HTML，还要先去掉由标签插件生成的
   「非正文」块（音乐卡、倒计时卡、GitHub 卡片）——
   否则摘要开头会变成曲名/作者或仓库名，读者看到的不是文章内容。
   ========================================================================== */
'use strict';

var stripHTML = require('hexo-util').stripHTML;

hexo.extend.helper.register('fluent_digest', function (post, maxLength) {
	var max = parseInt(maxLength, 10);
	if (!(max > 0)) max = 120;

	var raw = String((post && (post.excerpt || post.content)) || '');

	/* 这些块是交互卡片，不是叙述正文；整块拿掉再取文字。 */
	raw = raw
		.replace(/<figure\b[^>]*class="[^"]*\bmusic-card\b[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, ' ')
		.replace(/<a\b[^>]*class="[^"]*\bghcard\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, ' ')
		.replace(/<div\b[^>]*class="[^"]*\bcountdown\b[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, ' ');

	var text = stripHTML(raw).replace(/\s+/g, ' ').trim();
	if (text.length > max) text = text.slice(0, max) + '…';
	return text;
});
