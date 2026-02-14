# summary

Retrieve full Profile metadata using the Metadata API readMetadata() call.

# description

Retrieves complete Profile XML definitions directly from the Metadata API, bypassing the standard retrieve's "sparse" behavior. Unlike `sf project retrieve`, this command returns ALL field-level security, layout assignments, class access, and page access — not just the sections that correspond to other components in your project.

The command uses the `readMetadata()` API call which returns the full object definition regardless of what is in your local project or manifest.

# flags.name.summary

Comma-separated list of Profile names to retrieve (e.g., Admin,"Custom Sales Profile").

# flags.output-dir.summary

Directory to save the retrieved profiles. Defaults to force-app/main/default/profiles.

# flags.clean.summary

Strip non-portable permissions (IP ranges, login hours, user license) from the retrieved profiles.

# flags.sourcedir.summary

Path to a directory containing .profile-meta.xml files. All profiles found will be retrieved.

# flags.all.summary

Retrieve all profiles from the target org.

# examples

- Retrieve the Admin profile from a specific org:

  <%= config.bin %> <%= command.id %> --name Admin --target-org my-sandbox

- Retrieve multiple profiles (comma-separated):

  <%= config.bin %> <%= command.id %> --name Admin,"Custom Sales Profile",Standard --target-org my-sandbox

- Retrieve all profiles from an existing source directory:

  <%= config.bin %> <%= command.id %> --sourcedir force-app/main/default/profiles --target-org my-sandbox

- Retrieve every profile from the org:

  <%= config.bin %> <%= command.id %> --all --target-org my-sandbox

- Retrieve and clean non-portable elements:

  <%= config.bin %> <%= command.id %> --name Admin --target-org my-sandbox --clean

- Save to a custom directory:

  <%= config.bin %> <%= command.id %> --name Admin --target-org my-sandbox --output-dir src/profiles
