const path = require('path');

function getDateTime() {
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1; // months are zero indexed
  let day = date.getDate();

  let hour = date.getHours();
  let min = date.getMinutes();
  let sec = date.getSeconds();

  day = (day < 10 ? '0' : '') + day;
  month = (month < 10 ? '0' : '') + month;

  hour = (hour < 10 ? '0' : '') + hour;
  min = (min < 10 ? '0' : '') + min;
  sec = (sec < 10 ? '0' : '') + sec;

  const dateTime = `${year}-${month}-${day}-${hour}-${min}-${sec}`;

  return dateTime;
}

const settings = {
  testWidthMin: 450, //320
  testWidthMax: 470, //1400
  testingHeight: 1000,
  repeat: 1,
  run: 'repair',
  browserMode: 'headless',
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
  runOutputFile: path.join('output', getDateTime()),
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
  humanStudy: false,
};

module.exports = settings;
