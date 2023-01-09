import * as core from "@actions/core";
import { run } from "./approved-by";

run()
  .then(() => {
    core.info("Done.");
  })
  .catch((e) => {
    core.error(e.message);
  });
