-- Permite que 'admin' también realice las acciones de escritura propias de cada
-- rol (crear solicitud, cotizar al cliente, confirmar), no solo verlas.
-- La migración anterior (0002) solo le dio acceso de lectura/gestión a nivel
-- pricing/legal/finanzas; faltaban los inserts que exigían el rol 'vendedor' exacto.

drop policy "solicitudes insert" on solicitudes;
create policy "solicitudes insert" on solicitudes
  for insert with check (vendedor_id = auth.uid() and current_role_name() in ('vendedor', 'admin'));

drop policy "cotizaciones_vendedor insert" on cotizaciones_vendedor;
create policy "cotizaciones_vendedor insert" on cotizaciones_vendedor
  for insert with check (vendedor_id = auth.uid() and current_role_name() in ('vendedor', 'admin'));

drop policy "confirmaciones insert" on confirmaciones;
create policy "confirmaciones insert" on confirmaciones
  for insert with check (vendedor_id = auth.uid() and current_role_name() in ('vendedor', 'admin'));
