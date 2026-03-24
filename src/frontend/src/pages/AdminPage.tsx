import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  Layout,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Entry__1, Entry__2 } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAssignUserRole,
  useCreateAd,
  useCreateTemplate,
  useDeleteAd,
  useDeleteTemplate,
  useIsCallerAdmin,
  useListAds,
  useListTemplates,
  useUpdateAd,
  useUpdateTemplate,
} from "../hooks/useQueries";

export default function AdminPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  if (!identity) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">
          Authentication Required
        </h2>
        <Button
          onClick={() => navigate({ to: "/login" })}
          className="rounded-full"
          data-ocid="admin.login.primary_button"
        >
          Sign In
        </Button>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center"
        data-ocid="admin.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          Access Denied
        </h2>
        <p className="text-muted-foreground text-center">
          You need admin privileges to access this page.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/" })}
          className="rounded-full"
          data-ocid="admin.access_denied.button"
        >
          Go Home
        </Button>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage ads, templates, and user roles
        </p>
      </div>
      <Tabs defaultValue="ads" data-ocid="admin.tabs.tab">
        <TabsList className="mb-6">
          <TabsTrigger value="ads" className="gap-1.5">
            <Megaphone className="w-4 h-4" /> Ads
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Layout className="w-4 h-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ads">
          <AdsTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdsTab() {
  const { data: ads, isLoading } = useListAds();
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const deleteAd = useDeleteAd();
  const [editing, setEditing] = useState<Entry__2 | null>(null);
  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
  });
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ title: "", imageUrl: "", linkUrl: "", isActive: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (ad: Entry__2) => {
    setEditing(ad);
    setForm({
      title: ad.title,
      imageUrl: ad.imageUrl,
      linkUrl: ad.linkUrl,
      isActive: ad.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editing) {
        await updateAd.mutateAsync({ id: editing.id, payload: form });
        toast.success("Ad updated");
      } else {
        await createAd.mutateAsync(form);
        toast.success("Ad created");
      }
      resetForm();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this ad?")) return;
    try {
      await deleteAd.mutateAsync(id);
      toast.success("Ad deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground">
          Manage Ads
        </h2>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({ title: "", imageUrl: "", linkUrl: "", isActive: true });
          }}
          size="sm"
          className="rounded-full gap-1.5"
          data-ocid="admin.ads.open_modal_button"
        >
          <Plus className="w-4 h-4" /> New Ad
        </Button>
      </div>

      {showForm && (
        <div
          className="bg-secondary rounded-2xl border border-border p-5 space-y-4"
          data-ocid="admin.ads.dialog"
        >
          <h3 className="font-semibold text-sm">
            {editing ? "Edit Ad" : "Create New Ad"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Summer Sale Promo"
                className="mt-1"
                data-ocid="admin.ads.title.input"
              />
            </div>
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, imageUrl: e.target.value }))
                }
                placeholder="https://…"
                className="mt-1"
                data-ocid="admin.ads.image_url.input"
              />
            </div>
            <div>
              <Label className="text-xs">Link URL</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, linkUrl: e.target.value }))
                }
                placeholder="https://…"
                className="mt-1"
                data-ocid="admin.ads.link_url.input"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                data-ocid="admin.ads.active.switch"
              />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createAd.isPending || updateAd.isPending}
              size="sm"
              className="gap-1.5"
              data-ocid="admin.ads.submit_button"
            >
              {createAd.isPending || updateAd.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {editing ? "Save Changes" : "Create Ad"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              data-ocid="admin.ads.cancel_button"
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2" data-ocid="admin.ads.loading_state">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!ads || ads.length === 0) && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="admin.ads.empty_state"
        >
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No ads yet. Create your first ad.</p>
        </div>
      )}

      {!isLoading && ads && ads.length > 0 && (
        <div className="space-y-2">
          {ads.map((ad, idx) => (
            <div
              key={String(ad.id)}
              className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
              data-ocid={`admin.ads.item.${idx + 1}`}
            >
              {ad.imageUrl && (
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {ad.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {ad.linkUrl}
                </p>
              </div>
              <Badge
                variant={ad.isActive ? "default" : "secondary"}
                className="text-xs flex-shrink-0"
              >
                {ad.isActive ? "Active" : "Inactive"}
              </Badge>
              <button
                type="button"
                onClick={() => handleEdit(ad)}
                className="p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Edit"
                data-ocid={`admin.ads.edit_button.${idx + 1}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(ad.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500"
                aria-label="Delete"
                data-ocid={`admin.ads.delete_button.${idx + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const { data: templates, isLoading } = useListTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [editing, setEditing] = useState<Entry__1 | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    overlayImageUrl: "",
    isActive: true,
  });
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ name: "", description: "", overlayImageUrl: "", isActive: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (t: Entry__1) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description,
      overlayImageUrl: t.overlayImageUrl,
      isActive: t.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editing) {
        await updateTemplate.mutateAsync({ id: editing.id, payload: form });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync(form);
        toast.success("Template created");
      }
      resetForm();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground">
          Manage Templates
        </h2>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({
              name: "",
              description: "",
              overlayImageUrl: "",
              isActive: true,
            });
          }}
          size="sm"
          className="rounded-full gap-1.5"
          data-ocid="admin.templates.open_modal_button"
        >
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {showForm && (
        <div
          className="bg-secondary rounded-2xl border border-border p-5 space-y-4"
          data-ocid="admin.templates.dialog"
        >
          <h3 className="font-semibold text-sm">
            {editing ? "Edit Template" : "Create New Template"}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Invoice Template"
                className="mt-1"
                data-ocid="admin.templates.name.input"
              />
            </div>
            <div>
              <Label className="text-xs">Overlay Image URL</Label>
              <Input
                value={form.overlayImageUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, overlayImageUrl: e.target.value }))
                }
                placeholder="https://…"
                className="mt-1"
                data-ocid="admin.templates.overlay_url.input"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="A clean invoice layout…"
                className="mt-1"
                data-ocid="admin.templates.description.input"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                data-ocid="admin.templates.active.switch"
              />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createTemplate.isPending || updateTemplate.isPending}
              size="sm"
              className="gap-1.5"
              data-ocid="admin.templates.submit_button"
            >
              {createTemplate.isPending || updateTemplate.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {editing ? "Save Changes" : "Create Template"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              data-ocid="admin.templates.cancel_button"
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2" data-ocid="admin.templates.loading_state">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!templates || templates.length === 0) && (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="admin.templates.empty_state"
        >
          <Layout className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            No templates yet. Create your first template.
          </p>
        </div>
      )}

      {!isLoading && templates && templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((t, idx) => (
            <div
              key={String(t.id)}
              className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
              data-ocid={`admin.templates.item.${idx + 1}`}
            >
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <Layout className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.description}
                </p>
              </div>
              <Badge
                variant={t.isActive ? "default" : "secondary"}
                className="text-xs flex-shrink-0"
              >
                {t.isActive ? "Active" : "Inactive"}
              </Badge>
              <button
                type="button"
                onClick={() => handleEdit(t)}
                className="p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Edit"
                data-ocid={`admin.templates.edit_button.${idx + 1}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500"
                aria-label="Delete"
                data-ocid={`admin.templates.delete_button.${idx + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [principalText, setPrincipalText] = useState("");
  const [role, setRole] = useState("user");
  const assignRole = useAssignUserRole();

  const handleAssign = async () => {
    if (!principalText.trim()) {
      toast.error("Principal ID is required");
      return;
    }
    try {
      await assignRole.mutateAsync({
        principalText: principalText.trim(),
        role,
      });
      toast.success(`Role "${role}" assigned successfully`);
      setPrincipalText("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign role");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-lg text-foreground mb-1">
          User Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Assign roles to users by their Internet Identity principal.
        </p>
      </div>

      <div className="bg-secondary rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm">Assign Role to User</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Principal ID</Label>
            <Input
              value={principalText}
              onChange={(e) => setPrincipalText(e.target.value)}
              placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
              className="mt-1 font-mono text-xs"
              data-ocid="admin.users.principal.input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Users can find their principal in their account settings.
            </p>
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <div className="flex gap-2 mt-1">
              {["admin", "user", "guest"].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    role === r
                      ? "bg-primary text-white"
                      : "bg-white border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  data-ocid={`admin.users.role_${r}.button`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleAssign}
            disabled={assignRole.isPending || !principalText.trim()}
            className="gap-1.5"
            data-ocid="admin.users.assign.submit_button"
          >
            {assignRole.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Assign Role
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Role Descriptions
        </h3>
        <div className="space-y-3">
          {[
            {
              r: "admin",
              desc: "Full access — manage ads, templates, and assign user roles.",
              icon: <ToggleRight className="w-4 h-4 text-primary" />,
            },
            {
              r: "user",
              desc: "Standard access — scan documents, save and manage their own PDFs.",
              icon: <ToggleLeft className="w-4 h-4 text-muted-foreground" />,
            },
            {
              r: "guest",
              desc: "Limited access — can scan but cannot save to the cloud.",
              icon: <ToggleLeft className="w-4 h-4 text-muted-foreground" />,
            },
          ].map(({ r, desc, icon }) => (
            <div key={r} className="flex gap-3">
              <div className="mt-0.5">{icon}</div>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {r}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
