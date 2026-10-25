/* ==========================================================================
   数学公式保护（在 markdown 之前摘出来，渲染之后再放回）。

   为什么需要：markdown 渲染器会把公式当成自己的语法处理掉 ——
     · \mathbf{F}_{total} 里的下划线被当成斜体标记，_..._ 变成 <em>，
       下划线本身随之消失，KaTeX 拿到的是非法的 \mathbf{F}{total}；
     · 公式中间的换行变成 <br>，把一整段公式拆成好几个文本节点，
       连 $$...$$ 这个定界符都跨了节点，auto-render 根本匹配不到。
   两个毛病叠在一起，表现就是「正文里的公式完全不渲染」。

   做法：markdown 之前把公式换成占位符，渲染完再原样放回。
   这样公式在 HTML 里是一个完整、未被改动的文本节点，KaTeX 正常处理。

   代码块与行内代码里的公式一律跳过：那是写给读者看的示例，不该被解析。
   ========================================================================== */
'use strict';

/* 按文章分开存：渲染是多篇连续的，用一个全局数组会串味 */
var stores = {};

/* 每组：先用代码片段占位，剩下的才当公式。
   $[^$\n$]+$ 不跨行，避免把「$100 到 $200」这种整段吞进公式。 */
var MATH_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)|(\$\$[\s\S]+?\$\$|\$[^$\n$]+\$)/g;

hexo.extend.filter.register('before_post_render', function (data) {
	var list = [];

	data.content = String(data.content || '').replace(MATH_RE, function (m, code, math) {
		if (code || !math) return m;
		list.push(math);
		return '@@MATH' + (list.length - 1) + '@@';
	});

	stores[data.path || data.source || ''] = list;
	return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
	var key = data.path || data.source || '';
	var list = stores[key] || [];
	delete stores[key];

	data.content = String(data.content || '')
		/* 独占一行的块级公式不该被 <p> 包住：KaTeX 会往里渲染块级元素 */
		.replace(/<p>\s*(@@MATH\d+@@)\s*<\/p>/g, '$1')
		.replace(/@@MATH(\d+)@@/g, function (m, i) {
			return list[+i] || m;
		});

	return data;
});
