'use strict';

const crypto = require('node:crypto');

const API_VERSION = '10.x';

const STYLES = [
  'waves',
  'stack',
  'shapes',
  'bottts',
  'sprouts',
  'planets',
  'squircles',
  'constellation'
];

const PRESETS = {
  light: {
    background: ['e4f2f5', 'f9fcfc'],
    primary: '4d9aa8',
    accent: 'df7f67',
    muted: '8fb4bd'
  },
  dark: {
    background: ['132335', '0e1a28'],
    primary: '8ed3de',
    accent: 'f2b39f',
    muted: '5c8792'
  }
};

const STYLE_COLORS = {
  stack: (preset) => ({
    stoneLightColor: [preset.primary],
    stoneMidColor: [preset.muted],
    stoneDeepColor: [preset.accent]
  }),
  waves: (preset) => ({ waveColor: [preset.primary, preset.accent, preset.muted] }),
  shapes: (preset) => ({
    shape1Color: [preset.primary],
    shape2Color: [preset.accent],
    shape3Color: [preset.muted]
  }),
  bottts: (preset) => ({ baseColor: [preset.primary, preset.muted] }),
  planets: (preset) => ({ planetColor: [preset.primary, preset.accent, preset.muted] }),
  squircles: (preset) => ({ shapeColor: [preset.primary, preset.accent, preset.muted] }),
  constellation: (preset) => ({
    constellationColor: [preset.primary, preset.accent, preset.muted]
  })
};

function titleOf(post) {
  return String((post && (post.title || post.path)) || '').trim();
}

function uidForTitle(title) {
  return crypto
    .createHash('sha256')
    .update(String(title || ''))
    .digest('hex')
    .slice(0, 16);
}

function styleForUid(uid) {
  return STYLES[parseInt(uid.slice(0, 8), 16) % STYLES.length];
}

function appendColors(params, colors) {
  Object.entries(colors).forEach(([key, value]) => {
    params.set(key, Array.isArray(value) ? value.join(',') : value);
  });
}

function coverUrl(post, mode) {
  const uid = uidForTitle(titleOf(post));
  const style = styleForUid(uid);
  const preset = PRESETS[mode === 'dark' ? 'dark' : 'light'];
  const params = new URLSearchParams();

  params.set('seed', uid);
  params.set('backgroundColor', preset.background.join(','));
  params.set('backgroundColorFill', 'linear');
  params.set('backgroundColorAngle', '135');

  const colors = STYLE_COLORS[style];
  if (colors) appendColors(params, colors(preset));

  return `https://api.dicebear.com/${API_VERSION}/${style}/svg?${params.toString().replace(/%2C/g, ',')}`;
}

module.exports = { STYLES, coverUrl, uidForTitle, styleForUid };
