-- Corrige dos huecos de RLS encontrados al probar el flujo end-to-end:
--
-- 1) cotizaciones_vendedor no tenía política de UPDATE. subirEvidenciaAceptacion
--    actualiza evidencia_aceptacion_url ahí, y sin política el update se
--    bloqueaba silenciosamente (0 filas afectadas, sin error) — el botón
--    "Confirmar a Pricing" nunca aparecía aunque el archivo sí se subiera.
--
-- 2) "solicitud_servicios update vendedor" solo permitía al vendedor dueño o a
--    pricing/admin. Eso bloqueaba:
--      - a Finanzas marcando el alta completada,
--      - al propio proveedor enviando su expediente a revisión legal
--        (los proveedores no tienen fila en profiles, current_role_name() da null).

create policy "cotizaciones_vendedor update" on cotizaciones_vendedor
  for update using (vendedor_id = auth.uid() and current_role_name() in ('vendedor', 'admin'));

drop policy "solicitud_servicios update vendedor" on solicitud_servicios;
create policy "solicitud_servicios update" on solicitud_servicios
  for update using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id and s.vendedor_id = auth.uid()
    )
    or current_role_name() in ('pricing', 'legal', 'finanzas', 'admin')
    or exists (
      select 1 from proveedores p
      where p.solicitud_servicio_id = solicitud_servicios.id and p.user_id = auth.uid()
    )
  );
