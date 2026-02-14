# sf-profile-full

> Salesforce CLI plugin that retrieves **complete** Profile metadata using the Metadata API `readMetadata()` call — no more missing Field-Level Security or Layout assignments.

---

## The Problem

The standard `sf project retrieve` command returns **sparse** profile XML. It only includes sections that correspond to other components already in your local project, which means critical permissions like Field-Level Security (FLS), Layout assignments, Class access, and Page access are often silently dropped.

## The Solution

`sf-profile-full` calls the CRUD-based `readMetadata('Profile', [...])` API directly, which returns the **full** object definition regardless of what exists in your local project or `package.xml` manifest.

---

## Features

- **Complete Profile Retrieval** — Fetches full profile XML including all FLS, layouts, class access, page access, tab visibility, and more.
- **Flexible Input** — Specify profiles by name (`--name`), auto-detect from a directory (`--sourcedir`), or retrieve all profiles from the org (`--all`).
- **XML Cleaning** — Optionally strip non-portable elements (login IP ranges, login hours, user license) with `--clean` for safe sandbox ↔ production transfers.
- **Source Format Output** — Writes `.profile-meta.xml` files compatible with Salesforce DX source format.
- **Automatic Batching** — Handles the Metadata API's 10-record limit transparently.
- **Custom Output Directory** — Save profiles anywhere with `--output-dir`.

---

## Prerequisites

- **Node.js** ≥ 18.0.0
- **Salesforce CLI** (`sf`) installed globally
- An authenticated Salesforce org

---

## Installation

### Link for Local Development

```bash
git clone <repo-url>
cd sf-profile-full
npm install
npm run build
sf plugins link .
```

### Verify Installation

```bash
sf profile retrieve full --help
```

---

## Usage

```
sf profile retrieve full [flags]
```

### Flags

| Flag           | Alias | Required                                               | Description                                                            |
| -------------- | ----- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `--name`       | `-n`  | One of `--name`, `--sourcedir`, or `--all` is required | Comma-separated profile names to retrieve                              |
| `--sourcedir`  | `-s`  |                                                        | Directory containing `.profile-meta.xml` files to auto-detect profiles |
| `--all`        | `-a`  |                                                        | Retrieve **every** profile from the target org                         |
| `--target-org` |       | **Yes**                                                | Alias or username of the authenticated Salesforce org                  |
| `--output-dir` | `-d`  | No (default: `force-app/main/default/profiles`)        | Directory where retrieved profiles are saved                           |
| `--clean`      |       | No (default: `false`)                                  | Strip non-portable elements from the XML                               |

> **Note:** `--name`, `--sourcedir`, and `--all` are mutually exclusive — you must provide exactly one.

### Examples

**Retrieve a single profile:**

```bash
sf profile retrieve full --name Admin --target-org my-sandbox
```

**Retrieve multiple profiles by name:**

```bash
sf profile retrieve full --name Admin,"Custom Sales Profile",Standard --target-org my-sandbox
```

**Auto-detect profiles from a local directory:**

```bash
sf profile retrieve full --sourcedir force-app/main/default/profiles --target-org my-sandbox
```

**Retrieve all profiles from the org:**

```bash
sf profile retrieve full --all --target-org my-sandbox
```

**Retrieve and clean non-portable elements:**

```bash
sf profile retrieve full --name Admin --target-org my-sandbox --clean
```

**Save to a custom directory:**

```bash
sf profile retrieve full --name Admin --target-org my-sandbox --output-dir src/profiles
```

---

## What Does `--clean` Remove?

When the `--clean` flag is set, the following org-specific elements are stripped from the profile XML:

| Element           | Why Remove?                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `<loginIpRanges>` | IP restrictions are environment-specific and may block access in other orgs |
| `<loginHours>`    | Login hour restrictions vary by org policy                                  |
| `<userLicense>`   | License types may differ between production and sandboxes                   |

This makes profiles safely portable across sandbox, scratch org, and production environments.

---

## Architecture

```
src/
├── commands/
│   └── profile/
│       └── retrieve/
│           └── full.ts              # CLI command definition (Oclif)
├── services/
│   ├── profileMetadataService.ts    # readMetadata() API call + batching
│   ├── profileCleaner.ts           # XML cleaning / non-portable element removal
│   └── formatConverter.ts          # Writes .profile-meta.xml to disk
├── types/
│   └── profileTypes.ts             # Shared TypeScript interfaces
└── index.ts                        # Plugin entry point
```

### How It Works

```
┌──────────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│  CLI Command     │────▶│ ProfileMetadataService │────▶│ Salesforce Org   │
│  (full.ts)       │     │ (batched readMetadata) │     │ Metadata API     │
└──────────────────┘     └───────────────────────┘     └─────────────────┘
        │                           │
        ▼                           ▼
┌──────────────────┐     ┌───────────────────────┐
│ ProfileCleaner   │     │   Raw Profile XML      │
│ (optional clean) │     │   (complete data)      │
└──────────────────┘     └───────────────────────┘
        │
        ▼
┌──────────────────┐
│ FormatConverter   │
│ (.profile-meta.xml)│
└──────────────────┘
```

1. **Command** parses flags and resolves profile names (from `--name`, `--sourcedir`, or `--all`).
2. **ProfileMetadataService** calls `connection.metadata.read('Profile', batch)` in chunks of 10 (API limit), then builds XML using `fast-xml-parser`.
3. **ProfileCleaner** (if `--clean` is set) parses the XML tree and removes non-portable nodes.
4. **FormatConverter** writes the final XML to `<outputDir>/<ProfileName>.profile-meta.xml`.

---

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Tech Stack

| Dependency                           | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| `@oclif/core`                        | CLI framework                                |
| `@salesforce/sf-plugins-core`        | Salesforce CLI plugin base classes           |
| `@salesforce/core`                   | Org authentication and Connection management |
| `@salesforce/source-deploy-retrieve` | Salesforce DX source format utilities        |
| `fast-xml-parser`                    | XML parsing and building                     |
| `TypeScript`                         | Type-safe development                        |
| `Mocha + Chai + Sinon`               | Testing framework                            |
| `c8`                                 | Code coverage                                |

---

## License

[MIT](LICENSE)
