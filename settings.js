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
  testWidthMin: 320, //320
  testWidthMax: 350, //1400
  testingHeight: 1000,
  repeat: 1,
  run: 'repair',
  browserMode: 'headless',
  loadDirectory: 'saved-doms-headless',
  webpagesDirectory: 'subjects',
  mainOutputFile: 'output',
  runOutputFile: path.join('output', getDateTime()),
};

module.exports = settings;
