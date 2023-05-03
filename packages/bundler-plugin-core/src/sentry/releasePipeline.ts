// Build a facade that exposes necessary sentry functionality
// Idea: We start out with Sentry-CLI and replace the cli-commands one by one afterwards.
// Goal: eventually replace everything sentry-cli does with "native" code here
// Reason: We don't want to depend on a binary that gets downloaded in a postinstall hook
//           - no fixed version
//           - huge download
//           - unnecessary functionality

import { NormalizedOptions } from "../options-mapping";
import { BuildContext } from "../types";
import { addSpanToTransaction } from "./telemetry";

export async function createNewRelease(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  const span = addSpanToTransaction(ctx, "function.plugin.create_release");

  try {
    await ctx.cli.releases.new(releaseName);
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Creating new release failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.hub.addBreadcrumb({ level: "info", message: "Successfully created release." });
  ctx.logger.info("Successfully created release.");
}

export async function cleanArtifacts(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  if (!options.cleanArtifacts) {
    ctx.logger.debug("Skipping artifact cleanup.");
    return;
  }

  const span = addSpanToTransaction(ctx, "function.plugin.clean_artifacts");

  try {
    await ctx.cli.releases.execute(["releases", "files", releaseName, "delete", "--all"], true);
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Deleting release files failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.hub.addBreadcrumb({ level: "info", message: "Successfully cleaned previous artifacts." });
  ctx.logger.info("Successfully cleaned previous artifacts.");
}

export async function uploadSourceMaps(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  if (!options.uploadSourceMaps) {
    ctx.logger.debug("Skipping source maps upload.");
    return;
  }

  const span = addSpanToTransaction(ctx, "function.plugin.upload_sourcemaps");
  ctx.logger.info("Uploading Sourcemaps.");

  // Since our internal include entries contain all top-level sourcemaps options,
  // we only need to pass the include option here.
  try {
    await ctx.cli.releases.uploadSourceMaps(releaseName, {
      include: options.include,
      dist: options.dist,
    });
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Uploading source maps failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.hub.addBreadcrumb({ level: "info", message: "Successfully uploaded source maps." });
  ctx.logger.info("Successfully uploaded source maps.");
}

export async function setCommits(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  if (!options.setCommits) {
    ctx.logger.debug("Skipping setting commits to release.");
    return;
  }

  const span = addSpanToTransaction(ctx, "function.plugin.set_commits");

  const { auto, repo, commit, previousCommit, ignoreMissing, ignoreEmpty } = options.setCommits;

  try {
    await ctx.cli.releases.setCommits(releaseName, {
      commit,
      previousCommit,
      repo,
      auto,
      ignoreMissing,
      ignoreEmpty,
    });
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Setting commits failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.logger.info("Successfully set commits.");
}

export async function finalizeRelease(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  if (!options.finalize) {
    ctx.hub.addBreadcrumb({ level: "info", message: "Skipping release finalization." });
    ctx.logger.debug("Skipping release finalization.");
    return;
  }

  const span = addSpanToTransaction(ctx, "function.plugin.finalize_release");

  try {
    await ctx.cli.releases.finalize(releaseName);
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Finalizing release failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.hub.addBreadcrumb({ level: "info", message: "Successfully finalized release." });
  ctx.logger.info("Successfully finalized release.");
}

export async function addDeploy(
  options: NormalizedOptions,
  ctx: BuildContext,
  releaseName: string
): Promise<void> {
  if (!options.deploy) {
    ctx.hub.addBreadcrumb({ level: "info", message: "Skipping adding deploy info to release." });
    ctx.logger.debug("Skipping adding deploy info to release.");
    return;
  }

  const span = addSpanToTransaction(ctx, "function.plugin.deploy");

  const { env, started, finished, time, name, url } = options.deploy;

  try {
    await ctx.cli.releases.newDeploy(releaseName, {
      env,
      started,
      finished,
      time,
      name,
      url,
    });
  } catch (e) {
    ctx.hub.captureException(new Error("CLI Error: Adding deploy info failed"));
    throw e;
  } finally {
    span?.finish();
  }

  ctx.hub.addBreadcrumb({ level: "info", message: "Successfully added deploy." });
  ctx.logger.info("Successfully added deploy.");
}
