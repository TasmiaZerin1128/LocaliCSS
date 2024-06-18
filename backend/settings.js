const path = require('path');
const utils = require('./src/utils');

const settings = {
  testWidthMin: 350, //320
  testWidthMax: 1200, //1400
  testingHeight: 1000,
  repeat: 1,
  run: 'repair',
  browserMode: 'Headless',
  loadDirectory: 'saved-doms-headless',
  webpagesDirectory: 'subjects',
  mainOutputFile: 'output',
  repairDelay: 0.4,
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
  repairConfirmUsing: utils.RepairConfirmed.DOMRLG,
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
  additionalRepairs: utils.AdditionalRepairs.NONE,
  repairCombination: [
     'Transform-Wider',
     'Transform-Narrower'
],
  humanStudy: false,
};

module.exports = settings;
