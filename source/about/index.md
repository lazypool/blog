---
title: About Me
layout: about
---

> &emsp;&emsp;初见斜塘老街，如初见江南水乡的诗意，城市的喧嚣已远，留存下的，是悠然流转的时光。漫步于平直的青石小径，眼前的一切仿佛都沐浴在历史的长河中，让人不禁沉醉于这片古老而宁静的天地，对这独特的江南水乡之地有了深深的印象。再入斜塘老街，那份独特的历史文化氛围依然扑面而来，老街虽是重建的，却未经岁月的洗礼。

<br style="margin-bottom:20px;">

<style>
.heatmap-weekday-container { display:flex; gap:10px; width:100%;}
.monthlabels { position: relative; height: 20px; margin-bottom: 5px; margin-left: 0px; font-size: 12px; }
.weekday-labels { display:grid; grid-template-rows:repeat(7, 1fr); gap:3px; font-size:9px; color:#000; padding-top:25px; }
.heatmap { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); gap: 3px; }
.day { width: 16px; height: 16px; position: relative; }
.day.show:hover::after { 
    content: attr(data-count) " contributions on " attr(data-date); position: absolute;
    top: -30px; left: 50%; transform: translateX(-50%); background: #000; color: #fff;
    padding: 4px 8px; border-radius: 3px; font-size: 10px; white-space: nowrap; z-index: 1; }
