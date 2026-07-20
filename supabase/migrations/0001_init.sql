-- Portal de Pricing SBM — esquema inicial
-- Roles internos: vendedor, pricing, legal, finanzas. Proveedores tienen su propia cuenta
-- (auth.users) pero no tienen fila en `profiles` — se identifican por la tabla `proveedores`.

-- ============================================================================
-- ENUMS
-- ============================================================================

create type app_role as enum ('vendedor', 'pricing', 'legal', 'finanzas');

create type tipo_servicio as enum ('maritimo', 'aereo', 'terrestre', 'aduanal', 'seguros');

create type solicitud_servicio_status as enum (
  'borrador',
  'enviado_a_pricing',
  'cotizado_por_pricing',
  'cotizado_por_vendedor',
  'enviado_a_cliente',
  'aceptado_por_cliente',
  'confirmado_a_pricing',
  'proveedor_invitado',
  'documentos_en_proceso',
  'en_revision_legal',
  'comentarios_legal',
  'aprobado_legal',
  'alta_finanzas',
  'completado'
);

create type tipo_proveedor as enum (
  'agente_aduanal',
  'transportista_terrestre',
  'operador_logistico_almacen',
  'naviera_aerolinea_otro'
);

create type proveedor_status as enum (
  'invitado',
  'registrado',
  'documentos_en_proceso',
  'en_revision_legal',
  'comentarios_legal',
  'aprobado_legal',
  'alta_finanzas',
  'completado'
);

create type documento_estatus as enum ('pendiente', 'subido', 'aprobado', 'rechazado');

create type categoria_documento as enum (
  'legal_corporativo',
  'operativo_regulatorio',
  'seguros',
  'comercial_bancario'
);

-- ============================================================================
-- PROFILES (usuarios internos)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SOLICITUDES
-- ============================================================================

create sequence folio_seq start 1;

create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('PRC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('folio_seq')::text, 4, '0')),
  vendedor_id uuid not null references profiles(id),
  cliente_nombre text not null,
  cliente_rfc text,
  descripcion_general text,
  created_at timestamptz not null default now()
);

create index solicitudes_vendedor_idx on solicitudes(vendedor_id);

create table solicitud_servicios (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references solicitudes(id) on delete cascade,
  tipo_servicio tipo_servicio not null,
  detalle_servicio text not null,
  status solicitud_servicio_status not null default 'enviado_a_pricing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index solicitud_servicios_solicitud_idx on solicitud_servicios(solicitud_id);
create index solicitud_servicios_status_idx on solicitud_servicios(status);

-- ============================================================================
-- COTIZACIONES
-- ============================================================================

create table cotizaciones_pricing (
  id uuid primary key default gen_random_uuid(),
  solicitud_servicio_id uuid not null references solicitud_servicios(id) on delete cascade,
  pricing_user_id uuid not null references profiles(id),
  archivo_url text not null,
  monto numeric(14, 2) not null,
  moneda text not null default 'MXN',
  vigencia_hasta date,
  notas text,
  created_at timestamptz not null default now()
);

create index cotizaciones_pricing_servicio_idx on cotizaciones_pricing(solicitud_servicio_id);

create table cotizaciones_vendedor (
  id uuid primary key default gen_random_uuid(),
  solicitud_servicio_id uuid not null references solicitud_servicios(id) on delete cascade,
  vendedor_id uuid not null references profiles(id),
  costo_pricing numeric(14, 2) not null,
  markup_pct numeric(6, 2) not null,
  precio_cliente numeric(14, 2) not null,
  moneda text not null default 'MXN',
  alerta_markup_bajo boolean not null default false,
  evidencia_aceptacion_url text,
  created_at timestamptz not null default now()
);

create index cotizaciones_vendedor_servicio_idx on cotizaciones_vendedor(solicitud_servicio_id);

create table confirmaciones (
  id uuid primary key default gen_random_uuid(),
  solicitud_servicio_id uuid not null references solicitud_servicios(id) on delete cascade,
  vendedor_id uuid not null references profiles(id),
  confirmado_at timestamptz not null default now(),
  notas text
);

create index confirmaciones_servicio_idx on confirmaciones(solicitud_servicio_id);

-- ============================================================================
-- PROVEEDORES
-- ============================================================================

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  solicitud_servicio_id uuid not null references solicitud_servicios(id) on delete cascade,
  razon_social text,
  contacto_nombre text,
  tipo_proveedor tipo_proveedor not null,
  email_invitacion text not null,
  invite_token uuid not null default gen_random_uuid(),
  invited_by uuid not null references profiles(id),
  invited_at timestamptz not null default now(),
  registered_at timestamptz,
  status proveedor_status not null default 'invitado',
  created_at timestamptz not null default now()
);

