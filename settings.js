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
  testWidthMin: 1390, //320
  testWidthMax: 1400, //1400
  testingHeight: 1000,
  repeat: 1,
  run: 'repair',
  browserMode: 'headless',
  loadDirectory: 'saved-doms-headless',
  webpagesDirectory: 'subjects',
  mainOutputFile: 'output',
  tolerance: { collision: 2, equivalentParent: 1, protrusion: 1, smallrange: 1, ignoreFractions: false }, //Collision allows 1px border over === 1.
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
  detectSmallrange: true,
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
