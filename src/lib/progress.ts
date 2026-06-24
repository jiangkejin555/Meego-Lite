import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";

type ProgressUpdateWriter = {
  progressUpdate: {
    create(args: {
      data: {
        taskId: string;
        userId: string;
        status: string;
        content: string;
      };
    }): Promise<unknown>;
  };
};

export function buildTaskCreatedProgressContent() {
  return "任务已创建";
}

export function buildTaskStatusChangedProgressContent(status: TaskStatus) {
  return `任务状态已更新为「${TASK_STATUS_LABEL[status]}」`;
}

export async function createTaskProgressUpdate(
  client: ProgressUpdateWriter,
  {
    taskId,
    userId,
    status,
    content,
  }: {
    taskId: string;
    userId: string;
    status: TaskStatus;
    content: string;
  }
) {
  return client.progressUpdate.create({
    data: {
      taskId,
      userId,
      status,
      content,
    },
  });
}
