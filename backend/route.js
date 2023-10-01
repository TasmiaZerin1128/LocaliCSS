const express = require('express');
const { startTool } = require('./tool');
const router = express.Router();

router.route('/testPage').get(startTool);

module.exports = router;