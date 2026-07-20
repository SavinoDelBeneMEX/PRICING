-- Agrega un rol 'admin' con acceso a los 4 paneles (vendedor, pricing, legal, finanzas)
-- y a la auditoría, para cuentas de soporte/QA que necesitan ver todo el ciclo.

alter type app_role add value 'admin';

-- Da al rol 'admin' el mismo acceso de lectura/escritura que pricing/legal/finanzas
-- en las políticas que antes solo listaban esos tres roles.

drop policy "solicitudes select" on solicitudes;
create policy "solicitudes select" on solicitudes
  for select using (
    vendedor_id = auth.uid() or current_role_name() in ('pricing', 'legal', 'finanzas', 'admin')
  );

drop policy "solicitud_servicios select" on solicitud_servicios;
create policy "solicitud_servicios select" on solicitud_servicios
  for select using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id
        and (s.vendedor_id = auth.uid() or current_role_name() in ('pricing', 'legal', 'finanzas', 'admin'))
    )
  );

drop policy "solicitud_servicios update vendedor" on solicitud_servicios;
create policy "solicitud_servicios update vendedor" on solicitud_servicios
  for update using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id and s.vendedor_id = auth.uid()
    )
    or current_role_name() in ('pricing', 'admin')
  );

drop policy "cotizaciones_pricing select" on cotizaciones_pricing;
create policy "cotizaciones_pricing select" on cotizaciones_pricing
  for select using (
    current_role_name() in ('pricing', 'admin')
    or exists (
      select 1 from solicitud_servicios ss join solicitudes s on s.id = ss.solicitud_id
      where ss.id = cotizaciones_pricing.solicitud_servicio_id and s.vendedor_id = auth.uid()
    )
  );

drop policy "cotizaciones_pricing insert" on cotizaciones_pricing;
create policy "cotizaciones_pricing insert" on cotizaciones_pricing
  for insert with check (current_role_name() in ('pricing', 'admin') and pricing_user_id = auth.uid());

drop policy "cotizaciones_vendedor select" on cotizaciones_vendedor;
create policy "cotizaciones_vendedor select" on cotizaciones_vendedor
  for select using (
    vendedor_id = auth.uid() or current_role_name() in ('pricing', 'admin')
  );

drop policy "confirmaciones select" on confirmaciones;
create policy "confirmaciones select" on confirmaciones
  for select using (vendedor_id = auth.uid() or current_role_name() in ('pricing', 'admin'));

drop policy "proveedores select interno" on proveedores;
create policy "proveedores select interno" on proveedores
  for select using (current_role_name() in ('pricing', 'legal', 'finanzas', 'admin'));

drop policy "proveedores insert pricing" on proveedores;
create policy "proveedores insert pricing" on proveedores
  for insert with check (current_role_name() in ('pricing', 'admin') and invited_by = auth.uid());

drop policy "proveedores update interno" on proveedores;
create policy "proveedores update interno" on proveedores
  for update using (current_role_name() in ('pricing', 'legal', 'finanzas', 'admin'));

drop policy "documentos_proveedor select interno" on documentos_proveedor;
create policy "documentos_proveedor select interno" on documentos_proveedor
  for select using (current_role_name() in ('pricing', 'legal', 'finanzas', 'admin'));

drop policy "documentos_proveedor update legal" on documentos_proveedor;
create policy "documentos_proveedor update legal" on documentos_proveedor
  for update using (current_role_name() in ('legal', 'admin'));

drop policy "auditoria select interno" on auditoria;
create policy "auditoria select interno" on auditoria
  for select using (current_role_name() in ('vendedor', 'pricing', 'legal', 'finanzas', 'admin'));

drop policy "cotizaciones_pricing storage read" on storage.objects;
create policy "cotizaciones_pricing storage read" on storage.objects
  for select using (bucket_id = 'cotizaciones-pricing' and current_role_name() in ('pricing', 'vendedor', 'admin'));

drop policy "cotizaciones_pricing storage write" on storage.objects;
create policy "cotizaciones_pricing storage write" on storage.objects
  for insert with check (bucket_id = 'cotizaciones-pricing' and current_role_name() in ('pricing', 'admin'));

drop policy "evidencia_cliente storage read" on storage.objects;
create policy "evidencia_cliente storage read" on storage.objects
  for select using (bucket_id = 'evidencia-cliente' and current_role_name() in ('pricing', 'vendedor', 'admin'));

drop policy "evidencia_cliente storage write" on storage.objects;
create policy "evidencia_cliente storage write" on storage.objects
  for insert with check (bucket_id = 'evidencia-cliente' and current_role_name() in ('vendedor', 'admin'));

drop policy "documentos_proveedor storage read interno" on storage.objects;
create policy "documentos_proveedor storage read interno" on storage.objects
  for select using (bucket_id = 'documentos-proveedor' and current_role_name() in ('pricing', 'legal', 'finanzas', 'admin'));
