/**
 * Shared types for the sf-profile-full plugin.
 */

/** Result for a single profile retrieval. */
export interface ProfileRetrieveResult {
  /** The API name of the profile. */
  name: string;
  /** Whether the retrieval succeeded. */
  success: boolean;
  /** Absolute file path where the profile was written (if successful). */
  filePath?: string;
  /** Error message if retrieval failed. */
  error?: string;
}

/** Aggregate result returned by the command. */
export interface ProfileRetrieveFullResult {
  /** Individual results per profile. */
  profiles: ProfileRetrieveResult[];
  /** Total number of profiles requested. */
  totalRequested: number;
  /** Number successfully retrieved. */
  totalSuccess: number;
  /** Number that failed. */
  totalFailed: number;
}

/** Configuration for which elements to strip during cleaning. */
export interface CleanOptions {
  /** Remove <loginIpRanges> elements. */
  removeLoginIpRanges: boolean;
  /** Remove <userLicense> element. */
  removeUserLicense: boolean;
  /** Remove <loginHours> elements. */
  removeLoginHours: boolean;
}

/** Default cleaning configuration — removes all non-portable elements. */
export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
  removeLoginIpRanges: true,
  removeUserLicense: true,
  removeLoginHours: true,
};
