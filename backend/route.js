const express = require('express');
const { startTool, sendZipFailures, sendResultFile } = require('./tool');
const router = express.Router();

router.route('/testPage').get(startTool);
router.route('/download/result/:file').get(sendResultFile);
router.route('/download/zip/failures').get(sendZipFailures);

module.exports = router;