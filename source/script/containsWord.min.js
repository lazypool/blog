/**
 * Minified by jsDelivr using Terser v5.3.5.
 * Original file: /gh/EmoryHuang/BlogBeautify@1.1/containsWord.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
var a_idx=0;function delay(){$(".buryit").removeAttr("onclick")}jQuery(document).ready((function(a){a("body").click((function(t){var e=new Array("富强","民主","文明","和谐","自由","平等","公正","法治","爱国","敬业","诚信","友善"),o=a("<span/>").text(e[a_idx]);a_idx=(a_idx+1)%e.length;var n=t.pageX,i=t.pageY;o.css({"z-index":5,top:i-20,left:n,position:"absolute","font-weight":"bold",color:"rgb("+~~(255*Math.random())+","+~~(255*Math.random())+","+~~(255*Math.random())+")"}),a("body").append(o),o.animate({top:i-180,opacity:0},3e3,(function(){o.remove()}))})),setTimeout("delay()",2e3)}));
//# sourceMappingURL=/sm/29e1be1b129d571fa38b27b554a2941e7c80143af182baf2e157a070272cb3c1.map