create unique index proveedores_servicio_unique on proveedores(solicitud_servicio_id);
create index proveedores_user_idx on proveedores(user_id);
create index proveedores_invite_token_idx on proveedores(invite_token);

-- ============================================================================
-- CHECKLIST DE DOCUMENTOS (catálogo configurable)
-- ============================================================================

create table documentos_checklist (
  id uuid primary key default gen_random_uuid(),
  tipo_proveedor tipo_proveedor, -- null = aplica a todos los tipos
  nombre_documento text not null,
  categoria categoria_documento not null,
  obligatorio boolean not null default true,
  orden int not null default 0
);

create table documentos_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  checklist_item_id uuid not null references documentos_checklist(id),
  archivo_url text,
  estatus documento_estatus not null default 'pendiente',
  comentario_legal text,
  revisado_por uuid references profiles(id),
  revisado_at timestamptz,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create unique index documentos_proveedor_unique on documentos_proveedor(proveedor_id, checklist_item_id);

-- ============================================================================
-- AUDITORÍA
-- ============================================================================

create table auditoria (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,
  entidad_id uuid not null,
  usuario_id uuid references profiles(id),
  actor_label text, -- para acciones de proveedor o del sistema, sin fila en profiles
  accion text not null,
  detalle jsonb,
  created_at timestamptz not null default now()
);

create index auditoria_entidad_idx on auditoria(entidad_tipo, entidad_id);
create index auditoria_created_idx on auditoria(created_at desc);

-- ============================================================================
-- SEED: checklist de documentos
-- ============================================================================

insert into documentos_checklist (tipo_proveedor, nombre_documento, categoria, obligatorio, orden) values
-- Legal y corporativo (todos)
(null, 'Acta constitutiva y, en su caso, reformas estatutarias relevantes, inscritas en el Registro Público de Comercio', 'legal_corporativo', true, 10),
(null, 'Poder notarial vigente del representante legal que suscribirá el contrato, con facultades suficientes', 'legal_corporativo', true, 20),
(null, 'Identificación oficial vigente del representante legal (INE, pasaporte o FM equivalente)', 'legal_corporativo', true, 30),
(null, 'Comprobante de domicilio fiscal con antigüedad no mayor a tres meses', 'legal_corporativo', true, 40),
(null, 'Constancia de Situación Fiscal actualizada emitida por el SAT', 'legal_corporativo', true, 50),
(null, 'Cédula de Identificación Fiscal (RFC)', 'legal_corporativo', true, 60),
(null, 'Opinión de cumplimiento de obligaciones fiscales positiva (artículo 32-D del CFF), vigente', 'legal_corporativo', true, 70),
(null, 'Opinión de cumplimiento en materia de seguridad social (IMSS), vigente', 'legal_corporativo', true, 80),
(null, 'Opinión de cumplimiento en materia de aportaciones patronales (INFONAVIT), vigente', 'legal_corporativo', true, 90),
(null, 'Constancia de Registro en el Registro de Prestadores de Servicios Especializados (REPSE), cuando aplique', 'legal_corporativo', false, 100),

-- Operativo y regulatorio (específico por tipo)
('agente_aduanal', 'Patente de agente aduanal y autorización vigente emitida por la Agencia Nacional de Aduanas de México (ANAM)', 'operativo_regulatorio', true, 110),
('transportista_terrestre', 'Permiso SCT/SICT vigente para autotransporte federal de carga, carga especializada, materiales y residuos peligrosos, según corresponda', 'operativo_regulatorio', true, 120),
('transportista_terrestre', 'Relación de vehículos que se usarán para la prestación del servicio terrestre, que concuerde con el permiso de la SICT', 'operativo_regulatorio', true, 130),
('transportista_terrestre', 'Tarjetas de circulación y alta vehicular del parque destinado a la operación de SBM, cuando aplique', 'operativo_regulatorio', false, 140),
('transportista_terrestre', 'Licencias federales de los operadores, cuando aplique', 'operativo_regulatorio', false, 150),
('operador_logistico_almacen', 'Autorización de recinto fiscalizado o depósito fiscal emitida por la autoridad aduanera', 'operativo_regulatorio', true, 160),

