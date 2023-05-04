export interface ActiveTimer {
  label?: string;
  in: Date;
}

export interface Log extends ActiveTimer {
  out: Date;
  rate?: number;
}
