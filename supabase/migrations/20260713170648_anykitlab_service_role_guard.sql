create or replace function public.akl_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
    and not public.akl_is_owner()
  then
    raise exception 'Only an AnyKit Lab owner can change staff roles.';
  end if;
  return new;
end;
$$;

update public.akl_collections set status = 'Published' where id = 'col-launch';
