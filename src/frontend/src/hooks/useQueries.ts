import { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Entry, Entry__1, Entry__2, UserProfile } from "../backend.d";
import { useActor } from "./useActor";

// ── Profile ──────────────────────────────────────────────────────────────────
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["currentUserProfile"] }),
  });
}

// ── Auth / Roles ─────────────────────────────────────────────────────────────
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) return "guest";
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      principalText,
      role,
    }: { principalText: string; role: string }) => {
      if (!actor) throw new Error("Not connected");
      const principal = Principal.fromText(principalText);
      return actor.assignCallerUserRole(principal, role as any);
    },
  });
}

// ── Scans ────────────────────────────────────────────────────────────────────
export function useListScans() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry[]>({
    queryKey: ["scans"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listScans();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveScan() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      blobId: string;
      sizeBytes: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveScan(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scans"] }),
  });
}

export function useDeleteScan() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scanId: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteScan(scanId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scans"] }),
  });
}

// ── Premium ──────────────────────────────────────────────────────────────────
export function useGetCallerPremiumStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["callerPremiumStatus"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.getCallerPremiumStatus();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMarkCallerPremium() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      upiRef,
    }: { amount: bigint; upiRef: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.markCallerPremium(amount, upiRef);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["callerPremiumStatus"] }),
  });
}

export function useListCallerPayments() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerPayments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCallerPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

// ── Ads ────────────────────────────────────────────────────────────────────────
export function useListActiveAds() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry__2[]>({
    queryKey: ["activeAds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listActiveAds();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAds() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry__2[]>({
    queryKey: ["ads"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAds();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAd() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      linkUrl: string;
      isActive: boolean;
      imageUrl: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createAd(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });
}

export function useUpdateAd() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: bigint;
      payload: {
        title: string;
        linkUrl: string;
        isActive: boolean;
        imageUrl: string;
      };
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateAd(id, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });
}

export function useDeleteAd() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAd(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });
}

// ── Templates ──────────────────────────────────────────────────────────────────
export function useListActiveTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry__1[]>({
    queryKey: ["activeTemplates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listActiveTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<Entry__1[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTemplates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      overlayImageUrl: string;
      isActive: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createTemplate(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: bigint;
      payload: {
        name: string;
        description: string;
        overlayImageUrl: string;
        isActive: boolean;
      };
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateTemplate(id, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteTemplate(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}
