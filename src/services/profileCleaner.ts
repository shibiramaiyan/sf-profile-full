/**
 * ProfileCleaner
 *
 * Strips non-portable elements from Profile XML so the metadata
 * can be safely moved between different org types (sandbox ↔ production).
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { CleanOptions, DEFAULT_CLEAN_OPTIONS } from '../types/profileTypes.js';

const parserOptions = {
  ignoreAttributes: false,
  preserveOrder: false,
  parseTagValue: true,
  trimValues: true,
};

const builderOptions = {
  ignoreAttributes: false,
  format: true,
  indentBy: '    ',
  suppressEmptyNode: false,
  suppressBooleanAttributes: false,
};

/**
 * Clean a Profile XML string by removing non-portable elements.
 *
 * @param xml - The raw Profile XML string.
 * @param options - Which elements to remove (defaults to all non-portable).
 * @returns The cleaned XML string.
 */
export function cleanProfileXml(
  xml: string,
  options: CleanOptions = DEFAULT_CLEAN_OPTIONS
): string {
  const parser = new XMLParser(parserOptions);
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const profile = parsed['Profile'] as Record<string, unknown> | undefined;
  if (!profile) {
    // If there's no <Profile> root, return the XML unchanged.
    return xml;
  }

  if (options.removeLoginIpRanges) {
    delete profile['loginIpRanges'];
  }

  if (options.removeUserLicense) {
    delete profile['userLicense'];
  }

  if (options.removeLoginHours) {
    delete profile['loginHours'];
  }

  const builder = new XMLBuilder(builderOptions);
  const rebuilt = builder.build({ Profile: profile }) as string;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + rebuilt;
}
