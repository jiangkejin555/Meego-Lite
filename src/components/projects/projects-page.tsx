"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  ListTodo,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  PROJECT_PRIORITY_COLOR,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_COLOR,
  PROJECT_STATUS_LABEL,
} from "@/lib/constants";
import { deleteProject, useProjects, type ProjectItem } from "@/lib/projects";
import { formatUserName, getUserInitials } from "@/lib/users";
import { ProjectFormDialog } from "./project-form";

export function ProjectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setView = useAppStore((s) => s.setView);
  const setFilter = useAppStore((s) => s.setFilter);
  const resetFilter = useAppStore((s) => s.resetFilter);
  const currentUser = useAppStore((s) => s.currentUser);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useProjects();

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-stats"] });
      toast({ title: "项目已删除" });
      setDeleteId(null);
    },
    onError: (e: Error) => {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: ProjectItem) => {
    setEditing(p);
    setFormOpen(true);
  };

  const viewTasks = (p: ProjectItem) => {
    resetFilter();
    setFilter({ projectId: p.id });
    setView("tasks");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {projects.length} 个项目，可在创建任务时关联到对应项目
        </p>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-40 animate-pulse" />
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <FolderKanban className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            还没有项目，点击右上角「新建项目」开始吧
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const isCreator = !!currentUser && p.creatorId === currentUser.id;
            const ownershipLabel = !p.creatorId
              ? "未知来源"
              : isCreator
              ? "我创建的"
              : `${p.creator ? formatUserName(p.creator) : "他人"} 授权`;
            return (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="pt-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p._count.tasks} 个任务
                      </p>
                    </div>
                  </div>
                  {isCreator && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(p)}
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        onClick={() => setDeleteId(p.id)}
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    className={cn(
                      "border-0 shadow-none font-medium",
                      isCreator
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {ownershipLabel}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-0 shadow-none font-medium",
                      PROJECT_STATUS_COLOR[p.status]
                    )}
                  >
                    {PROJECT_STATUS_LABEL[p.status]}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-0 shadow-none font-medium",
                      PROJECT_PRIORITY_COLOR[p.priority]
                    )}
                  >
                    {PROJECT_PRIORITY_LABEL[p.priority]}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                    {p.owners.length > 0 ? (
                      <>
                        <div className="flex -space-x-1.5">
                          {p.owners.slice(0, 3).map((o) => (
                            <Avatar
                              key={o.id}
                              className="h-5 w-5 ring-2 ring-background"
                            >
                              <AvatarFallback className="text-[9px]">
                                {getUserInitials(o)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="truncate">
                          {p.owners
                            .slice(0, 2)
                            .map((o) => formatUserName(o))
                            .join("、")}
                          {p.owners.length > 2 && ` 等 ${p.owners.length} 人`}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5" />
                        未指定负责人
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs shadow-none gap-1 shrink-0"
                    onClick={() => viewTasks(p)}
                  >
                    <ListTodo className="h-3.5 w-3.5" />
                    查看任务
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <ProjectFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          project={editing}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除该项目？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，该项目下的任务将解除关联（任务本身保留）。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
