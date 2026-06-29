/* global hexo */

hexo.extend.filter.register('marked:extensions', function(extensions) {
  extensions.push({
    name: 'math',
    level: 'inline',
    start(src) {
      return src.indexOf('$');
    },
    tokenizer(src) {
      const displayMatch = src.match(/^\$\$([\s\S]+?)\$\$/);
      if (displayMatch) {
        return {
          type: 'math',
          raw: displayMatch[0],
          text: displayMatch[1],
          displayMode: true,
        };
      }

      const inlineMatch = src.match(/^\$(.+?)\$/);
      if (inlineMatch) {
        return {
          type: 'math',
          raw: inlineMatch[0],
          text: inlineMatch[1],
          displayMode: false,
        };
      }
    },
    renderer(token) {
      if (token.displayMode) {
        return `$$\n${token.text}\n$$`;
      }
      return `$${token.text}$`;
    },
  });
});
