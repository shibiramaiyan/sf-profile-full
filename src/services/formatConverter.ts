/**
 * FormatConverter
 *
 * Handles writing Profile XML files to disk.
 * Writes in Salesforce DX Source format (.profile-meta.xml).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Write a Profile XML string to disk in Source format.
 *
 * @param profileName - The API name of the profile (e.g. "Admin").
 * @param xml - The profile XML content.
 * @param outputDir - The directory to write to.
 * @returns The absolute path of the written file.
 */
export function writeProfileToSourceFormat(
  profileName: string,
  xml: string,
  outputDir: string
): string {
  // Ensure the output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Salesforce DX Source format uses .profile-meta.xml extension
  const fileName = `${profileName}.profile-meta.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, xml, 'utf-8');
  return filePath;
}
