export interface ClaimKeyPair {
    PrivateKey: string;
    PublicKey: string;
}

export interface ProvisioningClaimResponse {
    message: string;
    certificateId: string;
    certificatePem: string;
    keyPair: ClaimKeyPair;
    expiration: string;
} 