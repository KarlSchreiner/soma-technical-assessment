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
