const utils = require('./utils');

class RepairStatistics {
    constructor() {
        this.repairs = 0;
        this.failedRepairs = 0;
        this.repairedByOthers = 0;
        this.noOracle = 0;
        this.doesNotNeedRepair = 0;
        this.oracleApplied = 0;
    }

    addValuesFrom(...args) {
        for(let otherRepairStatistics of args){
            this.repairs += otherRepairStatistics.repairs;
            this.failedRepairs += otherRepairStatistics.failedRepairs;
            this.repairedByOthers += otherRepairStatistics.repairedByOthers;
            this.noOracle += otherRepairStatistics.noOracle;
            this.doesNotNeedRepair += otherRepairStatistics.doesNotNeedRepair;
            this.oracleApplied += otherRepairStatistics.oracleApplied;
        }
    }
    // file The file to print to.
   
    printRepairStats(file, title, consolePrintTitle = false, consolePrintStats = false) {
        if (title !== undefined) {
            utils.printToFile(file, title);
            if (consolePrintTitle)
                console.log(title);
        }
        let total = this.repairs + this.repairedByOthers + this.failedRepairs + this.noOracle + this.doesNotNeedRepair;
        let fixed = this.repairs + this.repairedByOthers;
        let requireMoreRepairRate = 0;
        let successRate = 0;
        if (total !== 0) {
            successRate = ((fixed / total) * 100);
            requireMoreRepairRate = ((this.oracleApplied / total) * 100);
        }
        successRate = successRate.toFixed(2);
        requireMoreRepairRate = requireMoreRepairRate.toFixed(2);

        let text = 'Fixed:' + successRate + '%' + ' Require-More:' + requireMoreRepairRate + '%' + ' Patched:' + this.repairs + ' Free:' + this.repairedByOthers + ' Failed:' + this.failedRepairs + ' No-oracle:' + this.noOracle + ' FPs:' + this.doesNotNeedRepair + ' Require-More:' + this.oracleApplied;
        utils.printToFile(file, text);
        if (consolePrintStats)
            console.log(text);
    }
}
module.exports = RepairStatistics;