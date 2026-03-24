import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export default function ProfileSetup() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: profile, isLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const [name, setName] = useState("");

  const showSetup =
    isAuthenticated && !isLoading && isFetched && profile === null;

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await saveProfile.mutateAsync({ name: name.trim(), isPremium: false });
      toast.success("Profile saved! Welcome to Scanify.");
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  return (
    <Dialog open={showSetup}>
      <DialogContent className="sm:max-w-md" data-ocid="profile_setup.dialog">
        <DialogHeader>
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
            <User className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            Welcome to Scanify!
          </DialogTitle>
          <DialogDescription className="text-center">
            What should we call you? This name will appear on your documents.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="profile-name">Your Name</Label>
            <Input
              id="profile-name"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="mt-1.5"
              data-ocid="profile_setup.input"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saveProfile.isPending}
            className="w-full rounded-full"
            data-ocid="profile_setup.submit_button"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
