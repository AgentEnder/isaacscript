import { error, parseIntSafe } from "isaacscript-common-ts";
import moment from "moment";
import { Config } from "./classes/Config";
import { CURRENT_DIRECTORY_NAME } from "./constants";

/** From: https://github.com/expandjs/expandjs/blob/master/lib/kebabCaseRegex.js */
const KEBAB_CASE_REGEX =
  /^([a-z](?![\d])|[\d](?![a-z]))+(-?([a-z](?![\d])|[\d](?![a-z])))*$|^$/;

export function getModTargetDirectoryName(config: Config): string {
  return config.customTargetModDirectoryName === undefined
    ? CURRENT_DIRECTORY_NAME
    : config.customTargetModDirectoryName;
}

export function getTime(): string {
  return moment().format("h:mm:ss A"); // e.g. "1:23:45 AM"
}

// From: https://stackoverflow.com/questions/1731190/check-if-a-string-has-white-space
export function hasWhiteSpace(s: string): boolean {
  return /\s/g.test(s);
}

export function isKebabCase(s: string): boolean {
  return KEBAB_CASE_REGEX.test(s);
}

export function isRecord(object: unknown): object is Record<string, unknown> {
  return (
    typeof object === "object" && object !== null && !Array.isArray(object)
  );
}

export function parseSemVer(
  versionString: string,
): [majorVersion: number, minorVersion: number, patchVersion: number] {
  const match = versionString.match(/^v*(\d+)\.(\d+)\.(\d+)/);
  if (match === null) {
    error(`Failed to parse the version string of: ${versionString}`);
  }

  const majorVersionString = match[1] ?? "";
  const minorVersionString = match[2] ?? "";
  const patchVersionString = match[3] ?? "";

  const majorVersion = parseIntSafe(majorVersionString);
  if (Number.isNaN(majorVersion)) {
    error(`Failed to parse the major version number from: ${versionString}`);
  }

  const minorVersion = parseIntSafe(minorVersionString);
  if (Number.isNaN(minorVersion)) {
    error(`Failed to parse the minor version number from: ${versionString}`);
  }

  const patchVersion = parseIntSafe(patchVersionString);
  if (Number.isNaN(patchVersion)) {
    error(`Failed to parse the patch version number from: ${versionString}`);
  }

  return [majorVersion, minorVersion, patchVersion];
}
