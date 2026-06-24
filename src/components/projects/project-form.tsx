"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  type ProjectPriority,
  type ProjectStatus,
} from "@/lib/constants";
import {
  createProject,
  updateProject,
  type ProjectItem,
} from "@/lib/projects";
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project-utils";
import { formatUserName } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  deletedAt?: string | null;
}

async function fetchUsers(): Promise<UserItem[]> {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  return data.users as UserItem[];
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectItem | null;
}) {
  const isEdit = !!project;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAppStore((s) => s.currentUser);

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "not_started"
  );
  const [priority, setPriority] = useState<ProjectPriority>(
    project?.priority ?? "p2"
  );
  const [ownerIds, setOwnerIds] = useState<string[]>(
    project?.owners
      .map((o) => o.id)
      .filter((id) => id !== currentUser?.id) ?? []
  );
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const selectableUsers = users.filter((u) => u.id !== currentUser?.id);

  const toggleOwner = (id: string) => {
    setOwnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedOwners = ownerIds
    .filter((id) => id !== currentUser?.id)
    .map(
      (id) =>
        users.find((u) => u.id === id) ??
        project?.owners.find((owner) => owner.id === id)
    )
    .filter((u): u is UserItem => !!u);

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isEdit ? updateProject(project!.id, payload) : createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      toast({ title: isEdit ? "项目已更新" : "项目创建成功" });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast({
        title: isEdit ? "更新失败" : "创建失败",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "请填写项目名称", variant: "destructive" });
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      status,
      priority,
      ownerIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑项目" : "新建项目"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="pname">
                项目名称 <span className="text-rose-500">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {name.length}/{PROJECT_NAME_MAX_LENGTH}
              </span>
            </div>
            <Input
              id="pname"
              placeholder="如：2026 Q3 商业化升级"
              value={name}
              maxLength={PROJECT_NAME_MAX_LENGTH}
              onChange={(e) =>
                setName(e.target.value.slice(0, PROJECT_NAME_MAX_LENGTH))
              }
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pdesc">项目描述</Label>
            <Textarea
              id="pdesc"
              className="min-h-[90px] resize-y"
              placeholder="简要描述项目目标、范围等"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>用户授权</Label>
            <p className="text-xs text-muted-foreground">
              被授权的用户可查看并修改该项目下的所有任务
            </p>
            <Popover open={ownerPickerOpen} onOpenChange={setOwnerPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={ownerPickerOpen}
                  className="w-full justify-between font-normal h-auto min-h-9 py-1.5"
                >
                  {selectedOwners.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {selectedOwners.map((o) => (
                        <Badge
                          key={o.id}
                          variant="secondary"
                          className="gap-1 font-normal"
                        >
                          {formatUserName(o)}
                          <span
                            role="button"
                            tabIndex={-1}
                            className="hover:text-rose-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOwner(o.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">暂不授权</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="搜索用户..." />
                  <CommandList>
                    <CommandEmpty>未找到用户</CommandEmpty>
                    <CommandGroup>
                      {selectableUsers.map((u) => {
                        const checked = ownerIds.includes(u.id);
                        return (
                          <CommandItem
                            key={u.id}
                            value={u.name}
                            onSelect={() => toggleOwner(u.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                checked ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {formatUserName(u)}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map(
                    (k) => (
                      <SelectItem key={k} value={k}>
                        {PROJECT_STATUS_LABEL[k]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ProjectPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(PROJECT_PRIORITY_LABEL) as ProjectPriority[]
                  ).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PROJECT_PRIORITY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="min-w-[96px]"
          >
            {mutation.isPending
              ? "保存中..."
              : isEdit
              ? "保存修改"
              : "创建项目"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
