// tokens delete command

import { Command, CommandArgs, CommandResult, help, success, failure, ErrorCodes, position, required } from "../../util/commandline";
import { out, prompt } from "../../util/interaction";
import { MobileCenterClient, models, clientRequest } from "../../util/apis";

const debug = require("debug")("mobile-center-cli:commands:apps:create");
import { inspect } from "util";

@help("Delete an API token")
export default class AppDeleteCommand extends Command {
  constructor(args: CommandArgs) {
    super(args);
  }

  @help("ID of the API token")
  @required
  @position(0)
  id: string;

  async run(client: MobileCenterClient): Promise<CommandResult> {
    const confirmation = await prompt.confirm(`Do you really want to delete the token with ID "${this.id}"`);

    if (confirmation) {
      const deleteTokenResponse = await out.progress("Deleting app ...", clientRequest<null>(cb => client.account.deleteApiToken(this.id, cb)));

      if (deleteTokenResponse.response.statusCode === 404) {
        return failure(ErrorCodes.InvalidParameter, `the token with ID "${this.id}" could not be found`);
      }
    } else {
      out.text(`Deletion of token with ID "${this.id}" canceled`);
    }

    return success();
  }
}