-- Seguros
(null, 'Póliza vigente de Responsabilidad Civil General del proveedor, con cobertura y suma asegurada congruente con el giro y la exposición', 'seguros', true, 170),
('transportista_terrestre', 'Póliza vigente de Responsabilidad Civil del Transportista (Carta de Porte), con cobertura por robo total, daños y responsabilidad civil a terceros', 'seguros', true, 180),
('operador_logistico_almacen', 'Póliza vigente de Responsabilidad Civil del Operador Logístico o de Almacén Depositario', 'seguros', true, 190),
(null, 'Carátula y recibo de pago que acrediten la vigencia de cada póliza, actualizados anualmente', 'seguros', true, 200),

-- Comercial y bancario
(null, 'Carátula bancaria o estado de cuenta que acredite la titularidad de la cuenta para pagos', 'comercial_bancario', true, 210);

-- ============================================================================
-- RLS
-- ============================================================================

alter table profiles enable row level security;
alter table solicitudes enable row level security;
alter table solicitud_servicios enable row level security;
alter table cotizaciones_pricing enable row level security;
alter table cotizaciones_vendedor enable row level security;
alter table confirmaciones enable row level security;
alter table proveedores enable row level security;
alter table documentos_checklist enable row level security;
alter table documentos_proveedor enable row level security;
alter table auditoria enable row level security;

-- helper: rol del usuario autenticado actual
create or replace function current_role_name()
returns app_role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- profiles: cada quien ve su propio perfil; roles internos ven todos (para mostrar nombres)
create policy "profiles select" on profiles
  for select using (auth.uid() = id or current_role_name() is not null);

create policy "profiles update own" on profiles
  for update using (auth.uid() = id);

-- solicitudes: el vendedor ve/crea las suyas; pricing/legal/finanzas ven todas (necesitan contexto del ciclo)
create policy "solicitudes select" on solicitudes
  for select using (
    vendedor_id = auth.uid() or current_role_name() in ('pricing', 'legal', 'finanzas')
  );

create policy "solicitudes insert" on solicitudes
  for insert with check (vendedor_id = auth.uid() and current_role_name() = 'vendedor');

-- solicitud_servicios: mismo criterio que la solicitud padre
create policy "solicitud_servicios select" on solicitud_servicios
  for select using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id
        and (s.vendedor_id = auth.uid() or current_role_name() in ('pricing', 'legal', 'finanzas'))
    )
  );

create policy "solicitud_servicios insert" on solicitud_servicios
  for insert with check (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id and s.vendedor_id = auth.uid()
    )
  );

create policy "solicitud_servicios update vendedor" on solicitud_servicios
  for update using (
    exists (
      select 1 from solicitudes s
      where s.id = solicitud_servicios.solicitud_id and s.vendedor_id = auth.uid()
    )
    or current_role_name() = 'pricing'
  );

-- cotizaciones_pricing: pricing sube; vendedor y pricing pueden leer
create policy "cotizaciones_pricing select" on cotizaciones_pricing
  for select using (
    current_role_name() = 'pricing'
    or exists (
      select 1 from solicitud_servicios ss join solicitudes s on s.id = ss.solicitud_id
      where ss.id = cotizaciones_pricing.solicitud_servicio_id and s.vendedor_id = auth.uid()
    )
  );

create policy "cotizaciones_pricing insert" on cotizaciones_pricing
  for insert with check (current_role_name() = 'pricing' and pricing_user_id = auth.uid());

-- cotizaciones_vendedor: vendedor sube/lee las suyas; pricing lee
create policy "cotizaciones_vendedor select" on cotizaciones_vendedor
  for select using (
    vendedor_id = auth.uid() or current_role_name() = 'pricing'
  );

create policy "cotizaciones_vendedor insert" on cotizaciones_vendedor
  for insert with check (vendedor_id = auth.uid() and current_role_name() = 'vendedor');

