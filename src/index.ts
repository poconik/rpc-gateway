import runApplication from './runApplication.js';
import reportStartupFailure from './reportStartupFailure.js';

void runApplication().catch(reportStartupFailure);
