const path = require('path');
const utils = require('./src/utils');

const settings = {
  URLs: ['http://192.168.0.108:8080/', 'http://192.168.0.108:8081/', 'http://192.168.0.108:8082/', 'http://192.168.0.108:8083/'],
  testWidthMin: 320, //320
  testWidthMax: 1100, //1400
  testingHeight: 1000,
  repeat: 1,
  run: 'repair',
  browserMode: 'Headless',
  loadDirectory: 'saved-doms-headless',
  webpagesDirectory: path.join(__dirname, 'subjects-minimized'),
  mainOutputFile: 'output',
  loadDelay: 0.4,
  autoScrollDelay: 0.4,
  scrollDelay: 0.4,
  scrollPage: true, // should the page be scrolled on navigation to trigger any events or load elements?
  maxAutoScroll: 25000,
  tolerance: { collision: 2, equivalentParent: 1, protrusion: 1, smallrange: 1, ignoreFractions: false }, //Collision allows 1px border over === 1.
  rowThreshold: 2,
  runOutputFile: path.join('output', utils.getDateTime()),
  excludeElementsWithDisplayValue: ['inline'], //excluded from the RLG
  capturePCAlignments: true, //top right left bottom aligned, center justified vertical and horizontal
  capturePCVerticalAlignments: false, //top aligned, bottom aligned, vertically center justified.
  captureSiblingAlignments: true, //above below right left
  smallrangeThreshold: 5,
  detectElementCollision: true,
  detectElementProtrusion: true,
  detectViewportProtrusion: true,
  detectWrapping: true,
  detectSmallRange: true,
  screenshotNarrower: false,
  screenshotMin: true,
  screenshotMid: false,
  screenshotMax: false,
  screenshotWider: true,
  screenshotFullpage: true,
  screenshotFailingRepairs: true,
  screenshotHighlights: true,
  skipCopyingCSSProperties: [],
  NoScalingCSSProperties: [],
  humanStudy: false,
};

module.exports = settings;
