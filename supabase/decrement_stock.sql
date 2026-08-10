-- Atomic stock decrement.
--
-- Replaces a read-then-write in the payment handlers: two orders landing at the
-- same moment both read the old stock and both wrote back the same value, so one
-- decrement was silently lost. A single UPDATE ... SET stock = stock - qty takes
-- a row lock and serialises them.
--
-- Stock is floored at zero rather than raising, because the caller runs after the
-- money is already captured — refusing here would leave a paid order unrecorded.
-- Availability is enforced before charging, in the checkout routes.

create or replace function public.decrement_stock(
  p_product_id uuid,
  p_quantity   integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stock integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'decrement_stock: quantity must be positive, got %', p_quantity;
  end if;

  update products
     set stock = greatest(0, coalesce(stock, 0) - p_quantity)
   where id = p_product_id
  returning stock into new_stock;

  if not found then
    raise warning 'decrement_stock: no product with id %', p_product_id;
    return null;
  end if;

  return new_stock;
end;
$$;

revoke all on function public.decrement_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_stock(uuid, integer) to service_role;
