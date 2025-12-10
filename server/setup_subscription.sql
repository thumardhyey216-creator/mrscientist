-- Create a table for public profiles (accessible by users)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  phone text,
  subscription_status text default 'inactive', -- 'active', 'inactive', 'past_due'
  subscription_plan text default 'none', -- 'monthly_500'
  subscription_expiry timestamptz,
  razorpay_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for payment history
create table public.payments (
    id uuid not null default uuid_generate_v4(),
    user_id uuid references auth.users not null,
    amount integer not null, -- in paise (50000 = 500 Rs)
    currency text default 'INR',
    razorpay_order_id text,
    razorpay_payment_id text,
    status text, -- 'created', 'paid', 'failed'
    created_at timestamptz default now(),
    primary key (id)
);

alter table public.payments enable row level security;

-- Policies for payments
create policy "Users can view own payments"
  on payments for select
  using ( auth.uid() = user_id );

-- Note: No insert policy for users. Payments must be inserted by the backend (Service Role).

-- Backfill profiles for existing users
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
