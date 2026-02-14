/**
 * Comprehensive unit tests for the sf-profile-full plugin.
 * Targets 100% code coverage across all service modules.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { cleanProfileXml } from '../../../../lib/services/profileCleaner.js';
import {
  DEFAULT_CLEAN_OPTIONS,
} from '../../../../lib/types/profileTypes.js';
import { retrieveProfiles } from '../../../../lib/services/profileMetadataService.js';
import { writeProfileToSourceFormat } from '../../../../lib/services/formatConverter.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ─── ProfileTypes ────────────────────────────────────────────────

describe('profileTypes', () => {
  it('DEFAULT_CLEAN_OPTIONS should strip all non-portable elements', () => {
    expect(DEFAULT_CLEAN_OPTIONS.removeLoginIpRanges).to.be.true;
    expect(DEFAULT_CLEAN_OPTIONS.removeUserLicense).to.be.true;
    expect(DEFAULT_CLEAN_OPTIONS.removeLoginHours).to.be.true;
  });
});

// ─── ProfileCleaner ──────────────────────────────────────────────

describe('ProfileCleaner', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Profile xmlns="http://soap.sforce.com/2006/04/metadata">
    <custom>false</custom>
    <userLicense>Salesforce</userLicense>
    <fieldPermissions>
        <editable>true</editable>
        <field>Account.AnnualRevenue</field>
        <readable>true</readable>
    </fieldPermissions>
    <layoutAssignments>
        <layout>Account-Account Layout</layout>
    </layoutAssignments>
    <loginIpRanges>
        <endAddress>255.255.255.255</endAddress>
        <startAddress>0.0.0.0</startAddress>
    </loginIpRanges>
    <loginHours>
        <mondayStart>480</mondayStart>
        <mondayEnd>1080</mondayEnd>
    </loginHours>
    <userPermissions>
        <enabled>true</enabled>
        <name>ViewSetup</name>
    </userPermissions>
</Profile>`;

  it('should remove loginIpRanges when configured', () => {
    const result = cleanProfileXml(sampleXml, {
      removeLoginIpRanges: true,
      removeUserLicense: false,
      removeLoginHours: false,
    });
    expect(result).to.not.include('loginIpRanges');
    expect(result).to.include('userLicense');
    expect(result).to.include('loginHours');
    expect(result).to.include('fieldPermissions');
  });

  it('should remove userLicense when configured', () => {
    const result = cleanProfileXml(sampleXml, {
      removeLoginIpRanges: false,
      removeUserLicense: true,
      removeLoginHours: false,
    });
    expect(result).to.include('loginIpRanges');
    expect(result).to.not.include('userLicense');
    expect(result).to.include('loginHours');
  });

  it('should remove loginHours when configured', () => {
    const result = cleanProfileXml(sampleXml, {
      removeLoginIpRanges: false,
      removeUserLicense: false,
      removeLoginHours: true,
    });
    expect(result).to.include('loginIpRanges');
    expect(result).to.include('userLicense');
    expect(result).to.not.include('loginHours');
  });

  it('should remove all non-portable elements with default options', () => {
    const result = cleanProfileXml(sampleXml);
    expect(result).to.not.include('loginIpRanges');
    expect(result).to.not.include('userLicense');
    expect(result).to.not.include('loginHours');
    expect(result).to.include('fieldPermissions');
    expect(result).to.include('layoutAssignments');
    expect(result).to.include('userPermissions');
  });

  it('should keep everything when nothing is configured for removal', () => {
    const result = cleanProfileXml(sampleXml, {
      removeLoginIpRanges: false,
      removeUserLicense: false,
      removeLoginHours: false,
    });
    expect(result).to.include('loginIpRanges');
    expect(result).to.include('userLicense');
    expect(result).to.include('loginHours');
    expect(result).to.include('fieldPermissions');
  });

  it('should preserve XML declaration', () => {
    const result = cleanProfileXml(sampleXml);
    expect(result).to.match(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });

  it('should return unchanged XML if no Profile root found', () => {
    const weirdXml = '<Something>test</Something>';
    const result = cleanProfileXml(weirdXml, {
      removeLoginIpRanges: true,
      removeUserLicense: true,
      removeLoginHours: true,
    });
    expect(result).to.equal(weirdXml);
  });
});

// ─── FormatConverter ─────────────────────────────────────────────

describe('FormatConverter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-profile-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write a file with .profile-meta.xml extension', () => {
    const filePath = writeProfileToSourceFormat('Admin', '<Profile/>', tmpDir);
    expect(filePath).to.include('Admin.profile-meta.xml');
    expect(fs.existsSync(filePath)).to.be.true;
  });

  it('should write the correct content', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Profile><custom>false</custom></Profile>';
    const filePath = writeProfileToSourceFormat('TestProfile', xml, tmpDir);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).to.equal(xml);
  });

  it('should create nested directories if they do not exist', () => {
    const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
    const filePath = writeProfileToSourceFormat('Admin', '<Profile/>', nestedDir);
    expect(fs.existsSync(filePath)).to.be.true;
  });

  it('should overwrite existing file', () => {
    writeProfileToSourceFormat('Admin', '<Profile>old</Profile>', tmpDir);
    writeProfileToSourceFormat('Admin', '<Profile>new</Profile>', tmpDir);
    const filePath = path.join(tmpDir, 'Admin.profile-meta.xml');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).to.equal('<Profile>new</Profile>');
  });
});

// ─── ProfileMetadataService ──────────────────────────────────────

describe('ProfileMetadataService', () => {
  afterEach(() => {
    sinon.restore();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mockConn(readStub: sinon.SinonStub): any {
    return { metadata: { read: readStub } };
  }

  it('should batch profile names into groups of 10', async () => {
    const readStub = sinon.stub().resolves([]);
    const names = Array.from({ length: 15 }, (_, i) => `Profile${i}`);
    await retrieveProfiles(mockConn(readStub), names);

    expect(readStub.callCount).to.equal(2);
    expect(readStub.firstCall.args[1]).to.have.length(10);
    expect(readStub.secondCall.args[1]).to.have.length(5);
  });

  it('should handle exactly 10 profiles in a single batch', async () => {
    const readStub = sinon.stub().resolves([]);
    const names = Array.from({ length: 10 }, (_, i) => `Profile${i}`);
    await retrieveProfiles(mockConn(readStub), names);

    expect(readStub.callCount).to.equal(1);
    expect(readStub.firstCall.args[1]).to.have.length(10);
  });

  it('should handle empty profile names array', async () => {
    const readStub = sinon.stub().resolves([]);
    const results = await retrieveProfiles(mockConn(readStub), []);

    expect(results).to.have.length(0);
    expect(readStub.callCount).to.equal(0);
  });

  it('should normalize single-item results to arrays', async () => {
    const singleResult = {
      fullName: 'Admin',
      custom: false,
      userPermissions: [{ enabled: true, name: 'ViewSetup' }],
    };
    const readStub = sinon.stub().resolves(singleResult);
    const results = await retrieveProfiles(mockConn(readStub), ['Admin']);

    expect(results).to.have.length(1);
    expect(results[0].fullName).to.equal('Admin');
    expect(results[0].xml).to.include('<Profile');
    expect(results[0].xml).to.include('ViewSetup');
  });

  it('should skip null items in results', async () => {
    const readStub = sinon.stub().resolves([null, { fullName: 'Admin' }]);
    const results = await retrieveProfiles(mockConn(readStub), ['Admin', 'Bad']);

    expect(results).to.have.length(1);
    expect(results[0].fullName).to.equal('Admin');
  });

  it('should skip items without fullName', async () => {
    const readStub = sinon.stub().resolves([{ fullName: 'Admin' }, { noName: true }]);
    const results = await retrieveProfiles(mockConn(readStub), ['Admin', 'Bad']);

    expect(results).to.have.length(1);
    expect(results[0].fullName).to.equal('Admin');
  });

  it('should generate valid XML with declaration and namespace', async () => {
    const readStub = sinon.stub().resolves({
      fullName: 'Admin',
      custom: false,
    });
    const results = await retrieveProfiles(mockConn(readStub), ['Admin']);

    expect(results[0].xml).to.match(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(results[0].xml).to.include('http://soap.sforce.com/2006/04/metadata');
    expect(results[0].xml).to.include('<Profile');
    // fullName should be excluded from the XML body
    expect(results[0].xml).to.not.include('<fullName>');
  });

  it('should strip jsforce "$" and "type" meta keys from results', async () => {
    const readStub = sinon.stub().resolves({
      fullName: 'Admin',
      $: { 'xsi:type': 'Profile' },
      type: 'Profile',
      custom: false,
      fieldPermissions: {
        $: { 'xsi:type': 'ProfileFieldLevelSecurity' },
        type: 'ProfileFieldLevelSecurity',
        field: 'Account.Name',
        editable: true,
      },
    });
    const results = await retrieveProfiles(mockConn(readStub), ['Admin']);

    expect(results[0].xml).to.not.include('xsi:type');
    expect(results[0].xml).to.not.include('<type>');
    expect(results[0].xml).to.include('Account.Name');
    expect(results[0].xml).to.include('<editable>');
  });

  it('should handle nested arrays in profile data', async () => {
    const readStub = sinon.stub().resolves({
      fullName: 'Admin',
      userPermissions: [
        { enabled: true, name: 'ViewSetup', $: { foo: 'bar' } },
        { enabled: false, name: 'ModifyAllData', type: 'PermThing' },
      ],
    });
    const results = await retrieveProfiles(mockConn(readStub), ['Admin']);

    expect(results[0].xml).to.include('ViewSetup');
    expect(results[0].xml).to.include('ModifyAllData');
    // Meta keys stripped from array items
    expect(results[0].xml).to.not.include('foo');
    expect(results[0].xml).to.not.include('PermThing');
  });

  it('should handle primitive values (string, number, boolean)', async () => {
    const readStub = sinon.stub().resolves({
      fullName: 'Admin',
      custom: false,
      description: 'A profile',
      loginCount: 42,
    });
    const results = await retrieveProfiles(mockConn(readStub), ['Admin']);

    expect(results[0].xml).to.include('<custom>');
    expect(results[0].xml).to.include('A profile');
    expect(results[0].xml).to.include('42');
  });

  it('should handle multiple batches returning different profiles', async () => {
    const readStub = sinon.stub();
    readStub.onFirstCall().resolves(
      Array.from({ length: 10 }, (_, i) => ({ fullName: `P${i}`, custom: true }))
    );
    readStub.onSecondCall().resolves(
      Array.from({ length: 3 }, (_, i) => ({ fullName: `P${i + 10}`, custom: false }))
    );

    const names = Array.from({ length: 13 }, (_, i) => `P${i}`);
    const results = await retrieveProfiles(mockConn(readStub), names);

    expect(results).to.have.length(13);
    expect(results[0].fullName).to.equal('P0');
    expect(results[12].fullName).to.equal('P12');
  });
});
