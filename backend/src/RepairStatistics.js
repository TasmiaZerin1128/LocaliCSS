class RepairStatistics {
    constructor() {
        this.repairs = 0;
        this.failedRepairs = 0;
        this.repairedByOthers = 0;
        this.noOracle = 0;
        this.doesNotNeedRepair = 0;
        this.oracleApplied = 0;
    }
}

module.exports = RepairStatistics;