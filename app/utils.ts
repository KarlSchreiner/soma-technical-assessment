import { TodoDto } from "./shared/todoDto";

//todo extend to remove work days and holidays
export function addWorkDays(
  start: Date,
  workDays: number,
  holidays: Set<string>
): Date {
  const result = new Date(start);
  let added = 0;
  while (added < workDays) {
    result.setDate(result.getDate() + 1);
    const isWeekend = false; //result.getDay() === 0 || result.getDay() === 6;
    const isHoliday = false; // holidays.has(result.toISOString().split("T")[0]);
    if (!isWeekend && !isHoliday) added++;
  }
  return result;
}

export function computeEarliestDates(
  todos: TodoDto[],
  holidays: Set<string>
): Map<number, { earliestStart: Date; earliestFinish: Date }> {
  const idToTodo = new Map<number, TodoDto>();
  const result = new Map<
    number,
    { earliestStart: Date; earliestFinish: Date }
  >();

  todos.forEach((t) => idToTodo.set(t.id, t));

  function dfs(todo: TodoDto): { earliestStart: Date; earliestFinish: Date } {
    if (result.has(todo.id)) return result.get(todo.id)!;
    const now = new Date(); // current local time
    const localYear = now.getFullYear();
    const localMonth = now.getMonth(); // 0-based
    const localDate = now.getDate();

    // Construct a new Date using local Y/M/D, then set UTC midnight
    let earliestStart = new Date(
      Date.UTC(localYear, localMonth, localDate, 0, 0, 0, 0)
    );

    earliestStart.setUTCHours(0, 0, 0, 0);
    if (todo.dependencies?.length) {
      let maxFinish = new Date(0);
      for (const dep of todo.dependencies) {
        const depTodo = idToTodo.get(dep.id);
        if (depTodo) {
          const finish = dfs(depTodo).earliestFinish;
          if (finish > maxFinish) maxFinish = finish;
        }
      }
      earliestStart = maxFinish;
    }

    const units = todo.workUnits ?? 1;
    const earliestFinish = addWorkDays(earliestStart, units, holidays);
    result.set(todo.id, { earliestStart, earliestFinish });
    return { earliestStart, earliestFinish };
  }

  for (const todo of todos) {
    dfs(todo);
  }

  return result;
}

export function formatAsLocalDateString(isoDate: string): string {
  const [year, month, day] = isoDate.split("T")[0].split("-").map(Number);
  const localDate = new Date(year, month - 1, day); // Construct in local time
  return localDate.toDateString(); // Example: "Thu Jul 17 2025"
}

export function computeLatestDates(
  todos: TodoDto[],
  earliestDates: Map<number, { earliestStart: Date; earliestFinish: Date }>
): Map<number, { latestStart: Date; latestFinish: Date }> {
  const latestDates = new Map<
    number,
    { latestStart: Date; latestFinish: Date }
  >();
  const projectEnd = new Date(
    Math.max(
      ...Array.from(earliestDates.values()).map((v) =>
        v.earliestFinish.getTime()
      )
    )
  );

  const idToTodo = new Map<number, TodoDto>(todos.map((t) => [t.id, t]));
  const visited = new Set<number>();

  const visit = (todo: TodoDto) => {
    if (visited.has(todo.id)) return;
    visited.add(todo.id);

    let latestFinish = new Date(projectEnd);
    if (todo.dependents?.length) {
      latestFinish = new Date(
        Math.min(
          ...todo.dependents.map(
            (d) =>
              latestDates.get(d.id)?.latestStart?.getTime() ??
              projectEnd.getTime()
          )
        )
      );
    }

    const earliest = earliestDates.get(todo.id);
    const duration =
      (earliest?.earliestFinish.getTime() ?? 0) -
      (earliest?.earliestStart.getTime() ?? 0);
    const latestStart = new Date(latestFinish.getTime() - duration);

    latestDates.set(todo.id, { latestStart, latestFinish });

    todo.dependencies?.forEach((dep) => {
      const depTodo = idToTodo.get(dep.id);
      if (depTodo) visit(depTodo);
    });
  };

  todos.filter((t) => !t.dependents?.length).forEach(visit);
  return latestDates;
}