-- confirmaciones: vendedor crea; pricing lee
create policy "confirmaciones select" on confirmaciones
  for select using (vendedor_id = auth.uid() or current_role_name() = 'pricing');

create policy "confirmaciones insert" on confirmaciones
  for insert with check (vendedor_id = auth.uid() and current_role_name() = 'vendedor');

-- proveedores: pricing/legal/finanzas ven todos; el propio proveedor ve su fila
create policy "proveedores select interno" on proveedores
  for select using (current_role_name() in ('pricing', 'legal', 'finanzas'));

create policy "proveedores select propio" on proveedores
  for select using (user_id = auth.uid());

create policy "proveedores insert pricing" on proveedores
  for insert with check (current_role_name() = 'pricing' and invited_by = auth.uid());

create policy "proveedores update interno" on proveedores
  for update using (current_role_name() in ('pricing', 'legal', 'finanzas'));

create policy "proveedores update propio" on proveedores
  for update using (user_id = auth.uid());

-- documentos_checklist: catálogo visible para todos los autenticados (interno + proveedor)
create policy "documentos_checklist select" on documentos_checklist
  for select using (true);

-- documentos_proveedor: proveedor gestiona los suyos; legal/pricing/finanzas ven todos
create policy "documentos_proveedor select interno" on documentos_proveedor
  for select using (current_role_name() in ('pricing', 'legal', 'finanzas'));

create policy "documentos_proveedor select propio" on documentos_proveedor
  for select using (
    exists (select 1 from proveedores p where p.id = documentos_proveedor.proveedor_id and p.user_id = auth.uid())
  );

create policy "documentos_proveedor upsert propio" on documentos_proveedor
  for insert with check (
    exists (select 1 from proveedores p where p.id = documentos_proveedor.proveedor_id and p.user_id = auth.uid())
  );

create policy "documentos_proveedor update propio" on documentos_proveedor
  for update using (
    exists (select 1 from proveedores p where p.id = documentos_proveedor.proveedor_id and p.user_id = auth.uid())
  );

create policy "documentos_proveedor update legal" on documentos_proveedor
  for update using (current_role_name() = 'legal');

-- auditoria: lectura para todos los roles internos; escritura vía service role (server actions)
create policy "auditoria select interno" on auditoria
  for select using (current_role_name() in ('vendedor', 'pricing', 'legal', 'finanzas'));

-- ============================================================================
-- STORAGE
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('cotizaciones-pricing', 'cotizaciones-pricing', false),
  ('evidencia-cliente', 'evidencia-cliente', false),
  ('documentos-proveedor', 'documentos-proveedor', false)
on conflict (id) do nothing;

create policy "cotizaciones_pricing storage read" on storage.objects
  for select using (bucket_id = 'cotizaciones-pricing' and current_role_name() in ('pricing', 'vendedor'));

create policy "cotizaciones_pricing storage write" on storage.objects
  for insert with check (bucket_id = 'cotizaciones-pricing' and current_role_name() = 'pricing');

create policy "evidencia_cliente storage read" on storage.objects
  for select using (bucket_id = 'evidencia-cliente' and current_role_name() in ('pricing', 'vendedor'));

create policy "evidencia_cliente storage write" on storage.objects
  for insert with check (bucket_id = 'evidencia-cliente' and current_role_name() = 'vendedor');

-- documentos-proveedor: carpeta raíz = proveedor_id; proveedor solo escribe/lee su carpeta, interno lee todo
create policy "documentos_proveedor storage read interno" on storage.objects
  for select using (bucket_id = 'documentos-proveedor' and current_role_name() in ('pricing', 'legal', 'finanzas'));

create policy "documentos_proveedor storage read propio" on storage.objects
  for select using (
    bucket_id = 'documentos-proveedor'
    and exists (
      select 1 from proveedores p
      where p.user_id = auth.uid() and (storage.foldername(name))[1] = p.id::text
    )
  );

create policy "documentos_proveedor storage write propio" on storage.objects
  for insert with check (
    bucket_id = 'documentos-proveedor'
    and exists (
      select 1 from proveedores p
      where p.user_id = auth.uid() and (storage.foldername(name))[1] = p.id::text
    )
  );
