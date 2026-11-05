import { collection, query, where, getDocs, Firestore } from 'firebase/firestore';

export interface AuthDomain {
  id: string;
  retailerName: string;
  domain: string;
  countryName?: string;
  countryId?: string;
  createdAt?: any;
}

export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  matchedRetailer?: string;
}

/**
 * Validates whether a work email's domain is authorized for a specific retailer.
 * Checks both the domain and the retailer association in `auth_domains`.
 */
export async function validateWorkEmailDomain(
  firestore: Firestore,
  workEmail: string,
  userRetailer?: string
): Promise<DomainValidationResult> {
  const emailTrimmed = workEmail?.trim().toLowerCase();
  if (!emailTrimmed || !emailTrimmed.includes('@')) {
    return { isValid: false, error: 'Please enter a valid work email address.' };
  }

  const parts = emailTrimmed.split('@');
  const domain = parts[parts.length - 1]?.trim().toLowerCase();
  if (!domain) {
    return { isValid: false, error: 'Invalid work email domain format.' };
  }

  if (!userRetailer || !userRetailer.trim()) {
    return {
      isValid: false,
      error: 'Please select your retailer first before verifying your work email.',
    };
  }

  const normalizedUserRetailer = userRetailer.trim();

  // Query auth_domains for this domain (checking both lowercase and raw domain)
  const authDomainsRef = collection(firestore, 'auth_domains');
  const q = query(authDomainsRef, where('domain', '==', domain));
  let querySnapshot = await getDocs(q);

  // Fallback for uppercase or legacy entries
  if (querySnapshot.empty) {
    const qUpper = query(authDomainsRef, where('domain', '==', domain.toUpperCase()));
    querySnapshot = await getDocs(qUpper);
  }

  if (querySnapshot.empty) {
    return {
      isValid: false,
      error: `The domain "${domain}" is not an authorized domain.`,
    };
  }

  // Check if any matching record is linked to this user's retailer
  const matchingRecords = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as { retailerName?: string; domain?: string }),
  }));

  const retailerMatch = matchingRecords.find(
    record =>
      record.retailerName &&
      record.retailerName.trim().toLowerCase() === normalizedUserRetailer.toLowerCase()
  );

  if (!retailerMatch) {
    const registeredRetailers = Array.from(
      new Set(matchingRecords.map(r => r.retailerName?.trim()).filter(Boolean))
    );

    const detailMsg =
      registeredRetailers.length > 0
        ? ` (domain is associated with: ${registeredRetailers.join(', ')})`
        : '';

    return {
      isValid: false,
      error: `The email domain "${domain}" is not authorized for "${normalizedUserRetailer}"${detailMsg}. Please use your authorized ${normalizedUserRetailer} work email.`,
    };
  }

  return {
    isValid: true,
    matchedRetailer: retailerMatch.retailerName,
  };
}
