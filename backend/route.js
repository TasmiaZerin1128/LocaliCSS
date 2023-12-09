const express = require('express');
const { startTool, sendZipFailures, sendResultFile, sendSnapshots } = require('./tool');
const router = express.Router();

router.route('/testPage').get(startTool);
router.route('/download/result/:file').get(sendResultFile);
router.route('/download/zip/failures/:type').get(sendZipFailures);
router.route('/repair/:image').get(sendSnapshots);

module.exports = router;