import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Payload__2 {
    name: string;
    blobId: string;
    sizeBytes: bigint;
}
export interface Payload {
    name: string;
    description: string;
    overlayImageUrl: string;
    isActive: boolean;
}
export interface Update {
    name?: string;
    timestamp?: bigint;
    blobId?: string;
    sizeBytes?: bigint;
}
export interface PaymentRecord {
    id: string;
    userId: Principal;
    upiRef: string;
    timestamp: bigint;
    amount: bigint;
}
export interface Payload__1 {
    title: string;
    linkUrl: string;
    isActive: boolean;
    imageUrl: string;
}
export interface Entry {
    id: Id__1;
    name: string;
    timestamp: bigint;
    blobId: string;
    sizeBytes: bigint;
}
export type Id__1 = string;
export interface Entry__2 {
    id: Id;
    title: string;
    linkUrl: string;
    isActive: boolean;
    imageUrl: string;
}
export type Id = bigint;
export interface Entry__1 {
    id: Id;
    name: string;
    description: string;
    overlayImageUrl: string;
    isActive: boolean;
}
export interface UserProfile {
    isPremium: boolean;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAd(payload: Payload__1): Promise<Entry__2>;
    createTemplate(payload: Payload): Promise<Entry__1>;
    deleteAd(id: Id): Promise<void>;
    deleteScan(scanId: Id__1): Promise<void>;
    deleteTemplate(id: Id): Promise<void>;
    getCallerPremiumStatus(): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getScan(scanId: Id__1): Promise<Entry>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listActiveAds(): Promise<Array<Entry__2>>;
    listActiveTemplates(): Promise<Array<Entry__1>>;
    listAds(): Promise<Array<Entry__2>>;
    listCallerPayments(): Promise<Array<PaymentRecord>>;
    listScans(): Promise<Array<Entry>>;
    listTemplates(): Promise<Array<Entry__1>>;
    markCallerPremium(amount: bigint, upiRef: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveScan(payload: Payload__2): Promise<Entry>;
    updateAd(id: Id, payload: Payload__1): Promise<void>;
    updateScan(scanId: Id__1, updates: Update): Promise<Entry>;
    updateTemplate(id: Id, payload: Payload): Promise<void>;
}
