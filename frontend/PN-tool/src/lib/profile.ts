/**
 * Short Name Generation Utility
 * Generates 2-character initials for user avatars based on STAAK standards.
 */

interface ProfileData {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  short_name?: string | null;
}

/**
 * Generate a short name (initials) for display in the user avatar.
 * Priority:
 * 1. Use existing short_name if already set in database
 * 2. Generate from first_name + last_name initials
 * 3. Generate from full_name (first 2 words' initials)
 * 4. Fallback to first character of email
 * 5. Ultimate fallback: "?"
 */
export const generateShortName = (
  profile: ProfileData | null,
  email?: string | null
): string => {
  // 1. Use existing short_name if set
  if (profile?.short_name) {
    return profile.short_name;
  }

  // 2. Generate from first_name + last_name
  if (profile?.first_name || profile?.last_name) {
    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;
    return initials.toUpperCase() || '?';
  }

  // 3. Generate from full_name
  if (profile?.full_name) {
    const parts = profile.full_name.trim().split(' ').filter(Boolean);
    const initials = parts.map(p => p[0]).join('').slice(0, 2);
    return initials.toUpperCase() || '?';
  }

  // 4. Fallback to first character of email
  if (email) {
    return email[0].toUpperCase();
  }

  // 5. Ultimate fallback
  return '?';
};

/**
 * Get display name for user, with fallbacks
 */
export const getDisplayName = (
  profile: ProfileData | null,
  email?: string | null
): string => {
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }
  if (profile?.first_name) {
    return profile.first_name;
  }
  if (profile?.full_name) {
    return profile.full_name;
  }
  if (email) {
    return email.split('@')[0];
  }
  return 'User';
};
