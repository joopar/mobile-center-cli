import {AppCommand, Command, CommandArgs, CommandResult, ErrorCodes, failure, hasArg, help, longName, required, shortName, success} from "../../../util/commandline";
import { MobileCenterClient, models, clientRequest } from "../../../util/apis";
import { out } from "../../../util/interaction";
import * as _ from "lodash";
import { reportBuild } from "./lib/format-build";

const debug = require("debug")("mobile-center-cli:commands:build:branches:show");

@help("Show branch build status")
export default class ShowBranchBuildStatusCommand extends AppCommand {

  @help("Branch name for status check")
  @shortName("b")
  @longName("branch")
  @required
  @hasArg
  public branchName: string;

  async run(client: MobileCenterClient, portalBaseUrl: string): Promise<CommandResult> {
    const app = this.app;

    debug(`Getting builds for branch ${this.branchName}`);
    const branchBuildsRequestResponse = await out.progress(`Getting builds for branch ${this.branchName}...`, 
      clientRequest<models.Build[]>((cb) => client.buildOperations.getBranchBuilds(this.branchName, app.ownerName, app.appName, cb)));

    const branchBuildsHttpResponseCode = branchBuildsRequestResponse.response.statusCode;

    if (branchBuildsHttpResponseCode >= 400) {
      return failure(ErrorCodes.Exception, "the Branch Builds request was rejected for an unknown reason");
    }

    const builds = branchBuildsRequestResponse.result;

    if (builds.length === 0) {
      out.text(`There are no builds for the branch ${this.branchName}`);
      return success();
    }

    // Taking last build
    const lastBuild = _.maxBy(builds, (build) => Number(build.buildNumber));

    debug(`Getting commit info for commit ${lastBuild.sourceVersion}`);
    const commitInfoRequestResponse = await out.progress(`Getting commit info for ${lastBuild.sourceVersion}...`, 
      clientRequest<models.CommitDetails[]>((cb) => client.buildOperations.getCommits(lastBuild.sourceVersion, app.ownerName, app.appName, cb)));

    const commitInfoRequestResponseResponseCode = commitInfoRequestResponse.response.statusCode;

    if (commitInfoRequestResponseResponseCode >= 400) {
      return failure(ErrorCodes.Exception, "the Get Commit request was rejected for an unknown reason");
    }

    const commitInfo = commitInfoRequestResponse.result[0];

    reportBuild(lastBuild, commitInfo, app, portalBaseUrl);

    return success();
  }
}
