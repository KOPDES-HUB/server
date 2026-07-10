import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";

const DashboardController = {
  getEmployeeRecap: async (req: Request, res: Response) => {
    try {
      const dateFilter = req.query.dateFilter as string;

      const andConditions: any[] = [];
      if (dateFilter) {
        const now = new Date();
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;

        if (dateFilter === "today") {
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff,
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff + 6,
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_month") {
          startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
        } else {
          // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
          const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
          const match = dateFilter.match(dateRegex);
          if (match) {
            const start = new Date(match[1]);
            const end = match[2] ? new Date(match[2]) : start;
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              startLimit = new Date(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                start.getUTCDate(),
                0,
                0,
                0,
              );
              endLimit = new Date(
                end.getUTCFullYear(),
                end.getUTCMonth(),
                end.getUTCDate(),
                23,
                59,
                59,
                999,
              );
            }
          }
        }

        if (startLimit && endLimit) {
          andConditions.push({
            startDatetime: { lte: endLimit },
          });
          andConditions.push({
            endDatetime: { gte: startLimit },
          });
        }
      }

      const assignmentsWhereCondition: any = {};
      if (andConditions.length > 0) {
        assignmentsWhereCondition.AND = andConditions;
      }

      // Find all pegawais & admins
      const users = await prisma.authUser.findMany({
        where: {
          authUserToGroup: {
            some: {
              group: {
                name: {
                  in: ["Pegawai"],
                },
              },
            },
          },
        },
        orderBy: {
          username: "asc",
        },
        select: {
          id: true,
          username: true,
          assignmentsReceived: {
            where: assignmentsWhereCondition,
            include: {
              project: { select: { name: true, code: true } },
              assignedBy: { select: { username: true } },
            },
            orderBy: { id: "desc" },
          },
          assignmentLogs: {
            include: {
              assignment: {
                include: {
                  project: { select: { name: true, code: true } },
                },
              },
            },
            orderBy: { changedAt: "asc" },
          },
        },
      });

      const recap = users.map((user) => {
        const assignments = user.assignmentsReceived;
        const total = assignments.length;
        const pending = assignments.filter(
          (a) => a.status === "PENDING",
        ).length;
        const pendingStatus = assignments.filter(
          (a) => a.status === "PENDING_STATUS",
        ).length;
        const inProgress = assignments.filter(
          (a) => a.status === "IN_PROGRESS",
        ).length;
        const completed = assignments.filter((a) =>
          ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(
            a.status,
          ),
        ).length;

        const now = new Date();
        const late = assignments.filter((a) => {
          if (a.completedAt) return a.completedAt > a.endDatetime;
          return (
            now > a.endDatetime &&
            !["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(
              a.status,
            )
          );
        }).length;

        return {
          id: user.id,
          username: user.username,
          stats: { total, pending, pendingStatus, inProgress, completed, late },
          tasks: assignments,
          assignmentLogs: user.assignmentLogs,
        };
      });

      return successResponse(res, "Rekap pegawai", recap);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil rekap", 500, error);
    }
  },

  getCalendarEvents: async (req: Request, res: Response) => {
    try {
      const { userId, projectId } = req.query;

      const where: any = {};
      if (userId) where.assignedToId = userId;
      if (projectId) where.projectId = projectId;

      // If regular employee, only see their own
      const userRoles = req.user!.roles || [];
      // To know if they are superadmin or admin, normally we'd check RBAC
      // but here we can just enforce if they lack MANAGE_PROJECT they only see theirs.
      // For now we'll fetch based on filters.
      // Assuming frontend handles visibility, or we can enforce:

      const assignments = await prisma.assignment.findMany({
        where,
        include: {
          project: { select: { name: true } },
          assignedTo: { select: { username: true } },
        },
      });

      const events = assignments.map((a) => {
        const now = new Date();
        const isLate = a.completedAt
          ? a.completedAt > a.endDatetime
          : now > a.endDatetime &&
            !["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(
              a.status,
            );

        return {
          id: a.id,
          title: `${a.project.name} - ${a.title} (${a.assignedTo.username})`,
          start: a.startDatetime,
          end: a.endDatetime,
          status: a.status,
          isLate,
          assignedTo: a.assignedTo.username,
        };
      });

      return successResponse(res, "Calendar events", events);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil event kalender", 500, error);
    }
  },

  getAnalytics: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const roles = req.user?.roles || [];
      const isAdmin =
        roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6") ||
        roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");

      const dateFilter = req.query.dateFilter as string;

      const whereCondition: any = {};
      if (!isAdmin && userId) {
        whereCondition.assignedToId = userId;
      }

      const andConditions: any[] = [];
      if (dateFilter) {
        const now = new Date();
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;

        if (dateFilter === "today") {
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff,
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff + 6,
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_month") {
          startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
        } else {
          // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
          const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
          const match = dateFilter.match(dateRegex);
          if (match) {
            const start = new Date(match[1]);
            const end = match[2] ? new Date(match[2]) : start;
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              startLimit = new Date(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                start.getUTCDate(),
                0,
                0,
                0,
              );
              endLimit = new Date(
                end.getUTCFullYear(),
                end.getUTCMonth(),
                end.getUTCDate(),
                23,
                59,
                59,
                999,
              );
            }
          }
        }

        if (startLimit && endLimit) {
          andConditions.push({
            startDatetime: { lte: endLimit },
          });
          andConditions.push({
            endDatetime: { gte: startLimit },
          });
        }
      }

      if (andConditions.length > 0) {
        if (!isAdmin && userId) {
          whereCondition.AND = [...andConditions, { assignedToId: userId }];
        } else {
          whereCondition.AND = andConditions;
        }
      }

      const assignments = await prisma.assignment.findMany({
        where: whereCondition,
        include: {
          project: { select: { name: true } },
          assignedTo: { select: { username: true } },
        },
      });

      // --- CALCULATE ANALYTICS ---

      const now = new Date();

      // Helper: cek apakah assignment dianggap "late"
      const isLate = (a: (typeof assignments)[number]) => {
        const completed = [
          "COMPLETED",
          "COMPLETED_LATE",
          "LATE_WITH_REASON",
        ].includes(a.status);
        const overdue = a.completedAt
          ? new Date(a.completedAt) > new Date(a.endDatetime)
          : now > new Date(a.endDatetime);
        return (
          overdue ||
          a.status === "COMPLETED_LATE" ||
          a.status === "LATE_WITH_REASON"
        );
      };

      const isCompleted = (a: (typeof assignments)[number]) =>
        ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(a.status);

      // A. Status Distribution
      const statusCounts = {
        PENDING: 0,
        PENDING_STATUS: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        LATE: 0,
      };

      assignments.forEach((a) => {
        const completed = isCompleted(a);
        const overdue = a.completedAt
          ? new Date(a.completedAt) > new Date(a.endDatetime)
          : now > new Date(a.endDatetime);

        if (
          (overdue && !completed) ||
          a.status === "COMPLETED_LATE" ||
          a.status === "LATE_WITH_REASON"
        ) {
          statusCounts.LATE++;
        } else if (a.status === "COMPLETED") {
          statusCounts.COMPLETED++;
        } else if (a.status === "IN_PROGRESS") {
          statusCounts.IN_PROGRESS++;
        } else if (a.status === "PENDING_STATUS") {
          statusCounts.PENDING_STATUS++;
        } else {
          statusCounts.PENDING++;
        }
      });

      // B. Tasks Per Project
      const projectMap = new Map<string, any[]>();
      assignments.forEach((a) => {
        const pName = a.project.name;
        if (!projectMap.has(pName)) {
          projectMap.set(pName, []);
        }
        projectMap.get(pName)!.push({
          id: a.id,
          title: a.title,
          description: a.description || null,
          assignedTo: a.assignedTo.username,
          status: a.status,
          startDatetime: a.startDatetime,
          endDatetime: a.endDatetime,
        });
      });
      const tasksPerProject = Array.from(projectMap.entries()).map(
        ([name, tasks]) => ({ name, count: tasks.length, tasks }),
      );

      // C. Tasks Per Employee (Admin only)
      let tasksPerEmployee: { name: string; count: number }[] = [];
      if (isAdmin) {
        const employeeMap = new Map<string, number>();
        assignments.forEach((a) => {
          const empName = a.assignedTo.username;
          employeeMap.set(empName, (employeeMap.get(empName) || 0) + 1);
        });
        tasksPerEmployee = Array.from(employeeMap.entries()).map(
          ([name, count]) => ({ name, count }),
        );
      }

      // D. Performance Trend (last 6 months)
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const trendMap = new Map<
        string,
        { created: number; completed: number }
      >();

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        trendMap.set(`${months[d.getMonth()]} ${d.getFullYear()}`, {
          created: 0,
          completed: 0,
        });
      }

      assignments.forEach((a) => {
        if (a.createdAt) {
          const label = `${months[new Date(a.createdAt).getMonth()]} ${new Date(a.createdAt).getFullYear()}`;
          if (trendMap.has(label)) trendMap.get(label)!.created++;
        }
        if (a.completedAt) {
          const label = `${months[new Date(a.completedAt).getMonth()]} ${new Date(a.completedAt).getFullYear()}`;
          if (trendMap.has(label)) trendMap.get(label)!.completed++;
        }
      });

      const trendData = Array.from(trendMap.entries()).map(
        ([label, stats]) => ({ label, ...stats }),
      );

      // E. [NEW] Completion Rate Per Project
      // Persentase task selesai (termasuk terlambat) per proyek
      const projectCompletionMap = new Map<
        string,
        { total: number; completed: number; late: number }
      >();
      assignments.forEach((a) => {
        const pName = a.project.name;
        if (!projectCompletionMap.has(pName)) {
          projectCompletionMap.set(pName, { total: 0, completed: 0, late: 0 });
        }
        const entry = projectCompletionMap.get(pName)!;
        entry.total++;
        if (isCompleted(a)) entry.completed++;
        if (isLate(a)) entry.late++;
      });

      const completionRatePerProject = Array.from(
        projectCompletionMap.entries(),
      ).map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
        late: data.late,
        completionRate:
          data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        onTimeRate:
          data.total > 0
            ? Math.round(((data.completed - data.late) / data.total) * 100)
            : 0,
      }));

      // F. [NEW] Average Completion Time Per Project (dalam hari)
      // Hanya assignment yang punya completedAt
      const completionTimeMap = new Map<string, number[]>();
      assignments.forEach((a) => {
        if (a.completedAt && a.createdAt) {
          const pName = a.project.name;
          const diffMs =
            new Date(a.completedAt).getTime() - new Date(a.createdAt).getTime();
          const diffDays = parseFloat(
            (diffMs / (1000 * 60 * 60 * 24)).toFixed(1),
          );
          if (!completionTimeMap.has(pName)) completionTimeMap.set(pName, []);
          completionTimeMap.get(pName)!.push(diffDays);
        }
      });

      const avgCompletionTimePerProject = Array.from(
        completionTimeMap.entries(),
      ).map(([name, times]) => ({
        name,
        avgDays: parseFloat(
          (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1),
        ),
        minDays: Math.min(...times),
        maxDays: Math.max(...times),
        taskCount: times.length,
      }));

      // G. [NEW] Weekly Activity Distribution
      // Distribusi task dibuat per hari dalam seminggu (0=Sun, 1=Mon, dst)
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekdayCreated = Array(7).fill(0);
      const weekdayCompleted = Array(7).fill(0);

      assignments.forEach((a) => {
        if (a.createdAt) weekdayCreated[new Date(a.createdAt).getDay()]++;
        if (a.completedAt) weekdayCompleted[new Date(a.completedAt).getDay()]++;
      });

      const weeklyActivity = dayLabels.map((day, i) => ({
        day,
        created: weekdayCreated[i],
        completed: weekdayCompleted[i],
      }));

      // H. [NEW] On-time vs Late Summary (overall + per employee jika admin)
      const overallOnTimeLate = {
        onTime: 0,
        late: 0,
        pending:
          statusCounts.PENDING +
          statusCounts.PENDING_STATUS +
          statusCounts.IN_PROGRESS,
      };

      assignments.forEach((a) => {
        if (!isCompleted(a)) return;
        if (isLate(a)) overallOnTimeLate.late++;
        else overallOnTimeLate.onTime++;
      });

      let onTimeLatePerEmployee: {
        name: string;
        onTime: number;
        late: number;
        total: number;
        onTimeRate: number;
      }[] = [];

      if (isAdmin) {
        const empPerfMap = new Map<
          string,
          { onTime: number; late: number; total: number }
        >();
        assignments.forEach((a) => {
          if (!isCompleted(a)) return;
          const empName = a.assignedTo.username;
          if (!empPerfMap.has(empName))
            empPerfMap.set(empName, { onTime: 0, late: 0, total: 0 });
          const entry = empPerfMap.get(empName)!;
          entry.total++;
          if (isLate(a)) entry.late++;
          else entry.onTime++;
        });

        onTimeLatePerEmployee = Array.from(empPerfMap.entries()).map(
          ([name, data]) => ({
            name,
            ...data,
            onTimeRate:
              data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 0,
          }),
        );
      }

      // I. [NEW] Workload Heatmap — task aktif per employee per bulan (Admin only)
      let workloadHeatmap: {
        employee: string;
        month: string;
        count: number;
      }[] = [];

      if (isAdmin) {
        const heatMap = new Map<string, Map<string, number>>();

        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const label = `${months[d.getMonth()]} ${d.getFullYear()}`;

          assignments.forEach((a) => {
            if (!a.createdAt || !a.endDatetime) return;
            const empName = a.assignedTo.username;
            if (!heatMap.has(empName)) heatMap.set(empName, new Map());

            const createdDate = new Date(a.createdAt);
            const endDate = new Date(a.endDatetime);
            const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
            const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            // Task dianggap aktif di bulan ini jika range-nya overlap
            if (createdDate <= monthEnd && endDate >= monthStart) {
              const empMap = heatMap.get(empName)!;
              empMap.set(label, (empMap.get(label) || 0) + 1);
            }
          });
        }

        heatMap.forEach((monthMap, employee) => {
          monthMap.forEach((count, month) => {
            workloadHeatmap.push({ employee, month, count });
          });
        });
      }

      // J. [NEW] Activities Per Employee (Admin only)
      let activitiesPerEmployee: {
        id: string;
        username: string;
        count: number;
        activities: any[];
      }[] = [];
      if (isAdmin) {
        const activitiesWhereCondition: any = {};
        if (andConditions.length > 0) {
          activitiesWhereCondition.AND = andConditions;
        }

        const employees = await prisma.authUser.findMany({
          where: {
            authUserToGroup: {
              some: {
                group: {
                  name: {
                    in: ["Pegawai"],
                  },
                },
              },
            },
          },
          orderBy: {
            username: "asc",
          },
          select: {
            id: true,
            username: true,
            activities: {
              where: activitiesWhereCondition,
              include: {
                project: { select: { id: true, name: true, code: true } },
                assignedBy: { select: { id: true, username: true } },
              },
              orderBy: { startDatetime: "desc" },
            },
          },
        });

        activitiesPerEmployee = employees
          .map((emp) => ({
            id: emp.id,
            username: emp.username,
            count: emp.activities.length,
            activities: emp.activities,
          }))
          .sort((a, b) => a.username.localeCompare(b.username));
      }

      return successResponse(res, "Data analitik berhasil diambil", {
        isAdmin,
        // existing
        statusCounts,
        tasksPerProject,
        tasksPerEmployee,
        trendData,
        // new
        completionRatePerProject,
        avgCompletionTimePerProject,
        weeklyActivity,
        overallOnTimeLate,
        onTimeLatePerEmployee,
        workloadHeatmap,
        activitiesPerEmployee,
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data analitik", 500, error);
    }
  },

  getProjectExecution: async (req: Request, res: Response) => {
    try {
      const [
        totalContracted,
        totalPotentialOrUncontracted,
        totalActiveEmployees,
        projects,
      ] = await Promise.all([
        prisma.project.count({
          where: { contractStatus: "CONTRACTED" },
        }),
        prisma.project.count({
          where: {
            OR: [
              { contractStatus: "POTENTIAL" },
              { contractStatus: "NOT_CONTRACTED" },
            ],
          },
        }),
        prisma.authUser.count({
          where: {
            banned: false,
            authUserToGroup: {
              some: {
                group: {
                  name: {
                    in: ["Pegawai", "Admin", "Superadmin"],
                  },
                },
              },
            },
          },
        }),
        prisma.project.findMany({
          where: {
            contractStatus: "CONTRACTED",
          },
          orderBy: {
            code: "asc",
          },
          select: {
            id: true,
            code: true,
            name: true,
            contractValue: true,
            contractStart: true,
            contractEnd: true,
            status: true,
            assignments: {
              select: {
                id: true,
                title: true,
                status: true,
                startDatetime: true,
                endDatetime: true,
                assignedTo: {
                  select: {
                    username: true,
                  },
                },
              },
              orderBy: {
                startDatetime: "asc",
              },
            },
          },
        }),
      ]);

      return successResponse(res, "Data pelaksanaan pekerjaan berhasil diambil", {
        totalContracted,
        totalPotentialOrUncontracted,
        totalActiveEmployees,
        projects,
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data pelaksanaan pekerjaan",
        500,
        error
      );
    }
  },
};

export default DashboardController;
