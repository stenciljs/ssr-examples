export interface Task {
  title: string;
  done?: boolean;
}
export interface Stat {
  label: string;
  value: number;
}
export declare const tasks: Task[];
export declare const stats: Stat[];
/** What `#add-stat` appends. */
export declare const extraStat: Stat;
