/**
 * sf profile retrieve full
 *
 * Retrieves full Profile metadata using the Metadata API readMetadata() call,
 * bypassing the standard retrieve's "sparse" behavior.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Connection, Messages, Org, SfError } from '@salesforce/core';
import { retrieveProfiles } from '../../../services/profileMetadataService.js';
import { cleanProfileXml } from '../../../services/profileCleaner.js';
import { writeProfileToSourceFormat } from '../../../services/formatConverter.js';
import {
  ProfileRetrieveResult,
  ProfileRetrieveFullResult,
  DEFAULT_CLEAN_OPTIONS,
} from '../../../types/profileTypes.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@shibiramaiyan/sf-profile-full', 'profile.retrieve.full');

export default class ProfileRetrieveFull extends SfCommand<ProfileRetrieveFullResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      multiple: true,
      exclusive: ['sourcedir', 'all'],
    }),
    sourcedir: Flags.directory({
      char: 's',
      summary: messages.getMessage('flags.sourcedir.summary'),
      exclusive: ['name', 'all'],
      exists: true,
    }),
    all: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.all.summary'),
      default: false,
      exclusive: ['name', 'sourcedir'],
    }),
    'target-org': Flags.requiredOrg(),
    'output-dir': Flags.directory({
      char: 'd',
      summary: messages.getMessage('flags.output-dir.summary'),
      default: 'force-app/main/default/profiles',
    }),
    clean: Flags.boolean({
      summary: messages.getMessage('flags.clean.summary'),
      default: false,
    }),
  };

  public async run(): Promise<ProfileRetrieveFullResult> {
    const { flags } = await this.parse(ProfileRetrieveFull);

    const outputDir: string = flags['output-dir'];
    const shouldClean: boolean = flags.clean;
    const org: Org = flags['target-org'];
    const connection: Connection = org.getConnection();

    // Resolve profile names from --name, --sourcedir, or --all
    let profileNames: string[];
    if (flags.name) {
      profileNames = flags.name
        .flatMap((v: string) => v.split(','))
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);
    } else if (flags.sourcedir) {
      profileNames = this.getProfileNamesFromDir(flags.sourcedir);
      if (profileNames.length === 0) {
        throw new SfError(`No .profile-meta.xml files found in ${flags.sourcedir}`);
      }
      this.log(`Found ${profileNames.length} profile(s) in ${flags.sourcedir}`);
    } else if (flags.all) {
      this.log('Querying org for all profiles...');
      const listResult = await connection.metadata.list({ type: 'Profile' });
      const items = Array.isArray(listResult) ? listResult : [listResult];
      profileNames = items
        .filter((item) => item?.fullName)
        .map((item) => item.fullName);
      if (profileNames.length === 0) {
        throw new SfError('No profiles found in the org.');
      }
      this.log(`Found ${profileNames.length} profile(s) in org.`);
    } else {
      throw new SfError('You must provide either --name, --sourcedir, or --all.');
    }

    this.log(`Retrieving ${profileNames.length} profile(s) from ${org.getUsername() ?? 'unknown'}...`);

    // 1. Retrieve full profile metadata via readMetadata()
    const retrieved = await retrieveProfiles(connection, profileNames);

    const results: ProfileRetrieveResult[] = [];

    // 2. Process each retrieved profile
    for (const profile of retrieved) {
      try {
        let xml = profile.xml;

        // 3. Optionally clean the XML
        if (shouldClean) {
          xml = cleanProfileXml(xml, DEFAULT_CLEAN_OPTIONS);
        }

        // 4. Write to disk
        const filePath = writeProfileToSourceFormat(profile.fullName, xml, outputDir);

        results.push({
          name: profile.fullName,
          success: true,
          filePath,
        });

        this.log(`  ✓ ${profile.fullName} → ${filePath}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push({
          name: profile.fullName,
          success: false,
          error: errMsg,
        });
        this.warn(`  ✗ ${profile.fullName}: ${errMsg}`);
      }
    }

    // 5. Report any profiles that weren't returned by the API at all
    const retrievedNames = new Set(retrieved.map((r) => r.fullName));
    for (const name of profileNames) {
      if (!retrievedNames.has(name)) {
        results.push({
          name,
          success: false,
          error: 'Profile not found in org or not returned by readMetadata()',
        });
        this.warn(`  ✗ ${name}: Profile not found in org`);
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.filter((r) => !r.success).length;

    this.log('');
    this.log(`Done. ${totalSuccess} succeeded, ${totalFailed} failed.`);

    // Display results table
    this.table({
      data: results.map((r) => ({
        Profile: r.name,
        Status: r.success ? '✓' : '✗',
        'File Path': r.filePath ?? '',
        Error: r.error ?? '',
      })),
    });

    return {
      profiles: results,
      totalRequested: profileNames.length,
      totalSuccess,
      totalFailed,
    };
  }

  /**
   * Scan a directory for .profile-meta.xml files and return their profile names.
   */
  private getProfileNamesFromDir(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.getProfileNamesFromDir(fullPath));
      } else if (entry.name.endsWith('.profile-meta.xml')) {
        results.push(path.basename(entry.name, '.profile-meta.xml'));
      }
    }
    return results;
  }
}
