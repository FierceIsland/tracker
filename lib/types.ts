export type Bucket = { key: string; label: string; billable: boolean; sort: number };

export type Client = {
  id: string;
  name: string;
  trade: string | null;
  status: string;
  package: string | null;
  monthly_price: number | null;
  hosting_price: number | null;
  started_on: string | null;
  notes: string | null;
};

export type Project = {
  id: string;
  client_id: string | null;
  name: string;
  kind: string;
  price: number | null;
  budget_hours: number | null;
  status: string;
  started_on: string | null;
  due_on: string | null;
};

export type TimeEntry = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  bucket_key: string;
  entry_date: string;
  hours: number;
  notes: string | null;
};

export type Invoice = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  number: string | null;
  description: string | null;
  amount: number;
  issued_on: string;
  due_on: string | null;
  paid_on: string | null;
};

export type Expense = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  vendor: string;
  category: string;
  kind: string;
  amount: number;
  incurred_on: string;
  notes: string | null;
};

export type RecurringCost = {
  id: string;
  name: string;
  vendor: string | null;
  amount: number;
  cadence: "monthly" | "annual";
  allocation: string;
  active: boolean;
  started_on: string | null; // first month charged
  ended_on: string | null; // last month charged; null means still running
  created_at: string;
};
