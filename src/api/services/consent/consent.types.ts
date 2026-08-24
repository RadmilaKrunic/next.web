export interface ConsentVersion {
  isNewVersionAvailable: boolean;
  newVersionName: string | null;
}

export interface ConsentData {
  isConsentUpdateRequired: boolean;
  tac: ConsentVersion;
  privacy: ConsentVersion;
}

export interface ConsentAcceptPayload {
  acceptedTacVersion: string | null;
  acceptedPrivacyVersion: string | null;
  locale: string;
}
