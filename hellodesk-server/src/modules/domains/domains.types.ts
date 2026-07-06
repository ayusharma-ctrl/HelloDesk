export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

export interface DomainDto {
    id: string;
    domain: string;
    verificationStatus: DomainVerificationStatus;
    verificationToken: string;
    sslIssuedAt: Date | null;
    createdAt: Date;
}
