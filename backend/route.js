const express = require('express');
const { startTool, sendFailures, sendZipFailures } = require('./tool');
const router = express.Router();

router.route('/testPage').get(startTool);
router.route('/download/failures').get(sendFailures);
router.route('/download/zip/failures').get(sendZipFailures);

module.exports = router;