.color-0 { background-color: #ebedf0; }
.color-1 { background-color: #a1dab4; }
.color-2 { background-color: #41b6c4; }
.color-3 { background-color: #bd93f9; }
.color-4 { background-color: #ff79c9; }
.todo-list-li { padding: 10px 0 15px; margin: 0; text-align: left; width: 100%; font-size: 1.1rem; width: 100%; display: block; }
.todo-list-li.done { color: #ccc; text-decoration: line-through; }
.todo-list-li span::before { float: right; font-size: 1.1rem; content: "O"; }
.todo-list-li.done span::before { content: "✔"; }
</style>

<div style="padding: 30px; background: #fff; border-radius: 5px; box-shadow: 2px 2px 14px rgba(0,0,0,0.15);">
    <div class="heatmap-weekday-container">
        <div class="weekday-labels" style="max-width:5%">
            <div style="grid-row:1;">Sun</div>
            <div style="grid-row:4;">Thu</div>
            <div style="grid-row:7;">Sat</div>
        </div>
        <div id="heatmap-container" style="width:95%">
            <div class="monthlabels" id="monthlabels"></div>
	        <div class="heatmap" id="heatmap"></div>
        </div>
    </div>
	<div style="display:flex; margin-top:10px; float:right;">
      <div style="font-size:9px; color: #000;">Less&emsp;</div>
      <div class="day color-0"></div>
      <div class="day color-1"></div>
      <div class="day color-2"></div>
      <div class="day color-3"></div>
      <div class="day color-4"></div>
      <div style="font-size:9px; color: #000;">&emsp;More</div>
	</div>
    <p style="font-size:25pt; margin-top:1.5em;">
        Sunday
    &emsp;<span style="font-size:15pt;">
        July 13, 2025
    </span></p>
    <div class="todolist-container" style="display:flex; justify-content:space-between;">
        <div style="font-size: 12pt; font-family: 'Open Sans', Helvatica, Sans Serif; max-width:400px; width:100%">
            <ul style="padding-left:.5em;">
                <li class="todo-list-li">博客：写有关 cuda 访存优化的博客<span></span></li>
                <li class="todo-list-li">保研：准备武大人工智能学院的面试 PPT<span></span></li>
            </ul>
        </div>
        <div style="margin:auto auto; max-width:40%;">
            <img src="https://cdn.pixabay.com/photo/2020/11/15/18/51/cat-5746875_1280.png" style="max-height:250px;">
        </div>
    </div>
</div>

<script>
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
fetch("https://github-contributions-api.jogruber.de/v4/lazypool?y=last")
    .then(rsp => rsp.json())
    .then(data => {
        var width= document.getElementById('heatmap-container').clientWidth;
        var ignore = Math.floor(data.contributions.length / 7 - width / 19) * 7;
        data.contributions.forEach((day, idx) => {
            if (idx < ignore) return;
            var div = document.createElement('div')
            div.className = `day color-${day.level} show`;
            div.setAttribute('data-count', day.count);
            div.setAttribute('data-date', day.date);
            document.getElementById('heatmap').appendChild(div);
            var datetime = new Date(day.date)
            if (datetime.getDate() !== 1) return;
            var div = document.createElement('div')
            div.style.position = 'absolute';
            div.style.left = `${Math.floor((idx - ignore) / 7) * 19}px`;
            div.textContent = MONTHS[datetime.getMonth()];
            document.getElementById('monthlabels').appendChild(div);
        });
    })
.catch(err => console.log(err))
</script>

<br style="margin-top:20px;">

> &emsp;&emsp;斜塘老街是苏州的一处隐姓埋名的区域。这里没有喧闹的游客群，只有静谧的岁月。走进老街，仿佛走进了一个被时光遗忘的角落，一砖一瓦都诉说着远去的故事，一切都显得那么和谐而宁静。走进老街，仿佛瞬间被一股强大的磁场吸住，周围的一切都变得如此鲜活而生动。街道两旁大多是两层楼的小小店铺，每一家店铺都像是一个小小的博物馆，展示着各种各样的玉器古董、手工艺品和传统小吃。古玩店里的书画、玉石等，虽非稀世珍宝，但每一件都像是在诉说着一段传奇。手工艺品店更是让人目不暇接，从精致的苏绣到巧夺天工的木雕，从栩栩如生的泥塑到色彩斑斓的剪纸，每一件作品都凝聚了匠人们的心血和灵魂，匠人们真是把工作做成了诗。

<br style="margin-bottom:15px;">

<table><thead><tr>
<th><div align="center"><img alt="photo" src="./pic2.png" width="500" title="me"><h6>秋水时至，百川塞河！ —— 《庄子·秋水》</h6></div></th>
<th><div align="center">
      
[![LazyPool's GitHub stats](https://github-readme-stats.vercel.app/api?username=lazypool&count_private=true&show_icons=true)](https://github.com/lazypool)

[![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=lazypool)](https://github.com/lazypool)
    
</div></th></tr></thead></table>

<div align="center">
  <img alt="html5" src="https://media.giphy.com/media/XAxylRMCdpbEWUAvr8/giphy.gif" width="100" title="html">
  <img alt="css" src="https://media.giphy.com/media/fsEaZldNC8A1PJ3mwp/giphy.gif" width="100" title="css">
  <img alt="VSCode" src="https://i.giphy.com/media/IdyAQJVN2kVPNUrojM/200.webp" width="100" title="vscode">
  <img alt="python" src="https://i.giphy.com/media/LMt9638dO8dftAjtco/200.webp" width="100" title="python">
  <img alt="javascript" src="https://media3.giphy.com/media/ln7z2eWriiQAllfVcn/200w.webp" width="100" title="javascript">
  <img alt="sublime" src="https://media.giphy.com/media/jnDKffgCfGYOp6cMTK/giphy.gif" width="100" title="sublime">
  <img alt="github" src="https://i.giphy.com/media/KzJkzjggfGN5Py6nkT/200.webp" width="100" title="github">
  <img alt="node" src="https://media.giphy.com/media/kdFc8fubgS31b8DsVu/giphy.gif" width="85" title="node">
</div>

<br style="margin-top:20px;">

> &emsp;&emsp;在老街北门附近，有一面“老街印象”景观墙，墙前有一组青铜雕塑，在向游人诉说着一个个久远的故事：木匠在奋力锯木“木中藏天地，刀下有乾坤”；磨刀匠扛着特制的长凳拉长声音吆喝“磨剪子啦，镪菜刀”；铁匠光着上身“铁衣冷砧铿，烟花繁锦绣”；挑着木炭沿街叫卖的农妇“满面尘灰烟火色，两鬓苍苍十指黑”；落魄秀才徘徊在酒馆门前喃喃自语“温两碗酒，要一碟茴香豆”；挑夫在米铺前呼喊“今日米价两百文”；戴着一只脚眼镜的大夫在为老妇“切脉寸关尺，三指定乾坤”；两个顽童在磨坊门前“鞭长好纠缠，雀跃打螺陀”……

<br style="margin-bottom:15px;">

