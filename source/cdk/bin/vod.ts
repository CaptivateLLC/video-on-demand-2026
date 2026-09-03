import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import { VideoOnDemand } from '../lib/vod-stack';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as child_process from 'child_process';

const app = new cdk.App();
const branch = child_process.execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

new VideoOnDemand(app, 'video-on-demand-2030', { // NOSONAR
  branch,
  synthesizer: new DefaultStackSynthesizer({
    generateBootstrapVersionRule: false
  })
}); // NOSONAR

//cdk nag
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
